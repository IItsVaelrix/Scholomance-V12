import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * Integration test for the user_identities layer (PDR-2026-06-03-ACCOUNTS-EMAIL-OAUTH,
 * Phase 1). Points userPersistence at a throwaway SQLite file so migration v14 runs
 * against a clean database, then exercises the identities API end-to-end.
 */
describe('[Server] user identities persistence (migration v14)', () => {
  let userPersistence;
  let dbPath;

  beforeAll(async () => {
    dbPath = path.join(os.tmpdir(), `identities_test_${Date.now()}.sqlite`);
    process.env.USER_DB_PATH = dbPath;
    delete process.env.TURSO_USER_DB_URL;
    // Dynamic import AFTER USER_DB_PATH is set so the module opens the temp DB
    // and runs all migrations (including v14) on load.
    ({ userPersistence } = await import('../../codex/server/user.persistence.js'));
  });

  afterAll(() => {
    try { userPersistence?.close?.(); } catch { /* already closed */ }
    for (const suffix of ['', '-wal', '-shm']) {
      const f = `${dbPath}${suffix}`;
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
  });

  it('creates a password identity for a newly registered user', async () => {
    const user = await userPersistence.users.createUser('alice', 'alice@example.com', 'hash', 'verify-tok');
    const identity = await userPersistence.identities.find('password', String(user.id));
    expect(identity).toBeTruthy();
    expect(identity.provider).toBe('password');
    // This persistence layer returns SELECTed ids as strings; createUser returns a
    // numeric lastInsertRowid. Compare by value, not type.
    expect(Number(identity.user_id)).toBe(Number(user.id));
    expect(identity.email).toBe('alice@example.com');
    expect(identity.email_verified).toBe(0);
  });

  it('flips the password identity email_verified when the user verifies', async () => {
    const user = await userPersistence.users.createUser('bob', 'bob@example.com', 'hash', 'verify-tok-2');
    await userPersistence.users.verifyUser(user.id);
    const identity = await userPersistence.identities.find('password', String(user.id));
    expect(identity.email_verified).toBe(1);
  });

  it('resolves a user from an identity and links additional providers', async () => {
    const user = await userPersistence.users.createUser('carol', 'carol@example.com', 'hash', 'verify-tok-3');

    await userPersistence.identities.link({
      userId: user.id,
      provider: 'google',
      providerUserId: 'google-sub-123',
      email: 'carol@example.com',
      emailVerified: true,
    });

    const viaGoogle = await userPersistence.identities.findUser('google', 'google-sub-123');
    expect(Number(viaGoogle?.id)).toBe(Number(user.id));

    const list = await userPersistence.identities.listForUser(user.id);
    expect(list.map((i) => i.provider).sort()).toEqual(['google', 'password']);

    const googleIdentity = list.find((i) => i.provider === 'google');
    expect(googleIdentity.email_verified).toBe(1);
  });

  it('refuses to unlink the only remaining identity, but allows unlinking when others exist', async () => {
    const user = await userPersistence.users.createUser('dave', 'dave@example.com', 'hash', 'verify-tok-4');

    // Only the password identity exists → must refuse.
    const refused = await userPersistence.identities.unlink(user.id, 'password');
    expect(refused).toEqual({ ok: false, reason: 'last_identity' });

    // Add a second identity, then unlinking the first is allowed.
    await userPersistence.identities.link({
      userId: user.id,
      provider: 'github',
      providerUserId: 'gh-999',
      email: 'dave@example.com',
      emailVerified: true,
    });
    const ok = await userPersistence.identities.unlink(user.id, 'password');
    expect(ok).toEqual({ ok: true });

    const remaining = await userPersistence.identities.listForUser(user.id);
    expect(remaining.map((i) => i.provider)).toEqual(['github']);
  });

  it('enforces the unique (provider, provider_user_id) constraint', async () => {
    const user = await userPersistence.users.createUser('erin', 'erin@example.com', 'hash', 'verify-tok-5');
    await userPersistence.identities.link({
      userId: user.id, provider: 'google', providerUserId: 'dup-sub', email: 'erin@example.com', emailVerified: true,
    });
    await expect(
      userPersistence.identities.link({
        userId: user.id, provider: 'google', providerUserId: 'dup-sub', email: 'erin@example.com', emailVerified: true,
      }),
    ).rejects.toThrow();
  });
});
