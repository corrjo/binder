/**
 * Content templates for AI rule file injection
 */

export type InjectionFormat = 'markdown';

/**
 * Generate the injected content for rule files
 */
export function getInjectionContent(format: InjectionFormat, contextMapPath: string): string {
  if (format === 'markdown') {
    return getMarkdownContent(contextMapPath);
  }
  // Default to markdown
  return getMarkdownContent(contextMapPath);
}

function getMarkdownContent(contextMapPath: string): string {
  return `## Binder Workspace Instructions

This is a multi-repository workspace managed by [Binder](https://github.com/corrjo/binder).

**IMPORTANT**: Before making changes, read \`${contextMapPath}\` to understand your permissions.

### Scope System

Repositories in this workspace have one of three scopes:

- **OWNER** (Full Authority): You have complete control. Refactor, restructure, and improve freely.
- **PLATFORM** (Restricted): Read fully, but make only minimal, well-justified changes.
- **REFERENCE** (Read-Only): Use for context only. Do not modify these repositories.

### Required Action

1. Read \`${contextMapPath}\` at the start of each session
2. Check the scope of any repository before making changes
3. Respect the boundaries defined for each repository`;
}
