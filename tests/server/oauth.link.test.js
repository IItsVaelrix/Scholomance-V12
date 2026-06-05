import { describe, it, expect, beforeEach } from 'vitest';
import { resolveOAuthIdentity } from '../../codex/server/oauth/oauth.link.js';

/** Minimal in-memory stand-in for userPersistence used by resolveOAuthIdentity. */
function makeMockPersistence() {
  const users = new Map();
  const identities = [];
  let nextId = 1;

  return {
    users,
    identities: identities, // exposed for assertions
    api: {
      users: {
        findById: async (id) => users.get(Number(id)) || null,
        findByEmail: async (email) => [...users.values()].find((u) => u.email === email) || null,
        findByUsername: async (username) => [...users.values()].find((u) => u.username === username) || null,
        createOAuthAccount: async ({ username, email, passwordHash, provider, providerUserId, emailVerified }) => {
          // Mirror the persistence layer: user + identity created together (atomic).
          const id = nextId++;
          users.set(id, { id, username, email, password: passwordHash, verified: 1 });
          identities.push({
            user_id: id,
            provider,
            provider_user_id: String(providerUserId),
            email,
            email_verified: emailVerified ? 1 : 0,
          });
          return { id, username, email };
        },
      },
      identities: {
        find: async (provider, providerUserId) =>
          identities.find((i) => i.provider === provider && i.provider_user_id === String(providerUserId)) || null,
        link: async ({ userId, provider, providerUserId, email, emailVerified }) => {
          const row = {
            user_id: Number(userId),
            provider,
            provider_user_id: String(providerUserId),
            email,
            email_verified: emailVerified ? 1 : 0,
          };
          identities.push(row);
          return row;
        },
      },
    },
  };
}

const placeholderHash = () => Promise.resolve('$2b$12$unusable.placeholder.hash.value.for.oauth.only');

describe('[Server] resolveOAuthIdentity (find-or-link rules)', () => {
  let mock;
  beforeEach(() => {
    mock = makeMockPersistence();
  });

  it('logs straight in when the provider identity already exists', async () => {
    mock.users.set(1, { id: 1, username: 'alice', email: 'alice@x.com' });
    mock.identities.push({ user_id: 1, provider: 'google', provider_user_id: 'g-1', email: 'alice@x.com', email_verified: 1 });

    const res = await resolveOAuthIdentity({
      persistence: mock.api,
      provider: 'google',
      profile: { providerUserId: 'g-1', email: 'alice@x.com', emailVerified: true },
      makePlaceholderPasswordHash: placeholderHash,
    });

    expect(res.action).toBe('login');
    expect(res.user.id).toBe(1);
  });

  it('links to the current account when a logged-in user is connecting a provider', async () => {
    mock.users.set(7, { id: 7, username: 'bob', email: 'bob@x.com' });

    const res = await resolveOAuthIdentity({
      persistence: mock.api,
      provider: 'google',
      profile: { providerUserId: 'g-bob', email: 'bob@x.com', emailVerified: true },
      sessionUserId: 7,
      makePlaceholderPasswordHash: placeholderHash,
    });

    expect(res.action).toBe('linked');
    expect(res.user.id).toBe(7);
    expect(mock.identities).toContainEqual(
      expect.objectContaining({ user_id: 7, provider: 'google', provider_user_id: 'g-bob' }),
    );
  });

  it('refuses an anonymous sign-in when the provider email is unverified', async () => {
    const res = await resolveOAuthIdentity({
      persistence: mock.api,
      provider: 'google',
      profile: { providerUserId: 'g-evil', email: 'victim@x.com', emailVerified: false },
      makePlaceholderPasswordHash: placeholderHash,
    });

    expect(res.action).toBe('refused_unverified');
    expect(mock.identities).toHaveLength(0);
  });

  it('never silently merges: a verified email matching an existing account requires login', async () => {
    mock.users.set(3, { id: 3, username: 'carol', email: 'carol@x.com' });

    const res = await resolveOAuthIdentity({
      persistence: mock.api,
      provider: 'google',
      profile: { providerUserId: 'g-carol', email: 'carol@x.com', emailVerified: true },
      makePlaceholderPasswordHash: placeholderHash,
    });

    expect(res.action).toBe('link_requires_login');
    expect(res.email).toBe('carol@x.com');
    // Crucially, no identity was attached to the existing account.
    expect(mock.identities).toHaveLength(0);
  });

  it('creates a passwordless account for a brand-new verified email', async () => {
    const res = await resolveOAuthIdentity({
      persistence: mock.api,
      provider: 'google',
      profile: { providerUserId: 'g-new', email: 'dave@newdomain.com', emailVerified: true },
      makePlaceholderPasswordHash: placeholderHash,
    });

    expect(res.action).toBe('created');
    expect(res.user.email).toBe('dave@newdomain.com');
    expect(res.user.username).toBe('dave'); // derived from the email local-part
    expect(mock.identities).toContainEqual(
      expect.objectContaining({ provider: 'google', provider_user_id: 'g-new', email_verified: 1 }),
    );
  });
});
