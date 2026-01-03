import { z } from 'zod';

/**
 * Scope defines the level of access/permission for a repository
 * - owner: Full read/write access, full refactoring authority
 * - platform: Restricted contributor, minimal edits only
 * - reference: Read-only, used for validation and context
 */
export const ScopeSchema = z.enum(['owner', 'platform', 'reference']);

/**
 * Git URL validator that accepts both HTTPS and SSH URLs
 * Examples:
 * - https://github.com/org/repo.git
 * - git@github.com:org/repo.git
 * - ssh://git@github.com/org/repo.git
 */
const gitUrlSchema = z.string().refine(
  (url) => {
    // HTTPS URLs
    if (url.startsWith('https://') || url.startsWith('http://')) {
      return true;
    }
    // SSH URLs (git@host:path or ssh://)
    if (url.startsWith('git@') || url.startsWith('ssh://')) {
      return true;
    }
    // Git protocol
    if (url.startsWith('git://')) {
      return true;
    }
    return false;
  },
  { message: 'Invalid git URL. Must be HTTPS, SSH, or git protocol URL.' }
);

/**
 * Repository configuration schema
 */
export const RepositorySchema = z.object({
  /** Repository name (used for display and default path) */
  name: z.string().min(1, 'Repository name cannot be empty'),

  /** Git URL (HTTPS or SSH) */
  url: gitUrlSchema,

  /** Local path relative to workspace root (defaults to ./repos/{name}) */
  path: z.string().optional(),

  /** Access scope for this repository */
  scope: ScopeSchema,

  /** Branch to checkout (defaults to default branch) */
  branch: z.string().optional(),

  /** Notes about this repository (included in CONTEXT_MAP.md) */
  notes: z.string().optional(),

  /** Shallow clone depth (positive integer) */
  depth: z.number().int().positive().optional(),
});

/**
 * Root binder.yaml configuration schema
 */
export const BinderConfigSchema = z.object({
  /** Workspace name */
  name: z.string().min(1, 'Workspace name cannot be empty'),

  /** List of repositories in this workspace */
  repos: z.array(RepositorySchema).min(1, 'At least one repository is required'),
});

// TypeScript types inferred from schemas
export type Scope = z.infer<typeof ScopeSchema>;
export type Repository = z.infer<typeof RepositorySchema>;
export type BinderConfig = z.infer<typeof BinderConfigSchema>;
