# Contributing to Binder

Thanks for your interest in contributing to Binder! This document outlines the development workflow, coding standards, and release process.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/corrjo/binder.git
cd binder

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Link globally for local testing
npm link
```

## Development Workflow

### Running Locally

```bash
# Run CLI in development mode (uses ts-node)
npm run dev -- <command>

# Run built CLI
npm run binder -- <command>

# Examples
npm run dev -- init
npm run dev -- status
npm run binder -- --help
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Code Quality

```bash
# Check linting and formatting
npm run lint

# Fix linting and formatting issues
npm run lint:fix
```

### Building

```bash
# Build TypeScript to JavaScript
npm run build

# Build distributable package
npm run package
```

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable releases only |
| `feature/*` | New features |
| `fix/*` | Bug fixes |
| `prerelease/*` | Prerelease testing (auto-publishes) |

### Standard Development Flow

1. Create a feature branch from `main`:
   ```bash
   git checkout main
   git pull
   git checkout -b feature/my-feature
   ```

2. Make changes and commit:
   ```bash
   git add .
   git commit -m "Add my feature"
   ```

3. Push and create a Pull Request to `main`:
   ```bash
   git push origin feature/my-feature
   # Create PR via GitHub UI or CLI
   ```

4. CI runs automatically on the PR (lint, test, build)

5. After review and approval, merge to `main`

## Release Process

### Stable Releases

Stable versions are automatically published when changes are merged to `main`. Version bumps are determined by commit messages using [Conventional Commits](https://www.conventionalcommits.org/).

Simply merge your PR to `main` and semantic-release will:
1. Analyze commits to determine version bump
2. Update `package.json` and `CHANGELOG.md`
3. Create a GitHub Release
4. Publish to npm

**No manual version bumping required!**

### Prerelease Versions

Prereleases are automatically published when pushing to `prerelease/*` branches.

1. Create a prerelease branch:
   ```bash
   git checkout -b prerelease/my-feature
   ```

2. Push to trigger the prerelease:
   ```bash
   git push origin prerelease/my-feature
   ```

3. The `prerelease.yml` workflow automatically:
   - Runs tests
   - Generates version: `0.1.0-pre.YYYYMMDD.abc1234`
   - Publishes with `@next` tag

4. Install the prerelease:
   ```bash
   npm install -g binder-cli@next
   ```

## Installing from npm

```bash
# Latest stable release
npm install -g binder-cli

# Latest prerelease
npm install -g binder-cli@next

# Specific version
npm install -g binder-cli@1.1.0
```

No authentication required - the package is public on npm.

## Code Style

- **TypeScript** with strict mode enabled
- **Prettier** for formatting (2 spaces, single quotes, trailing commas)
- **ESLint** for linting
- **Jest** for testing

### Commit Messages (Conventional Commits)

We use [Conventional Commits](https://www.conventionalcommits.org/) for automatic versioning:

| Type | Description | Version Bump |
|------|-------------|--------------|
| `fix:` | Bug fix | PATCH (0.0.x) |
| `feat:` | New feature | MINOR (0.x.0) |
| `feat!:` | Breaking change | MAJOR (x.0.0) |
| `docs:` | Documentation only | No release |
| `chore:` | Maintenance | No release |
| `refactor:` | Code refactoring | No release |
| `test:` | Adding tests | No release |

**Examples:**
```
fix: handle dirty repo error correctly
feat: add dry-run mode to pull command
feat!: rename binder.yaml to workspace.yaml
docs: update README with examples
chore: update dependencies
refactor: simplify orchestrator logic
test: add integration tests for status command
```

**Breaking changes** can also use a footer:
```
feat: change config format

BREAKING CHANGE: repos field renamed to repositories
```

## Project Structure

```
src/
├── commands/           # CLI command handlers
│   ├── init.ts
│   ├── pull.ts
│   ├── context.ts
│   └── status.ts
├── core/
│   ├── config/         # YAML parsing + Zod validation
│   ├── git/            # Git operations
│   ├── generator/      # CONTEXT_MAP.md generation
│   └── workspace/      # Orchestrator + status
├── utils/              # Shared utilities
├── cli.ts              # Commander.js entry point
└── index.ts            # Programmatic API exports

tests/
├── unit/               # Unit tests
├── integration/        # Integration tests
└── fixtures/           # Test data

templates/              # Template files
```

## Questions?

Open an issue on GitHub if you have questions or run into problems.
