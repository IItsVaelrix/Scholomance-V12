
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import ActivityFeed from '../../src/pages/Collab/ActivityFeed';
import AgentMessaging from '../../src/pages/Collab/AgentMessaging';
import MetricsGrid from '../../src/pages/Collab/MetricsGrid';
import PipelineView from '../../src/pages/Collab/PipelineView';
import PipelineTerminal from '../../src/pages/Collab/PipelineTerminal';
import TaskBoard from '../../src/pages/Collab/TaskBoard';
import TaskDetailDrawer from '../../src/pages/Collab/TaskDetailDrawer';
import { assertEqual, assertTrue, assertType } from './tools/bytecode-assertions.js';

// Mock Framer Motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>,
        article: ({ children, ...props }) => <article {...props}>{children}</article>,
        header: ({ children, ...props }) => <header {...props}>{children}</header>,
        form: ({ children, ...props }) => <form {...props}>{children}</form>,
        tr: ({ children, ...props }) => <tr {...props}>{children}</tr>,
        aside: ({ children, ...props }) => <aside {...props}>{children}</aside>,
        span: ({ children, ...props }) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock BroadcastChannel for AgentMessaging
class MockBroadcastChannel {
    constructor(name) {
        this.name = name;
        this.onmessage = null;
    }
    postMessage = vi.fn();
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
}
global.BroadcastChannel = MockBroadcastChannel;

const testContext = {
    testFile: 'collab-orchestration.qa.test.jsx',
    testSuite: 'Collab Orchestration QA'
};

describe('ActivityFeed', () => {
    const mockActivity = [
        { id: '1', agent_id: 'agent-1', action: 'task_created', details: { title: 'Test Task' }, created_at: new Date().toISOString() },
        { id: '2', agent_id: 'agent-2', action: 'agent_heartbeat', created_at: new Date().toISOString() }
    ];

    it('renders activity entries correctly', () => {
        render(<ActivityFeed activity={mockActivity} />);
        assertTrue(screen.getByText('created task'), { ...testContext, testName: 'should render action label' });
        assertTrue(screen.getByText('"Test Task"'), { ...testContext, testName: 'should render details title' });
    });

    it('shows empty state when no activity', () => {
        render(<ActivityFeed activity={[]} />);
        assertTrue(screen.getByText('No Activity Yet'), { ...testContext, testName: 'should show empty state' });
    });
});

describe('AgentMessaging', () => {
    const mockAgents = [{ id: 'agent-1', name: 'Agent 1', status: 'online' }];

    it('renders and allows input', () => {
        render(<AgentMessaging agents={mockAgents} currentAgentId="agent-1" />);
        const textarea = screen.getByLabelText('Message input');
        fireEvent.change(textarea, { target: { value: 'Hello chamber' } });
        assertEqual(textarea.value, 'Hello chamber', { ...testContext, testName: 'textarea should hold input' });
    });
});

describe('MetricsGrid', () => {
    const mockMetrics = {
        agents: { connected: 5, disconnected: 2 },
        tasks: { active: 10, total: 20 },
        pipelines: { running: 3 },
        locks: { active: 4 },
        bugs: { critical: 1, total: 5 },
        blocked: { count: 2 },
        completed: { count: 15 },
        mcp_port: { throughput: 100, active_bindings: 2 }
    };

    it('renders metrics data accurately', () => {
        render(<MetricsGrid metrics={mockMetrics} />);
        assertTrue(screen.getByText('5 live / 2 down'), { ...testContext, testName: 'should render agent presence' });
        assertTrue(screen.getByText('1 crit / 5 total'), { ...testContext, testName: 'should render bug artifacts' });
        assertTrue(screen.getByText('100 kb/s · 2 binds'), { ...testContext, testName: 'should render MCP port status' });
    });
});

describe('TaskBoard', () => {
    const mockTasks = [
        { id: 't1', title: 'Task 1', status: 'backlog', priority: 1 },
        { id: 't2', title: 'Task 2', status: 'in_progress', priority: 2, assigned_agent: 'agent-1' }
    ];
    const mockAgents = [{ id: 'agent-1', name: 'Agent 1' }];

    it('renders tasks in correct columns', () => {
        render(<TaskBoard tasks={mockTasks} agents={mockAgents} />);
        const backlogColumn = screen.getByText('Backlog').closest('.kanban__column');
        const inProgressColumn = screen.getByText('In Progress').closest('.kanban__column');
        
        assertTrue(backlogColumn.innerHTML.includes('Task 1'), { ...testContext, testName: 'Task 1 should be in Backlog' });
        assertTrue(inProgressColumn.innerHTML.includes('Task 2'), { ...testContext, testName: 'Task 2 should be in In Progress' });
    });
});

describe('PipelineView', () => {
    const mockPipelines = [
        { 
            id: 'p1', 
            pipeline_type: 'code_review_test', 
            status: 'running', 
            current_stage: 0,
            stages: [{ name: 'Implementation', role: 'backend' }, { name: 'Review', role: 'ui' }]
        }
    ];

    it('renders pipeline cards and stages', () => {
        render(<PipelineView pipelines={mockPipelines} />);
        assertTrue(screen.getByText('code review test'), { ...testContext, testName: 'should render pipeline type' });
        assertTrue(screen.getByText('Implementation'), { ...testContext, testName: 'should render stage name' });
    });
});

describe('TaskDetailDrawer', () => {
    const mockTask = {
        id: 't1',
        title: 'Fix the Void',
        status: 'in_progress',
        priority: 3,
        assigned_agent: 'agent-1',
        description: 'Deep calibration required',
        file_paths: ['src/core.js'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    const mockAgents = [{ id: 'agent-1', name: 'Agent 1', role: 'backend' }];
    const mockLocks = [{ file_path: 'src/core.js', agent_id: 'agent-1', task_id: 't1', mcp_active: true }];

    it('renders task details correctly', () => {
        render(
            <TaskDetailDrawer 
                task={mockTask} 
                agents={mockAgents} 
                locks={mockLocks} 
                activity={[]} 
                pipelines={[]}
                isOpen={true} 
            />
        );
        assertTrue(screen.getByText('Fix the Void'), { ...testContext, testName: 'should render title' });
        assertTrue(screen.getByText('Critical'), { ...testContext, testName: 'should render priority label' });
        
        // Check for MCP badge in Files section
        fireEvent.click(screen.getByRole('button', { name: /^Files$/ }));
        assertTrue(screen.getByText('MCP'), { ...testContext, testName: 'should show MCP binding badge' });
    });
});
