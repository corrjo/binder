# Binder

A lightweight CLI tool to orchestrate "Virtual Monoliths" from distributed repositories and define semantic boundaries for AI agents.

**[Read the docs →](https://corrjo.github.io/binder-website/)**

## What is Binder?

Binder helps you work across multiple repositories by defining clear scopes and permissions for AI-assisted development. Instead of manually managing repo clones and context, define your workspace topology once and let Binder handle the rest.

## Installation

```bash
npm install -g binder-cli
```

## Quick Start

```bash
# Initialize a new workspace
binder init

# Edit binder.yaml to add your repositories...

# Clone/checkout repositories
binder pull

# Generate AI context map
binder context

# Check workspace status
binder status
```

## Commands

```
❯ binder -h
Usage: binder [options] [command]

Orchestrate Virtual Monoliths from distributed repositories

Options:
  -V, --version      output the version number
  -v, --verbose      Enable verbose output
  -h, --help         display help for command

Commands:
  init               Create a new binder.yaml configuration file
  pull               Clone missing repositories and checkout configured branches
  context [options]  Generate CONTEXT_MAP.md for AI agents
  status             Show workspace status (repos, branches, dirty state)
  help [command]     display help for command
```

### `binder init`

Creates a new `binder.yaml` configuration file with a commented template.

### `binder pull`

Clones missing repositories and checks out configured branches. This command is idempotent - safe to run multiple times.

### `binder context`

Generates `CONTEXT_MAP.md` - an AI-readable file that describes your workspace topology, scopes, and permissions. Use this in your AI system prompts or `.cursorrules`.

### `binder status`

Shows the current state of your workspace:
- Which repos exist vs missing
- Dirty repos (uncommitted changes)
- Branch mismatches
- Orphaned repos (on disk but not in config)

## Configuration

### binder.yaml

```yaml
name: my-workspace

repos:
  # OWNER - Full read/write access
  - name: my-service
    url: git@github.com:org/my-service.git
    scope: owner
    path: ./services/my-service  # optional
    branch: main                  # optional
    notes: "Core service"         # optional

  # PLATFORM - Guest contributor
  - name: shared-platform
    url: https://github.com/org/platform.git
    scope: platform
    notes: "Shared infrastructure - minimal changes only"

  # REFERENCE - Read only
  - name: legacy-api
    url: git@github.com:org/legacy-api.git
    scope: reference
    depth: 1  # shallow clone
    notes: "Reference only - historical context"
```

### Repository Options

| Option | Required | Description |
|--------|----------|-------------|
| `name` | Yes | Repository name (used for display and default path) |
| `url` | Yes | Git URL (HTTPS or SSH) |
| `scope` | Yes | Access level: `owner`, `platform`, or `reference` |
| `path` | No | Local path (defaults to `./repos/{name}`) |
| `branch` | No | Branch to checkout |
| `notes` | No | Context notes for AI agents |
| `depth` | No | Shallow clone depth |

## Core Concepts

### Scopes

- **OWNER** (green) - Full read/write access. Your primary workspace. AI can refactor freely.
- **PLATFORM** (yellow) - Guest contributor. Read fully, edit conservatively. AI should follow existing patterns.
- **REFERENCE** (red) - Read-only. For validation and historical context. AI should not suggest modifications.

### CONTEXT_MAP.md

The generated context map tells AI agents:
- Which repositories exist in your workspace
- What scope/permissions apply to each
- Specific instructions per scope
- Any notes you've provided

Example output:

```markdown
# WORKSPACE TOPOLOGY & SCOPE DEFINITIONS

**Workspace:** my-workspace

## 🟢 SCOPE: OWNER (Full Authority)

**Repositories:**
- `my-service` at `./services/my-service`

**Permissions:** Full read/write access
**Instructions:**
- You are responsible for architecture, implementation, and refactoring.
- Make changes freely to improve code quality and functionality.

## 🟡 SCOPE: PLATFORM (Restricted Contributor)

**Repositories:**
- `shared-platform` at `./repos/shared-platform`
  - *Shared infrastructure - minimal changes only*

**Permissions:** Limited write access
**Instructions:**
- Only make minimal changes when necessary to support OWNER scope.
- Strictly adhere to existing patterns and conventions.
```

## Philosophy

**Topology vs. Task** - Binder separates workspace definition from feature implementation:

- **Binder's job**: "Here are the repos. You own these, you're a guest here, read-only there."
- **Your job**: "We are building Feature X. Please implement Y."

This separation allows AI agents to understand their permissions and responsibilities across your distributed codebase without manual context management.

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev -- init

# Run tests
npm test

# Lint and format
npm run lint:fix

# Build
npm run build

# Link globally for testing
npm link
```

## License

MIT
