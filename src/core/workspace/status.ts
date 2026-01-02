import * as path from 'path';
import type { BinderConfig, Repository, Scope } from '../config/types';
import { isGitRepo, getRepoStatus } from '../git/operations';
import { resolvePath, exists, listDirectories, isDirectory } from '../../utils/filesystem';
import { getDefaultRepoPath } from '../../utils/filesystem';

/**
 * Status of a single repository
 */
export interface RepoStatusInfo {
  name: string;
  path: string;
  scope: Scope;
  exists: boolean;
  isGitRepo: boolean;
  isDirty: boolean;
  currentBranch: string | null;
  expectedBranch: string | null;
  branchMismatch: boolean;
  notes?: string;
}

/**
 * Orphaned repository (on disk but not in config)
 */
export interface OrphanedRepo {
  name: string;
  path: string;
}

/**
 * Complete workspace status
 */
export interface WorkspaceStatus {
  workspaceName: string;
  repos: RepoStatusInfo[];
  orphanedRepos: OrphanedRepo[];
  summary: {
    total: number;
    existing: number;
    missing: number;
    dirty: number;
    branchMismatches: number;
    orphaned: number;
  };
}

/**
 * Get the resolved path for a repository
 */
function getRepoPath(repo: Repository, basePath: string): string {
  const repoPath = repo.path ?? getDefaultRepoPath(repo.name);
  return resolvePath(repoPath, basePath);
}

/**
 * Get status for a single repository
 */
async function getRepoStatusInfo(
  repo: Repository,
  basePath: string
): Promise<RepoStatusInfo> {
  const repoPath = getRepoPath(repo, basePath);

  const pathExists = await exists(repoPath);
  const isRepo = pathExists ? await isGitRepo(repoPath) : false;

  if (!isRepo) {
    return {
      name: repo.name,
      path: repoPath,
      scope: repo.scope,
      exists: pathExists,
      isGitRepo: false,
      isDirty: false,
      currentBranch: null,
      expectedBranch: repo.branch ?? null,
      branchMismatch: false,
      notes: repo.notes,
    };
  }

  const status = await getRepoStatus(repoPath);
  const currentBranch = status.currentBranch;
  const expectedBranch = repo.branch ?? null;
  const branchMismatch = expectedBranch !== null && currentBranch !== expectedBranch;

  return {
    name: repo.name,
    path: repoPath,
    scope: repo.scope,
    exists: true,
    isGitRepo: true,
    isDirty: status.isDirty,
    currentBranch,
    expectedBranch,
    branchMismatch,
    notes: repo.notes,
  };
}

/**
 * Find directories that look like repos but aren't in the config
 */
async function findOrphanedRepos(
  config: BinderConfig,
  basePath: string
): Promise<OrphanedRepo[]> {
  const orphaned: OrphanedRepo[] = [];

  // Get all configured repo paths
  const configuredPaths = new Set(
    config.repos.map((repo) => getRepoPath(repo, basePath))
  );

  // Check the default repos directory
  const reposDir = resolvePath('./repos', basePath);
  if (await exists(reposDir) && await isDirectory(reposDir)) {
    const dirs = await listDirectories(reposDir);

    for (const dir of dirs) {
      const fullPath = path.join(reposDir, dir);
      if (await isGitRepo(fullPath) && !configuredPaths.has(fullPath)) {
        orphaned.push({
          name: dir,
          path: fullPath,
        });
      }
    }
  }

  return orphaned;
}

/**
 * Get complete workspace status
 * This is the main entry point for the `binder status` command
 */
export async function getWorkspaceStatus(
  config: BinderConfig,
  basePath?: string
): Promise<WorkspaceStatus> {
  const resolvedBasePath = basePath ?? process.cwd();

  // Get status for all configured repos
  const repoStatuses: RepoStatusInfo[] = [];
  for (const repo of config.repos) {
    const status = await getRepoStatusInfo(repo, resolvedBasePath);
    repoStatuses.push(status);
  }

  // Find orphaned repos
  const orphanedRepos = await findOrphanedRepos(config, resolvedBasePath);

  // Calculate summary
  const existing = repoStatuses.filter((r) => r.exists && r.isGitRepo).length;
  const missing = repoStatuses.filter((r) => !r.exists || !r.isGitRepo).length;
  const dirty = repoStatuses.filter((r) => r.isDirty).length;
  const branchMismatches = repoStatuses.filter((r) => r.branchMismatch).length;

  return {
    workspaceName: config.name,
    repos: repoStatuses,
    orphanedRepos,
    summary: {
      total: repoStatuses.length,
      existing,
      missing,
      dirty,
      branchMismatches,
      orphaned: orphanedRepos.length,
    },
  };
}
