import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { existsSync, rmSync } from 'fs';
import os from 'os';
import path from 'path';

let collabService;
let CollabServiceError;
let collabPersistence;
let testDbPath;

const SLA_MS = 30_000;

async function waitFor(predicate, { timeoutMs = 1000, intervalMs = 10 } = {}) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const result = await predicate();
        if (result) return result;
        await new Promise(r => setTimeout(r, intervalMs));
    }
    throw new Error('waitFor: condition not met within timeout');
}

beforeAll(async () => {
    testDbPath = path.join(
        os.tmpdir(),
        `scholomance_alerts_test_${Date.now()}_${process.pid}.sqlite`,
    );
    process.env.COLLAB_DB_PATH = testDbPath;
    vi.resetModules();

    const serviceMod = await import('../../codex/server/collab/collab.service.js?test=alerts');
    const persistenceMod = await import('../../codex/server/collab/collab.persistence.js');

    collabService = serviceMod.collabService;
    CollabServiceError = serviceMod.CollabServiceError;
    collabPersistence = persistenceMod.collabPersistence;

    await collabService.bootstrap();

    await collabService.registerAgent({ id: 'alpha', name: 'Alpha', role: 'backend' });
    await collabService.registerAgent({ id: 'bravo', name: 'Bravo', role: 'qa' });
    await collabService.registerAgent({ id: 'charlie', name: 'Charlie', role: 'ui' });
    await collabService.registerAgent({ id: 'delta', name: 'Delta', role: 'qa' });

    // Push delta offline so liveness gate excludes it.
    await collabService.heartbeatAgent({ id: 'delta', status: 'offline' });
});

afterAll(async () => {
    await collabService.close();
    if (collabPersistence?.close) {
        await collabPersistence.close();
    }
    if (existsSync(testDbPath)) {
        try { rmSync(testDbPath); } catch { /* ignore */ }
    }
});

