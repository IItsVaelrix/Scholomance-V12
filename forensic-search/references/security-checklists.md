# Forensic Security Checklists

Mandatory checks for security auditing and code sanitization.

## 1. Input Sanitization (Law 7)
- [ ] **Allow-List Validation**: Every new `req.body` or `req.query` field has a corresponding Zod schema or regex check.
- [ ] **Type Coercion**: Numeric fields are validated with `Number.isFinite()` and clamped.
- [ ] **Length Bounds**: String fields have strict `maxLength` constraints (e.g., 500 chars for designs, 50k for scrolls).

## 2. XSS & Injection Prevention
- [ ] **Raw HTML**: Search for `dangerouslySetInnerHTML`. Ensure it uses `sanitizeHTML()` or is derived from trusted Bytecode amplifiers.
- [ ] **Scripting Protocols**: Search for `javascript:`, `data:`, or `vbscript:` in URL-related fields.
- [ ] **Dynamic Selectors**: Ensure user-provided strings used in `document.querySelector` are escaped via `escapeCSSSelector()`.

## 3. Authentication & Authorization
- [ ] **IDOR Check**: Every resource lookup by `id` (scrolls, tasks) is scoped to the `req.user.id`.
- [ ] **Rate Limiting**: New routes are registered with appropriate Fastify rate limits.
- [ ] **Token Exposure**: Search for API keys, secrets, or raw passwords in logs or `.env.example`.

## 4. Dangerous Sink Patterns
- [ ] **Eval Usage**: Search for `eval()`, `new Function()`, `setTimeout(string)`, `setInterval(string)`. **ZERO TOLERANCE.**
- [ ] **Non-Literal FS**: Search for `fs.readFileSync(someVar)` where `someVar` is user-controlled.
- [ ] **Regex Injection**: Ensure dynamic regexes are not built from unescaped user strings.
