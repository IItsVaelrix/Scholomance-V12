import crypto from 'crypto';
import { collabPersistence } from './collab.persistence.js';
import { cleanAgentSession, runAgentQaScan } from './collab.agent-qa.js';
import {
    PIPELINE_DEFINITIONS,
    getRoleForPath,
    validateFileOwnership,
} from './collab.pipelines.js';
import {
    parseErrorForAI,
    ERROR_CATEGORIES,
    ERROR_SEVERITY,
    MODULE_IDS,
    ERROR_CODES,
} from '../../core/pixelbrain/bytecode-error.js';

function uuid() {
    return crypto.randomUUID();
}

export class CollabServiceError extends Error {
    constructor(code, message, options = {}) {
        super(message);
        this.name = 'CollabServiceError';
        this.code = code;
        this.statusCode = options.statusCode ?? 500;
        this.details = options.details ?? {};
    }
}

function createError(code, message, statusCode, details = {}) {
    return new CollabServiceError(code, message, { statusCode, details });
}

const DISCONNECTED_AGENT_RETENTION_MS = 30 * 60 * 1000;

function parseAgentLastSeen(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const normalized = raw.includes('T') ? raw : `${raw.replace(' ', 'T')}Z`;
    const parsed = Date.parse(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function shouldRetainAgentInPresence(agent, nowMs = Date.now()) {
    const status = String(agent?.status || 'offline').toLowerCase();
    if (status !== 'offline') {
        return true;
    }

    const lastSeenMs = parseAgentLastSeen(agent?.last_seen);
    const hasCurrentTask = typeof agent?.current_task_id === 'string' && agent.current_task_id.trim().length > 0;

    if (hasCurrentTask) {
        return true;
    }

    if (!lastSeenMs) {
        return false;
    }

    return (nowMs - lastSeenMs) <= DISCONNECTED_AGENT_RETENTION_MS;
}

async function getAgentOrThrow(agentId) {
    const agent = await collabPersistence.agents.getById(agentId);
    if (!agent) {
        throw createError('AGENT_NOT_FOUND', 'Agent not found', 404, { agent_id: agentId });
    }
    return agent;
}

async function getTaskOrThrow(taskId) {
    const task = await collabPersistence.tasks.getById(taskId);
    if (!task) {
        throw createError('TASK_NOT_FOUND', 'Task not found', 404, { task_id: taskId });
    }
    return task;
}

async function getPipelineOrThrow(pipelineId) {
    const pipeline = await collabPersistence.pipelines.getById(pipelineId);
    if (!pipeline) {
        throw createError('PIPELINE_NOT_FOUND', 'Pipeline not found', 404, { pipeline_id: pipelineId });
    }
    return pipeline;
}

function ensureOwnership({ filePaths, agent, override = false, hint }) {
    if (override || filePaths.length === 0) {
        return;
    }

    const validation = validateFileOwnership(filePaths, agent.role);
    if (!validation.valid) {
        throw createError('OWNERSHIP_CONFLICT', 'File ownership conflict', 409, {
            conflicts: validation.conflicts,
            ...(hint ? { hint } : {}),
        });
    }
}

async function logActivity({ agent_id, action, target_type, target_id, details }) {
    await collabPersistence.activity.log({
        agent_id,
        action,
        target_type,
        target_id,
        details,
    });
}

async function resolveStageCandidate(stage, filePaths = []) {
    const allAgents = await collabPersistence.agents.getAll();
    const agents = allAgents.filter(agent => agent.status !== 'offline');

    if (stage.role) {
        return agents.find(agent => agent.role === stage.role) ?? null;
    }

    const primaryRole = filePaths.length > 0 ? getRoleForPath(filePaths[0]) : null;
    if (!primaryRole) {
        return null;
    }

    return agents.find(agent => agent.role === primaryRole) ?? null;
}

async function createPipelineStageTask({ pipelineId, pipelineLabel, stage, triggerTask }) {
    return await collabPersistence.tasks.create({
        id: uuid(),
        title: `[Pipeline] ${pipelineLabel} - ${stage.name}`,
        description: stage.description,
        priority: 2,
        file_paths: triggerTask?.file_paths ?? [],
        depends_on: [],
        created_by: 'pipeline',
        pipeline_run_id: pipelineId,
    });
}

async function assignTaskInternal({
    task_id,
    agent_id,
    override = false,
    actor_agent_id = agent_id,
    activity_details = {},
}) {
    const task = await getTaskOrThrow(task_id);
    const agent = await getAgentOrThrow(agent_id);

    ensureOwnership({
        filePaths: task.file_paths,
        agent,
        override,
        hint: 'Set override: true to bypass ownership checks',
    });

    const assignmentResult = await collabPersistence.tasks.assignWithLocks(
        task_id,
        agent.id,
        task.file_paths,
        30,
    );

    if (assignmentResult.conflict) {
        throw createError('FILE_LOCK_CONFLICT', 'File lock conflict', 409, {
            file: assignmentResult.file,
            locked_by: assignmentResult.locked_by,
            task_id: assignmentResult.task_id,
        });
    }

    if (!assignmentResult.task) {
        throw createError('TASK_NOT_FOUND', 'Task not found', 404, { task_id });
    }

    await logActivity({
        agent_id: actor_agent_id,
        action: 'task_assigned',
        target_type: 'task',
        target_id: task_id,
        details: {
            agent_id: agent.id,
            agent_name: agent.name,
            override,
            ...activity_details,
        },
    });

    return assignmentResult.task;
}

async function autoAssignStageTask({ pipelineId, stage, stageTask, filePaths }) {
    const candidate = await resolveStageCandidate(stage, filePaths);
    if (!candidate) {
        return {
            task: stageTask,
            assigned: false,
            reason: 'NO_CANDIDATE',
        };
    }

    try {
        const task = await assignTaskInternal({
            task_id: stageTask.id,
            agent_id: candidate.id,
            override: stage.role !== null,
            actor_agent_id: candidate.id,
            activity_details: {
                auto_assigned: true,
                pipeline_run_id: pipelineId,
                stage_name: stage.name,
                override_reason: stage.role !== null ? 'pipeline_stage_role' : null,
            },
        });

        return {
            task,
            assigned: true,
            agent_id: candidate.id,
        };
    } catch (error) {
        if (
            error instanceof CollabServiceError &&
            (error.code === 'FILE_LOCK_CONFLICT' || error.code === 'OWNERSHIP_CONFLICT')
        ) {
            await logActivity({
                agent_id: candidate.id,
                action: 'pipeline_auto_assignment_skipped',
                target_type: 'pipeline',
                target_id: pipelineId,
                details: {
                    stage_name: stage.name,
                    code: error.code,
                    ...error.details,
                },
            });

            return {
                task: stageTask,
                assigned: false,
                reason: error.code,
                details: error.details,
            };
        }

        throw error;
    }
}

async function buildAssignmentPreflight({ task, agent }) {
    const filePaths = task.file_paths || [];
    const warnings = [];
    const conflicts = [];

    if (filePaths.length === 0) {
        warnings.push('This task has no tracked file paths, so ownership and lock checks are advisory only.');
    }

    if (task.assigned_agent === agent.id) {
        warnings.push('This task is already assigned to the selected agent; confirming will refresh its assignment and locks.');
    }

    const ownershipValidation = validateFileOwnership(filePaths, agent.role);
    const ownershipConflicts = ownershipValidation.valid
        ? []
        : ownershipValidation.conflicts.map((conflict) => ({
            kind: 'ownership',
            file: conflict.file,
            owner_role: conflict.owner_role,
            assigned_role: conflict.assigned_role,
            reason: conflict.owner_role
                ? `Owned by ${conflict.owner_role}; ${conflict.assigned_role} assignment requires override.`
                : 'Ownership is not mapped in the control plane; assignment requires override.',
        }));

    const lockConflicts = [];
    for (const filePath of filePaths) {
        const lock = await collabPersistence.locks.check(filePath);
        if (!lock || lock.locked_by === agent.id) {
            continue;
        }

        const taskLabel = lock.task_id ? ` via task ${lock.task_id.slice(0, 8)}...` : '';
        lockConflicts.push({
            kind: 'lock',
            file: filePath,
            locked_by: lock.locked_by,
            task_id: lock.task_id ?? null,
            reason: `Locked by ${lock.locked_by}${taskLabel}.`,
        });
    }

    conflicts.push(...lockConflicts, ...ownershipConflicts);

    const hasLockConflict = lockConflicts.length > 0;
    const hasOwnershipConflict = ownershipConflicts.length > 0;
    const requiresOverride = !hasLockConflict && hasOwnershipConflict;
    const valid = !hasLockConflict && !hasOwnershipConflict;

    let info = 'Assignment is clear. Ownership and lock checks passed.';
    let error = null;

    if (hasLockConflict && hasOwnershipConflict) {
        error = 'Assignment is blocked by active file locks and also crosses ownership boundaries.';
    } else if (hasLockConflict) {
        error = 'Assignment is blocked by active file locks.';
    } else if (hasOwnershipConflict) {
        error = 'Assignment crosses ownership boundaries and requires an explicit override.';
    } else if (warnings.length > 0) {
        info = 'Assignment is clear, but review the advisory warnings before confirming.';
    }

    return {
        valid,
        requires_override: requiresOverride,
        info,
        error,
        warnings,
        conflicts,
        checked_at: new Date().toISOString(),
    };
}

async function getBugReportOrThrow(bugId) {
    const bug = await collabPersistence.bug_reports.getById(bugId);
    if (!bug) {
        throw createError('BUG_REPORT_NOT_FOUND', 'Bug report not found', 404, { bug_id: bugId });
    }
    return bug;
}

function parseBytecode(bytecode) {
    const result = parseErrorForAI(bytecode);
    
    if (!result.aiMetadata?.parseable) {
        return { parseable: false, error: result.message || 'Invalid bytecode' };
    }

    const auto_fixable = ['TYPE', 'VALUE', 'RANGE', 'COORD', 'COLOR'].includes(result.category);

    return {
        parseable: true,
        category: result.category,
        severity: result.severity,
        module_id: result.moduleId,
        error_code_hex: result.errorCodeHex,
        decoded_context: result.context,
        checksum_verified: result.valid,
        auto_fixable,
        recovery_hints: result.recoveryHints,
        dedupe_fingerprint: `${result.category}:${result.severity}:${result.moduleId}:${result.errorCodeHex}`,
    };
}

export const collabService = {
    // ... existing agents, tasks methods ...
    async listBugReports(filters = {}, pagination = {}) {
        return await collabPersistence.bug_reports.getAll(filters, pagination);
    },

    async getBugReport(id) {
        return await getBugReportOrThrow(id);
    },

    async createBugReport(input) {
        const id = uuid();
        let bugData = {
            id,
            ...input,
        };

        if (input.bytecode) {
            const parsed = parseBytecode(input.bytecode);
            if (parsed.parseable) {
                bugData = {
                    ...bugData,
                    category: parsed.category,
                    severity: parsed.severity,
                    module_id: parsed.module_id,
                    error_code_hex: parsed.error_code_hex,
                    checksum_verified: parsed.checksum_verified ? 1 : 0,
                    parseable: 1,
                    auto_fixable: parsed.auto_fixable ? 1 : 0,
                    decoded_context: parsed.decoded_context,
                    recovery_hints: parsed.recovery_hints,
                    dedupe_fingerprint: parsed.dedupe_fingerprint,
                };
            }
        }

        const bug = await collabPersistence.bug_reports.create(bugData);
        await logActivity({
            agent_id: input.reporter_agent_id,
            action: 'bug_report_created',
            target_type: 'bug_report',
            target_id: bug.id,
            details: { title: bug.title, severity: bug.severity },
        });

        return bug;
    },

    async updateBugReport({ id, ...updates }) {
        await getBugReportOrThrow(id);
        const bug = await collabPersistence.bug_reports.update(id, updates);
        
        await logActivity({
            agent_id: null,
            action: 'bug_report_updated',
            target_type: 'bug_report',
            target_id: id,
            details: updates,
        });

        return bug;
    },

    async deleteBugReport(id) {
        await getBugReportOrThrow(id);
        await collabPersistence.bug_reports.delete(id);
        
        await logActivity({
            agent_id: null,
            action: 'bug_report_deleted',
            target_type: 'bug_report',
            target_id: id,
            details: {},
        });
        return { ok: true };
    },

    parseBytecode(bytecode) {
        return parseBytecode(bytecode);
    },

    async importQaResults(results, actorAgentId = null) {
        // results can be a single failure or an array of failures
        const failures = Array.isArray(results) ? results : [results];
        const bugs = [];

        for (const fail of failures) {
            const bug = await this.createBugReport({
                title: fail.title || `QA Failure: ${fail.test_name || 'Unknown Test'}`,
                summary: fail.error_message || fail.summary || 'Assertion failed during QA run.',
                source_type: 'qa',
                severity: fail.severity || 'CRIT',
                priority: fail.priority || 2,
                bytecode: fail.bytecode,
                reporter_agent_id: actorAgentId || 'qa-engine',
                observed_behavior: fail.observed || fail.actual,
                expected_behavior: fail.expected,
                repro_steps: fail.repro_steps || [],
                environment: fail.environment || {},
            });
            bugs.push(bug);
        }

        return bugs;
    },

    async createTaskFromBug(bugId, actorAgentId = null) {
        const bug = await getBugReportOrThrow(bugId);
        
        const taskInput = {
            title: `[Fix] ${bug.title}`,
            description: `Auto-generated from Bug Report ${bug.id}\n\nSeverity: ${bug.severity}\nCategory: ${bug.category}\n\nSummary: ${bug.summary || 'None'}`,
            priority: bug.priority,
            created_by: actorAgentId || 'system',
            related_bug_id: bug.id, // We should add this to task schema if needed, but for now it goes into activity
        };

        const task = await this.createTask(taskInput);
        await this.updateBugReport({
            id: bugId,
            status: 'triaged',
            related_task_id: task.id,
        });

        await logActivity({
            agent_id: actorAgentId,
            action: 'bug_task_created',
            target_type: 'bug_report',
            target_id: bugId,
            details: { task_id: task.id },
        });

        return task;
    },

    async listAgents() {
        const agents = await collabPersistence.agents.getAll();
        const nowMs = Date.now();
        return agents.filter(agent => shouldRetainAgentInPresence(agent, nowMs));
    },

    async getAgent(id) {
        return await getAgentOrThrow(id);
    },

    async registerAgent(input) {
        // Clean any stale session for this ID before re-registering
        const existing = await collabPersistence.agents.getById(input.id);
        if (existing) {
            await cleanAgentSession(input.id);
        }

        const agent = await collabPersistence.agents.register(input);
        await logActivity({
            agent_id: agent.id,
            action: 'agent_registered',
            target_type: 'agent',
            target_id: agent.id,
            details: { role: agent.role },
        });

        // Run duplicate QA scan asynchronously — don't block registration
        setImmediate(async () => {
            try { await runAgentQaScan({ autoResolve: true }); } catch { /* ignore */ }
        });

        return agent;
    },

    async heartbeatAgent({ id, status, current_task_id }) {
        // If going offline, clean the session first
        if (status === 'offline') {
            const exists = await collabPersistence.agents.getById(id);
            if (exists) {
                await cleanAgentSession(id);
            }
        }

        const agent = await collabPersistence.agents.heartbeat(id, status, current_task_id);
        if (!agent) {
            throw createError('AGENT_NOT_FOUND', 'Agent not found', 404, { agent_id: id });
        }
        return agent;
    },

    async disconnectAgent(id) {
        await getAgentOrThrow(id);

        const { locksReleased, tasksUnassigned } = await cleanAgentSession(id);
        await collabPersistence.agents.offline(id);

        await logActivity({
            agent_id: id,
            action: 'agent_disconnected',
            target_type: 'agent',
            target_id: id,
            details: { locks_released: locksReleased, tasks_unassigned: tasksUnassigned },
        });

        return { ok: true, locks_released: locksReleased, tasks_unassigned: tasksUnassigned };
    },

    async deleteAgent(id) {
        await getAgentOrThrow(id);

        // Clean session before deletion: release locks + unassign tasks
        const { locksReleased, tasksUnassigned } = await cleanAgentSession(id);

        const deleted = await collabPersistence.agents.delete(id);
        if (!deleted) {
            throw createError('AGENT_NOT_FOUND', 'Agent not found', 404, { agent_id: id });
        }

        await logActivity({
            agent_id: id,
            action: 'agent_deleted',
            target_type: 'agent',
            target_id: id,
            details: { reason: 'manual_delete', locks_released: locksReleased, tasks_unassigned: tasksUnassigned },
        });

        return { ok: true };
    },

    async runAgentQaScan({ autoResolve = true } = {}) {
        return await runAgentQaScan({ autoResolve });
    },

    async listTasks({ status, agent, priority, limit, offset } = {}) {
        return await collabPersistence.tasks.getAll(
            { status, agent, priority },
            { limit, offset },
        );
    },

    async getTask(id) {
        return await getTaskOrThrow(id);
    },

    async getTaskAssignmentPreflight({ task_id, agent_id }) {
        const task = await getTaskOrThrow(task_id);
        const agent = await getAgentOrThrow(agent_id);
        return await buildAssignmentPreflight({ task, agent });
    },

    async createTask(input) {
        const { note, ...rest } = input;
        const initialNotes = [];
        if (note) {
            initialNotes.push({
                agent_id: input.created_by || 'human',
                timestamp: new Date().toISOString(),
                text: note,
            });
        }

        const task = await collabPersistence.tasks.create({
            id: uuid(),
            file_paths: [],
            depends_on: [],
            ...rest,
            notes: initialNotes,
        });

        await logActivity({
            agent_id: input.created_by,
            action: 'task_created',
            target_type: 'task',
            target_id: task.id,
            details: { title: task.title },
        });

        return task;
    },

    async updateTask({ id, actor_agent_id = null, ...updates }) {
        const existingTask = await getTaskOrThrow(id);

        if (updates.note) {
            const newNote = {
                agent_id: actor_agent_id,
                timestamp: new Date().toISOString(),
                text: updates.note,
            };
            const currentNotes = existingTask.notes || [];
            updates.notes = [...currentNotes, newNote];
            delete updates.note;
        }

        const task = await collabPersistence.tasks.update(id, updates);
        if (updates.status === 'done') {
            await collabPersistence.locks.releaseForTask(id);
        }

        const activityDetails = { ...updates };
        delete activityDetails.notes;

        await logActivity({
            agent_id: actor_agent_id,
            action: 'task_updated',
            target_type: 'task',
            target_id: id,
            details: activityDetails,
        });

        return task;
    },

    async deleteTask({ id, actor_agent_id = null }) {
        await getTaskOrThrow(id);

        await collabPersistence.locks.releaseForTask(id);
        await collabPersistence.tasks.delete(id);

        await logActivity({
            agent_id: actor_agent_id,
            action: 'task_deleted',
            target_type: 'task',
            target_id: id,
            details: {},
        });

        return { ok: true };
    },

    async assignTask(params) {
        return await assignTaskInternal(params);
    },

    async listLocks() {
        return await collabPersistence.locks.getAll();
    },

    async checkLock(path) {
        return await collabPersistence.locks.check(path);
    },

    async acquireLock({ file_path, agent_id, task_id, ttl_minutes, override = false }) {
        const agent = await getAgentOrThrow(agent_id);
        ensureOwnership({
            filePaths: [file_path],
            agent,
            override,
        });

        if (task_id) {
            await getTaskOrThrow(task_id);
        }

        const result = await collabPersistence.locks.acquire({
            file_path,
            agent_id,
            task_id,
            ttl_minutes,
        });

        if (result.conflict) {
            throw createError('FILE_LOCK_CONFLICT', 'File already locked', 409, {
                locked_by: result.locked_by,
                task_id: result.task_id,
                file_path,
            });
        }

        await logActivity({
            agent_id,
            action: 'lock_acquired',
            target_type: 'lock',
            target_id: file_path,
            details: { task_id: task_id ?? null, ttl_minutes },
        });

        return result;
    },

    async releaseLock({ file_path, agent_id }) {
        await getAgentOrThrow(agent_id);

        const released = await collabPersistence.locks.release(file_path, agent_id);
        if (!released) {
            throw createError('LOCK_NOT_FOUND', 'Lock not found or not owned by you', 404, {
                file_path,
                agent_id,
            });
        }

        await logActivity({
            agent_id,
            action: 'lock_released',
            target_type: 'lock',
            target_id: file_path,
            details: {},
        });

        return { ok: true };
    },

    async listPipelines({ status, limit, offset } = {}) {
        return await collabPersistence.pipelines.getAll({ status }, { limit, offset });
    },

    async getPipeline(id) {
        return await getPipelineOrThrow(id);
    },

    async createPipeline({ pipeline_type, trigger_task_id, actor_agent_id = null }) {
        const definition = PIPELINE_DEFINITIONS[pipeline_type];
        if (!definition) {
            throw createError('VALIDATION_FAILED', `Unknown pipeline type: ${pipeline_type}`, 400, {
                pipeline_type,
            });
        }

        const pipelineId = uuid();
        const pipeline = await collabPersistence.pipelines.create({
            id: pipelineId,
            pipeline_type,
            stages: definition.stages,
            trigger_task_id,
        });

        const triggerTask = trigger_task_id
            ? await collabPersistence.tasks.getById(trigger_task_id)
            : null;
        const firstStage = definition.stages[0];
        const stageTask = await createPipelineStageTask({
            pipelineId,
            pipelineLabel: definition.name,
            stage: firstStage,
            triggerTask,
        });
        const autoAssignment = await autoAssignStageTask({
            pipelineId,
            stage: firstStage,
            stageTask,
            filePaths: stageTask.file_paths,
        });

        await logActivity({
            agent_id: actor_agent_id,
            action: 'pipeline_started',
            target_type: 'pipeline',
            target_id: pipelineId,
            details: {
                type: pipeline_type,
                name: definition.name,
                stage_task_id: stageTask.id,
                auto_assignment: autoAssignment,
            },
        });

        return {
            pipeline,
            stage_task: autoAssignment.task,
            auto_assignment: autoAssignment,
        };
    },

    async advancePipeline({ id, result = {}, actor_agent_id = null }) {
        const pipeline = await getPipelineOrThrow(id);
        if (pipeline.status !== 'running') {
            return {
                pipeline,
                isComplete: pipeline.status === 'completed',
                nextStageIndex: null,
                terminal: true,
                stage_task: null,
                auto_assignment: null,
            };
        }

        const advancement = await collabPersistence.pipelines.advance(id, result);
        let stageTask = null;
        let autoAssignment = null;

        if (!advancement.isComplete) {
            const nextPipeline = advancement.pipeline;
            const nextStage = nextPipeline.stages[advancement.nextStageIndex];
            const triggerTask = nextPipeline.trigger_task_id
                ? await collabPersistence.tasks.getById(nextPipeline.trigger_task_id)
                : null;
            const pipelineLabel = PIPELINE_DEFINITIONS[nextPipeline.pipeline_type]?.name
                ?? nextPipeline.pipeline_type;

            stageTask = await createPipelineStageTask({
                pipelineId: id,
                pipelineLabel,
                stage: nextStage,
                triggerTask,
            });
            autoAssignment = await autoAssignStageTask({
                pipelineId: id,
                stage: nextStage,
                stageTask,
                filePaths: stageTask.file_paths,
            });
            stageTask = autoAssignment.task;
        }

        await logActivity({
            agent_id: actor_agent_id,
            action: advancement.isComplete ? 'pipeline_completed' : 'pipeline_advanced',
            target_type: 'pipeline',
            target_id: id,
            details: {
                stage: advancement.isComplete ? 'done' : advancement.nextStageIndex,
                stage_task_id: stageTask?.id ?? null,
                auto_assignment: autoAssignment,
            },
        });

        return {
            ...advancement,
            terminal: false,
            stage_task: stageTask,
            auto_assignment: autoAssignment,
        };
    },

    async failPipeline({ id, reason, actor_agent_id = null }) {
        const pipeline = await getPipelineOrThrow(id);
        if (pipeline.status !== 'running') {
            return {
                pipeline,
                terminal: true,
            };
        }

        const failed = await collabPersistence.pipelines.fail(id, reason);

        await logActivity({
            agent_id: actor_agent_id,
            action: 'pipeline_failed',
            target_type: 'pipeline',
            target_id: id,
            details: { reason },
        });

        return {
            pipeline: failed,
            terminal: false,
        };
    },

    async listActivity({ limit, offset, agent, action } = {}) {
        return await collabPersistence.activity.getRecent(limit, { agent, action }, offset);
    },

    async logActivity({ agent_id, action, target_type, target_id, details }) {
        await logActivity({ agent_id, action, target_type, target_id, details });
    },

    async setMemory({ agent_id, key, value }) {
        if (agent_id) {
            await getAgentOrThrow(agent_id);
        }
        const memory = await collabPersistence.memories.set(agent_id, key, value);
        await logActivity({
            agent_id,
            action: 'memory_set',
            target_type: 'memory',
            target_id: key,
            details: { has_agent: !!agent_id },
        });
        return memory;
    },

    async getMemory({ agent_id, key }) {
        return await collabPersistence.memories.get(agent_id, key);
    },

    async listMemories(agent_id = null) {
        return await collabPersistence.memories.getAll(agent_id);
    },

    async deleteMemory({ agent_id, key }) {
        const existing = await collabPersistence.memories.get(agent_id, key);
        if (!existing) {
            throw createError('MEMORY_NOT_FOUND', 'Memory not found', 404, {
                agent_id: agent_id || '',
                key,
            });
        }
        const deleted = await collabPersistence.memories.delete(agent_id, key);
        await logActivity({
            agent_id,
            action: 'memory_deleted',
            target_type: 'memory',
            target_id: key,
            details: { has_agent: !!agent_id },
        });
        return { ok: true, deleted };
    },

    async getStatus() {
        const agents = await collabPersistence.agents.getAll();
        const taskCounts = await collabPersistence.tasks.getCounts();
        const pipelineCounts = await collabPersistence.pipelines.getCounts();
        const locks = await collabPersistence.locks.getAll();

        const activeMcpLocks = locks.filter(l => l.mcp_active);

        return {
            online_agents: agents.filter(agent => agent.status !== 'offline').length,
            total_agents: agents.length,
            active_tasks: taskCounts.active_tasks,
            total_tasks: taskCounts.total_tasks,
            running_pipelines: pipelineCounts.running_pipelines,
            active_locks: locks.length,
            mcp_port: {
                active_bindings: activeMcpLocks.length,
                throughput: activeMcpLocks.reduce((sum, l) => sum + (l.mcp_stream?.throughput || 0), 0)
            }
        };
    },
};
