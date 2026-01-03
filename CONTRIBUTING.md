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
# Lint code
npm run lint

# Fix lint issues
npm run lint:fix

# Check formatting
npm run format:check

# Format code
npm run format
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

Stable versions are published when a GitHub Release is created.

1. Update version in `package.json`:
   ```bash
   npm version patch  # 0.1.0 → 0.1.1
   npm version minor  # 0.1.0 → 0.2.0
   npm version major  # 0.1.0 → 1.0.0
   ```

2. Push the version commit and tag:
   ```bash
   git push origin main --tags
   ```

3. Create a GitHub Release from the tag (via UI or CLI):
   ```bash
   gh release create v0.1.1 --generate-notes
   ```

4. The `publish.yml` workflow automatically publishes to GitHub Packages

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
   - Generates version: `0.1.0-pre.20260102.abc1234`
   - Publishes with `@next` tag

4. Install the prerelease:
   ```bash
   npm install -g @corrjo/binder-cli@next
   ```

## Installing from GitHub Packages

### Authentication

Users need to authenticate with GitHub Packages once:

```bash
# Create a Personal Access Token (PAT) with `read:packages` scope
# Then login:
npm login --registry=https://npm.pkg.github.com --scope=@corrjo
```

### Installation

```bash
# Latest stable release
npm install -g @corrjo/binder-cli

# Latest prerelease
npm install -g @corrjo/binder-cli@next

# Specific version
npm install -g @corrjo/binder-cli@0.1.0
```

## Code Style

- **TypeScript** with strict mode enabled
- **Prettier** for formatting (2 spaces, single quotes, trailing commas)
- **ESLint** for linting
- **Jest** for testing

### Commit Messages

Use clear, descriptive commit messages:

```
Add context command for generating CONTEXT_MAP.md
Fix branch checkout when repo is dirty
Update README with installation instructions
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
