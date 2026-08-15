# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run build          # Compile TypeScript to dist/
npm run dev -- <cmd>   # Run CLI in dev mode (ts-node): npm run dev -- init
npm run binder -- <cmd> # Run compiled CLI: npm run binder -- status
npm test               # Run all tests
npm test -- --testPathPattern="parser"  # Run single test file
npm run test:watch     # Watch mode
npm run lint           # ESLint + Prettier check
npm run lint:fix       # ESLint + Prettier fix
npm run package        # Build + create .tgz
```

## Architecture

Binder is a CLI tool that manages multi-repo workspaces with scoped permissions for AI agents.

### Core Flow

1. **Config** (`src/core/config/`) - Zod schemas define `binder.yaml` structure. Types are inferred from schemas, not manually defined.

2. **Commands** (`src/commands/`) - Thin CLI handlers that delegate to core modules:
   - `init` - writes template to `binder.yaml`
   - `pull` - calls orchestrator
   - `context` - calls generator
   - `status` - calls workspace status

3. **Core Modules** (`src/core/`):
   - `workspace/orchestrator.ts` - idempotent git clone/checkout/pull logic
   - `workspace/status.ts` - analyzes repo state vs config
   - `generator/context-map.ts` - produces `CONTEXT_MAP.md`
   - `git/operations.ts` - wraps `simple-git` library

4. **CLI Entry** (`src/cli.ts`) - Commander.js setup, routes to commands

### Key Patterns

- **Zod for validation**: Config types are `z.infer<typeof Schema>`, not separate interfaces
- **Scope system**: `owner` | `platform` | `reference` controls AI permissions
- **Idempotent operations**: `binder pull` is safe to run repeatedly
- **CommonJS**: Uses chalk@4 and ora@5 (not ESM versions) for Jest compatibility

### Testing

Tests live in `tests/unit/` mirroring `src/` structure. Core modules have TDD-style tests; commands are tested via integration. Use mocks for external dependencies (e.g., `simple-git`, `fs-extra`) to keep tests fast and CI-friendly.

### Code Quality

Run before committing:

```bash
npm run lint:fix       # Fix ESLint + Prettier issues
npm test               # Ensure all tests pass
```

CI runs `npm run lint`, so issues will fail the build.

### Documentation

When changing commands, scripts, or workflows, update these files:
- `CLAUDE.md` - Build & Development Commands section
- `README.md` - Development section
- `CONTRIBUTING.md` - Setup and Code Quality sections
- `.github/workflows/ci.yml` - CI steps

## Scopes

The three scopes define AI agent permissions in generated `CONTEXT_MAP.md`:
- **owner**: Full refactoring authority
- **platform**: Read fully, minimal edits only
- **reference**: Read-only, no modifications
