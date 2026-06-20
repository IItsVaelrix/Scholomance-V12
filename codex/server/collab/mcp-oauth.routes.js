import crypto from 'node:crypto';
import { collabPersistence } from './collab.persistence.js';
import { generateAgentKey } from './collab.agent-auth.js';

const AUTH_CODE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_ACCESS_TOKEN_DAYS = 30;
const DEFAULT_SCOPES = ['mcp:collab', 'collab'];
const DEFAULT_CLIENTS = Object.freeze({
    'grok-backend': {
        id: 'grok-backend',
        name: 'Grok Backend',
        role: 'backend',
        capabilities: ['grok', 'mcp', 'collab'],
    },
});

const authorizationCodes = new Map();

function parsePositiveIntEnv(name, fallback) {
    const raw = process.env[name];
    if (raw === undefined || raw === '') return fallback;
    const parsed = Number.parseInt(raw, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function trimTrailingSlash(value) {
    return String(value || '').replace(/\/+$/, '');
}

function getRequestBaseUrl(request, configuredBaseUrl) {
    const configured = trimTrailingSlash(configuredBaseUrl || process.env.PUBLIC_SERVER_URL || process.env.VITE_API_BASE_URL);
    if (configured) return configured;

    const proto = request.headers['x-forwarded-proto'] || request.protocol || 'http';
    const host = request.headers['x-forwarded-host'] || request.headers.host;
    return `${proto}://${host}`;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function installFormParser(fastify) {
    try {
        fastify.addContentTypeParser(
            'application/x-www-form-urlencoded',
            { parseAs: 'string', bodyLimit: 20_000 },
            (_request, body, done) => {
                try {
                    done(null, Object.fromEntries(new URLSearchParams(body)));
                } catch (error) {
                    done(error);
                }
            },
        );
    } catch (error) {
        if (!String(error?.message || '').includes('already present')) {
            throw error;
        }
    }
}

function parseConfiguredClients() {
    const clients = new Map(Object.entries(DEFAULT_CLIENTS));
    const raw = process.env.MCP_OAUTH_CLIENTS;
    if (!raw) return clients;

    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            for (const id of parsed) {
                if (typeof id === 'string' && id.trim()) {
                    clients.set(id.trim(), normalizeClient({ id: id.trim() }));
                }
            }
            return clients;
        }

        if (parsed && typeof parsed === 'object') {
            for (const [id, value] of Object.entries(parsed)) {
                clients.set(id, normalizeClient({ id, ...(value || {}) }));
            }
            return clients;
        }
    } catch {
        for (const id of raw.split(',').map((part) => part.trim()).filter(Boolean)) {
            clients.set(id, normalizeClient({ id }));
        }
    }

    return clients;
}

function normalizeClient(client) {
    const id = String(client.id || '').trim();
    const role = ['ui', 'backend', 'qa'].includes(client.role) ? client.role : inferRole(id);
    const name = typeof client.name === 'string' && client.name.trim()
        ? client.name.trim()
        : id.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
    const capabilities = Array.isArray(client.capabilities) && client.capabilities.length > 0
        ? client.capabilities.map(String)
        : ['mcp', 'collab'];

    return { id, name, role, capabilities };
}

function inferRole(clientId) {
    if (clientId.includes('qa')) return 'qa';
    if (clientId.includes('ui')) return 'ui';
    return 'backend';
}

async function resolveClient(clientId) {
    const id = String(clientId || '').trim();
    if (!id) return null;

    const configured = parseConfiguredClients().get(id);
    if (configured) return configured;

    const allowExisting = process.env.MCP_OAUTH_ALLOW_EXISTING_AGENTS === 'true';
    if (!allowExisting) return null;

    const existing = await collabPersistence.agents.getById(id);
    if (!existing) return null;

    return {
        id: existing.id,
        name: existing.name,
        role: existing.role,
        capabilities: existing.capabilities || ['mcp', 'collab'],
    };
}

async function ensureAgentRegistered(client) {
    const existing = await collabPersistence.agents.getById(client.id);
    if (existing) return existing;

    return collabPersistence.agents.register({
        id: client.id,
        name: client.name,
        role: client.role,
        capabilities: client.capabilities,
        framework_origin: 'mcp-oauth',
    });
}

function normalizeScopes(rawScope) {
    const requested = String(rawScope || '').trim().split(/\s+/).filter(Boolean);
    return requested.length > 0 ? requested : ['mcp:collab'];
}

function getAllowedScopes() {
    const configured = String(process.env.MCP_OAUTH_SCOPES || '').trim().split(/\s+/).filter(Boolean);
    return new Set(configured.length > 0 ? configured : DEFAULT_SCOPES);
}

function validateScopes(scopes) {
    const allowed = getAllowedScopes();
    return scopes.every((scope) => allowed.has(scope));
}

function isSessionApproverAllowed(sessionUser) {
    const allowed = String(process.env.MCP_OAUTH_APPROVER_USERS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    if (allowed.length === 0) return true;

    const identifiers = new Set([
        String(sessionUser?.id || ''),
        String(sessionUser?.username || ''),
        String(sessionUser?.email || ''),
    ].filter(Boolean));

    return allowed.some((value) => identifiers.has(value));
}

function isRedirectUriAllowed(rawRedirectUri) {
    if (!rawRedirectUri || typeof rawRedirectUri !== 'string') return false;

    let parsed;
    try {
        parsed = new URL(rawRedirectUri);
    } catch {
        return false;
    }

    const allowedOrigins = String(process.env.MCP_OAUTH_ALLOWED_REDIRECT_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    if (allowedOrigins.length > 0) {
        return allowedOrigins.includes(parsed.origin);
    }

    if (parsed.protocol === 'https:') return true;

    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    return parsed.protocol === 'http:' && isLocalhost && process.env.NODE_ENV !== 'production';
}

function createAuthorizationCode(record) {
    pruneExpiredCodes();

    const code = crypto.randomBytes(32).toString('base64url');
    authorizationCodes.set(code, {
        ...record,
        expiresAt: Date.now() + AUTH_CODE_TTL_MS,
    });
    return code;
}

function consumeAuthorizationCode(code) {
    const record = authorizationCodes.get(code);
    authorizationCodes.delete(code);

    if (!record || record.expiresAt < Date.now()) return null;
    return record;
}

function pruneExpiredCodes() {
    const now = Date.now();
    for (const [code, record] of authorizationCodes.entries()) {
        if (record.expiresAt < now) {
            authorizationCodes.delete(code);
        }
    }
}

function pkceS256(codeVerifier) {
    return crypto.createHash('sha256').update(String(codeVerifier)).digest('base64url');
}

function timingSafeStringEqual(a, b) {
    const left = Buffer.from(String(a));
    const right = Buffer.from(String(b));
    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
}

function oauthError(reply, statusCode, error, description) {
    return reply.code(statusCode).send({
        error,
        error_description: description,
    });
}

function sendLoginRequired(reply, clientId) {
    reply.code(401).type('text/html; charset=utf-8');
    return `<!doctype html>
<html>
  <head><title>Scholomance MCP Authorization Required</title></head>
  <body>
    <main>
      <h1>Scholomance MCP Authorization Required</h1>
      <p>Log in to Scholomance in this browser, then retry the connector authorization for ${escapeHtml(clientId)}.</p>
    </main>
  </body>
</html>`;
}

function buildMetadata(request, configuredBaseUrl) {
    const baseUrl = getRequestBaseUrl(request, configuredBaseUrl);
    return {
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/mcp/oauth/authorize`,
        token_endpoint: `${baseUrl}/mcp/oauth/token`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['none'],
        scopes_supported: Array.from(getAllowedScopes()),
    };
}

export async function collabMcpOAuthRoutes(fastify, options = {}) {
    installFormParser(fastify);

    const requireSession = options.requireSession ?? process.env.MCP_OAUTH_REQUIRE_SESSION !== 'false';
    const configuredBaseUrl = options.serverBaseUrl;

    fastify.get('/.well-known/oauth-authorization-server', async (request) => {
        return buildMetadata(request, configuredBaseUrl);
    });

    fastify.get('/.well-known/oauth-protected-resource', async (request) => {
        const baseUrl = getRequestBaseUrl(request, configuredBaseUrl);
        return {
            resource: `${baseUrl}/mcp`,
            authorization_servers: [baseUrl],
            scopes_supported: Array.from(getAllowedScopes()),
        };
    });

    fastify.get('/.well-known/oauth-protected-resource/mcp', async (request) => {
        const baseUrl = getRequestBaseUrl(request, configuredBaseUrl);
        return {
            resource: `${baseUrl}/mcp`,
            authorization_servers: [baseUrl],
            scopes_supported: Array.from(getAllowedScopes()),
        };
    });

    fastify.get('/mcp/oauth/authorize', async (request, reply) => {
        const query = request.query || {};
        const clientId = String(query.client_id || '').trim();
        const redirectUri = String(query.redirect_uri || '').trim();
        const state = query.state ? String(query.state) : null;
        const scopes = normalizeScopes(query.scope);

        if (requireSession && !request.session?.user) {
            return sendLoginRequired(reply, clientId || 'unknown client');
        }

        if (requireSession && !isSessionApproverAllowed(request.session?.user)) {
            return oauthError(reply, 403, 'access_denied', 'This Scholomance session may not authorize MCP connectors.');
        }

        if (query.response_type !== 'code') {
            return oauthError(reply, 400, 'unsupported_response_type', 'Only authorization code flow is supported.');
        }

        if (!isRedirectUriAllowed(redirectUri)) {
            return oauthError(reply, 400, 'invalid_request', 'redirect_uri must be an allowed HTTPS URL.');
        }

        if (query.code_challenge_method !== 'S256' || !query.code_challenge) {
            return oauthError(reply, 400, 'invalid_request', 'PKCE S256 code_challenge is required.');
        }

        const client = await resolveClient(clientId);
        if (!client) {
            return oauthError(reply, 400, 'unauthorized_client', 'Unknown MCP OAuth client.');
        }

        if (!validateScopes(scopes)) {
            return oauthError(reply, 400, 'invalid_scope', 'One or more requested scopes are not supported.');
        }

        await ensureAgentRegistered(client);

        const code = createAuthorizationCode({
            clientId: client.id,
            agentId: client.id,
            redirectUri,
            codeChallenge: String(query.code_challenge),
            scope: scopes.join(' '),
            userId: request.session?.user?.id || null,
        });

        const redirect = new URL(redirectUri);
        redirect.searchParams.set('code', code);
        if (state) redirect.searchParams.set('state', state);

        return reply.redirect(redirect.toString());
    });

    fastify.post('/mcp/oauth/token', async (request, reply) => {
        const body = request.body || {};

        if (body.grant_type !== 'authorization_code') {
            return oauthError(reply, 400, 'unsupported_grant_type', 'Only authorization_code is supported.');
        }

        const record = consumeAuthorizationCode(String(body.code || ''));
        if (!record) {
            return oauthError(reply, 400, 'invalid_grant', 'Authorization code is invalid or expired.');
        }

        if (String(body.client_id || '') !== record.clientId) {
            return oauthError(reply, 400, 'invalid_grant', 'client_id does not match authorization code.');
        }

        if (String(body.redirect_uri || '') !== record.redirectUri) {
            return oauthError(reply, 400, 'invalid_grant', 'redirect_uri does not match authorization code.');
        }

        const verifier = String(body.code_verifier || '');
        if (!verifier || !timingSafeStringEqual(pkceS256(verifier), record.codeChallenge)) {
            return oauthError(reply, 400, 'invalid_grant', 'PKCE verifier failed.');
        }

        const expiresInDays = parsePositiveIntEnv('MCP_OAUTH_ACCESS_TOKEN_DAYS', DEFAULT_ACCESS_TOKEN_DAYS);
        const token = await generateAgentKey({
            agentId: record.agentId,
            createdBy: `mcp-oauth:${record.clientId}`,
            expiresInDays,
        });

        return {
            access_token: token.plaintextKey,
            token_type: 'Bearer',
            expires_in: expiresInDays * 24 * 60 * 60,
            scope: record.scope,
        };
    });
}
