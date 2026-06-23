# Mother Codebase Instructions

This config is loaded when opencode is launched from within `divtube_downloader/`.
The workspace root is this directory, but the actual project root is one level up.

## Project root location

The full Scholomance codebase lives at `..` (the parent directory).
Absolute path: `/home/deck/Downloads/Scholomance-V12-main/`
Use the `@codebase_root` reference or paths prefixed with `../` to access:

- `../opencode.json` — Main opencode config (MCP servers, etc.)
- `../docs/` — Documentation and world law
- `../codex/` — Server and collab code
- `../src/` — Application source
- `../AGENTS.md` — Agent contract

## Working patterns

1. When asked about the codebase, look in `../` first — that is the project root.
2. Read/write operations should use the full path from the project root when needed.
3. The divtube_downloader module is part of the larger Scholomance project; treat it as a submodule.
4. Reference `@codebase_root` in chat to explicitly scope the agent to the full project.
