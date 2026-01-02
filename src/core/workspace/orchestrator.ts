import type { BinderConfig, Repository } from '../config/types';
import {
  isGitRepo,
  cloneRepository,
  checkoutBranch,
  getCurrentBranch,
} from '../git/operations';
import { resolvePath, getDefaultRepoPath } from '../../utils/filesystem';
import { success, error, debug, spinner } from '../../utils/logger';
import type { Ora } from 'ora';

/**
 * Result of orchestrating a single repository
 */
export interface RepoOrchestrationResult {
  name: string;
  path: string;
  action: 'cloned' | 'checkout' | 'skipped' | 'up-to-date' | 'error';
  branch?: string;
  error?: string;
}

/**
 * Result of orchestrating all repositories
 */
export interface OrchestrationResult {
  success: boolean;
  repos: RepoOrchestrationResult[];
  cloned: number;
  checkedOut: number;
  skipped: number;
  errors: number;
}

/**
 * Get the resolved path for a repository
 */
function getRepoPath(repo: Repository, basePath: string): string {
  const repoPath = repo.path ?? getDefaultRepoPath(repo.name);
  return resolvePath(repoPath, basePath);
}

/**
 * Orchestrate a single repository
 */
async function orchestrateRepo(
  repo: Repository,
  basePath: string,
  spin: Ora
): Promise<RepoOrchestrationResult> {
  const repoPath = getRepoPath(repo, basePath);
  const result: RepoOrchestrationResult = {
    name: repo.name,
    path: repoPath,
    action: 'up-to-date',
  };

  try {
    const repoExists = await isGitRepo(repoPath);

    if (!repoExists) {
      // Clone the repository
      spin.text = `Cloning ${repo.name}...`;
      debug(`Cloning ${repo.url} to ${repoPath}`);

      await cloneRepository(repo.url, repoPath, {
        depth: repo.depth,
        branch: repo.branch,
      });

      result.action = 'cloned';
      result.branch = repo.branch ?? (await getCurrentBranch(repoPath)) ?? undefined;
      return result;
    }

    // Repository exists, check if we need to checkout a different branch
    if (repo.branch) {
      const currentBranch = await getCurrentBranch(repoPath);

      if (currentBranch !== repo.branch) {
        spin.text = `Checking out ${repo.branch} for ${repo.name}...`;
        debug(`Switching ${repo.name} from ${currentBranch} to ${repo.branch}`);

        await checkoutBranch(repoPath, repo.branch, repo.name);
        result.action = 'checkout';
        result.branch = repo.branch;
        return result;
      }
    }

    // Already on correct branch (or no branch specified)
    result.branch = (await getCurrentBranch(repoPath)) ?? undefined;
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    result.action = 'error';
    result.error = message;
    return result;
  }
}

/**
 * Orchestrate all repositories according to the configuration
 * This is the main entry point for the `binder pull` command
 */
export async function orchestrate(
  config: BinderConfig,
  basePath?: string
): Promise<OrchestrationResult> {
  const resolvedBasePath = basePath ?? process.cwd();
  const results: RepoOrchestrationResult[] = [];
  let cloned = 0;
  let checkedOut = 0;
  let skipped = 0;
  let errors = 0;

  const spin = spinner(`Orchestrating ${config.repos.length} repositories...`);
  spin.start();

  for (const repo of config.repos) {
    const result = await orchestrateRepo(repo, resolvedBasePath, spin);
    results.push(result);

    switch (result.action) {
      case 'cloned':
        cloned++;
        break;
      case 'checkout':
        checkedOut++;
        break;
      case 'skipped':
      case 'up-to-date':
        skipped++;
        break;
      case 'error':
        errors++;
        break;
    }
  }

  spin.stop();

  // Log results
  for (const result of results) {
    switch (result.action) {
      case 'cloned':
        success(`Cloned ${result.name}${result.branch ? ` (${result.branch})` : ''}`);
        break;
      case 'checkout':
        success(`Checked out ${result.branch} for ${result.name}`);
        break;
      case 'up-to-date':
        debug(`${result.name} is up to date`);
        break;
      case 'error':
        error(`Failed ${result.name}: ${result.error}`);
        break;
    }
  }

  return {
    success: errors === 0,
    repos: results,
    cloned,
    checkedOut,
    skipped,
    errors,
  };
}