describe('[services] Heartbeat Alert Identity Packet Protocol', () => {
    describe('AlertDispatcher', () => {
        it("fans out to every live non-sender agent on target_id='all'", async () => {
            const msg = await collabService.sendMessage(
                { sender_id: 'alpha', target_id: 'all', text: 'roll call' },
                'alpha'
            );

            const alerts = await waitFor(async () => {
                const all = await collabPersistence.alerts.getAll();
                const forMessage = all.filter(a => a.message_id === msg.id);
                return forMessage.length >= 2 ? forMessage : null;
            });

            const recipients = alerts.map(a => a.recipient_id).sort();
            expect(recipients).toEqual(['bravo', 'charlie']);
            expect(recipients).not.toContain('alpha');
            expect(recipients).not.toContain('delta');

            // Each row carries a frozen identity packet
            for (const a of alerts) {
                expect(a.identity_packet.alert_id).toBe(a.id);
                expect(a.identity_packet.sla_ms).toBe(SLA_MS);
                expect(a.identity_packet.sender.id).toBe('alpha');
                expect(a.identity_packet.message.id).toBe(msg.id);
                expect(a.expires_at - a.issued_at).toBe(SLA_MS);
            }
        });

        it('skips dispatch when the directed target is offline', async () => {
            const before = await collabPersistence.alerts.getAll();
            const beforeIds = new Set(before.map(a => a.id));

            const msg = await collabService.sendMessage(
                { sender_id: 'alpha', target_id: 'delta', text: 'are you there?' },
                'alpha'
            );

            // Allow the listener to run, then assert nothing new was issued
            await new Promise(r => setTimeout(r, 80));
            const after = await collabPersistence.alerts.getAll();
            const fresh = after.filter(a => !beforeIds.has(a.id));
            expect(fresh.filter(a => a.message_id === msg.id)).toHaveLength(0);
        });

        it('freezes the identity packet against post-dispatch agent renames', async () => {
            const msg = await collabService.sendMessage(
                { sender_id: 'alpha', target_id: 'bravo', text: 'snapshot test' },
                'alpha'
            );

            const alert = await waitFor(async () => {
                const all = await collabPersistence.alerts.getAll();
                return all.find(a => a.message_id === msg.id && a.recipient_id === 'bravo') || null;
            });
            expect(alert.identity_packet.recipient.name).toBe('Bravo');

            // Rename bravo
            await collabService.registerAgent({ id: 'bravo', name: 'Bravo Reborn', role: 'qa' });

            const refetched = await collabPersistence.alerts.getById(alert.id);
            expect(refetched.identity_packet.recipient.name).toBe('Bravo');
        });
    });

    describe('respondToAlert', () => {
        it('acknowledges within SLA and records latency', async () => {
            const msg = await collabService.sendMessage(
                { sender_id: 'alpha', target_id: 'bravo', text: 'ack within sla' },
                'alpha'
            );
            const alert = await waitFor(async () => {
                const all = await collabPersistence.alerts.getAll();
                return all.find(a => a.message_id === msg.id && a.recipient_id === 'bravo') || null;
            });

            const response = await collabService.respondToAlert(alert.id, 'bravo', { payload: { glyph: '⟐' } });
            expect(response.alert_id).toBe(alert.id);
            expect(response.agent_id).toBe('bravo');
            expect(response.latency_ms).toBeGreaterThanOrEqual(0);
            expect(response.latency_ms).toBeLessThan(SLA_MS);
            expect(response.payload).toEqual({ glyph: '⟐' });

            const refreshed = await collabPersistence.alerts.getById(alert.id);
            expect(refreshed.status).toBe('acknowledged');
        });

        it('returns already_acknowledged on duplicate respond', async () => {
            const msg = await collabService.sendMessage(
                { sender_id: 'alpha', target_id: 'bravo', text: 'idempotent ack' },
                'alpha'
            );
            const alert = await waitFor(async () => {
                const all = await collabPersistence.alerts.getAll();
                return all.find(a => a.message_id === msg.id && a.recipient_id === 'bravo') || null;
            });

            await collabService.respondToAlert(alert.id, 'bravo', { payload: {} });
            const dup = await collabService.respondToAlert(alert.id, 'bravo', { payload: { extra: true } });

            expect(dup.already_acknowledged).toBe(true);
            expect(dup.response.alert_id).toBe(alert.id);
            // Original payload is preserved; second call does not mutate
            expect(dup.response.payload).toEqual({});
        });

        it('rejects respond from a non-recipient agent (403)', async () => {
            const msg = await collabService.sendMessage(
                { sender_id: 'alpha', target_id: 'bravo', text: 'not yours' },
                'alpha'
            );
            const alert = await waitFor(async () => {
                const all = await collabPersistence.alerts.getAll();
                return all.find(a => a.message_id === msg.id && a.recipient_id === 'bravo') || null;
            });

            await expect(
                collabService.respondToAlert(alert.id, 'charlie', { payload: {} })
            ).rejects.toMatchObject({ code: 'AUTH_SENDER_MISMATCH', statusCode: 403 });
        });

        it('returns 410 Gone when responding to an expired alert', async () => {
            const msg = await collabService.sendMessage(
                { sender_id: 'alpha', target_id: 'bravo', text: 'too late' },
                'alpha'
            );
            const alert = await waitFor(async () => {
                const all = await collabPersistence.alerts.getAll();
                return all.find(a => a.message_id === msg.id && a.recipient_id === 'bravo') || null;
            });

            // Force the alert past its expiry
            await collabPersistence.alerts.updateStatus(alert.id, 'expired');

            await expect(
                collabService.respondToAlert(alert.id, 'bravo', { payload: {} })
            ).rejects.toMatchObject({ code: 'ALERT_EXPIRED', statusCode: 410 });
        });
    });

    describe('reaper', () => {
        async function plantExpiredAlert({ id, recipientId, role }) {
            // Anchor the planted alert to a real message row to satisfy the FK constraint
            const carrier = await collabService.sendMessage(
                { sender_id: 'alpha', target_id: recipientId, text: `reaper-anchor-${id}` },
                'alpha'
            );
            const now = Date.now();
            await collabPersistence.alerts.create({
                id,
                message_id: carrier.id,
                recipient_id: recipientId,
                sender_id: 'alpha',
                target_id: recipientId,
                identity_packet: {
                    alert_id: id,
                    issued_at: now - 60_000,
                    expires_at: now - 30_000,
                    sla_ms: SLA_MS,
                    recipient: { id: recipientId, name: recipientId, role, capabilities: [] },
                    sender: { id: 'alpha', name: 'Alpha', role: 'backend' },
                    message: { id: carrier.id, target_id: recipientId, glyph: '✦', text: 'planted', bytecode: null, created_at: '' },
                    respond_via: { tool: 'collab_alert_respond', endpoint: `POST /collab/alerts/${id}/respond` }
                },
                issued_at: now - 60_000,
                expires_at: now - 30_000
            });
        }

        it("transitions pending → expired when expires_at <= now", async () => {
            const id = `alr_${Date.now()}_test_reaper`;
            await plantExpiredAlert({ id, recipientId: 'bravo', role: 'qa' });

            const before = await collabPersistence.alerts.getById(id);
            expect(before.status).toBe('pending');

            await collabService._runReaper();

            const after = await collabPersistence.alerts.getById(id);
            expect(after.status).toBe('expired');
        });

        it('emits alert_expired on the events bus when the reaper runs', async () => {
            const id = `alr_${Date.now()}_emit_test`;
            await plantExpiredAlert({ id, recipientId: 'charlie', role: 'ui' });

            const expiries = [];
            const handler = (a) => { if (a.id === id) expiries.push(a); };
            collabService.events.on('alert_expired', handler);
            try {
                await collabService._runReaper();
            } finally {
                collabService.events.off('alert_expired', handler);
            }
            expect(expiries).toHaveLength(1);
            expect(expiries[0].recipient_id).toBe('charlie');
        });
    });

    describe('heartbeat piggyback', () => {
        it('returns pending alerts on heartbeat and marks them delivered_via=heartbeat', async () => {
            const msg = await collabService.sendMessage(
                { sender_id: 'alpha', target_id: 'charlie', text: 'wake up' },
                'alpha'
            );
            const alert = await waitFor(async () => {
                const all = await collabPersistence.alerts.getAll();
                return all.find(a => a.message_id === msg.id && a.recipient_id === 'charlie') || null;
            });

            const heartbeatResult = await collabService.heartbeatAgent({
                id: 'charlie',
                status: 'online'
            });

            expect(heartbeatResult.pending_alerts).toBeDefined();
            const delivered = heartbeatResult.pending_alerts.find(p => p.alert_id === alert.id);
            expect(delivered).toBeDefined();
            expect(delivered.recipient.id).toBe('charlie');

            const refetched = await collabPersistence.alerts.getById(alert.id);
            expect(refetched.delivered_via).toBe('heartbeat');
            // Status stays pending — only acknowledgment changes status
            expect(refetched.status).toBe('pending');
        });
    });
});
