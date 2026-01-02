# Binder

A lightweight CLI tool to orchestrate "Virtual Monoliths" from distributed repositories and define semantic boundaries for AI agents.

## What is Binder?

Binder helps you work across multiple repositories by defining clear scopes and permissions for AI-assisted development. Instead of manually managing repo clones and context, define your workspace topology once and let binder handle the rest.

## Quick Start

```bash
# Initialize a new workspace
binder init

# Set up repositories and generate context map
binder up

# Clean up removed repositories
binder clean
```

## Core Concepts

### Scopes

- **OWNER** - Full read/write access. Your primary workspace.
- **PLATFORM** - Guest contributor. Read fully, edit conservatively.
- **REFERENCE** - Read-only. For validation and historical context.

### Workflow

1. Define your multi-repo workspace in `binder.yaml`
2. Run `binder up` to clone repos and generate `CONTEXT_MAP.md`
3. Use `CONTEXT_MAP.md` in your AI system prompts or `.cursorrules`
4. Work across repositories with clear boundaries

## Philosophy

**Topology vs. Task** - Binder separates workspace definition from feature implementation:

- **Binder's job**: "Here are the repos. You own these, you're a guest here, read-only there."
- **Your job**: "We are building Feature X. Please implement Y."

This separation allows AI agents to understand their permissions and responsibilities across your distributed codebase.
