import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs-extra';
import { DirtyRepositoryError, CloneError, GitError } from '../../utils/errors';
import { debug } from '../../utils/logger';

/**
 * Repository status information
 */
export interface RepoStatus {
  exists: boolean;
  isDirty: boolean;
  currentBranch: string | null;
  hasUntracked: boolean;
  hasModified: boolean;
  hasStaged: boolean;
}

/**
 * Clone options
 */
export interface CloneOptions {
  depth?: number;
  branch?: string;
}

/**
 * Check if a path is a git repository
 */
export async function isGitRepo(repoPath: string): Promise<boolean> {
  const gitDir = path.join(repoPath, '.git');
  try {
    const stat = await fs.stat(gitDir);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Get the status of a git repository
 */
export async function getRepoStatus(repoPath: string): Promise<RepoStatus> {
  const exists = await isGitRepo(repoPath);
  if (!exists) {
    return {
      exists: false,
      isDirty: false,
      currentBranch: null,
      hasUntracked: false,
      hasModified: false,
      hasStaged: false,
    };
  }

  const git = simpleGit(repoPath);

  try {
    const status = await git.status();
    const hasUntracked = status.not_added.length > 0;
    const hasModified = status.modified.length > 0 || status.deleted.length > 0;
    const hasStaged =
      status.staged.length > 0 ||
      status.created.length > 0 ||
      status.renamed.length > 0;

    return {
      exists: true,
      isDirty: hasUntracked || hasModified || hasStaged,
      currentBranch: status.current || null,
      hasUntracked,
      hasModified,
      hasStaged,
    };
  } catch (error) {
    debug(`Error getting status for ${repoPath}: ${error}`);
    return {
      exists: true,
      isDirty: false,
      currentBranch: null,
      hasUntracked: false,
      hasModified: false,
      hasStaged: false,
    };
  }
}

/**
 * Get the current branch name of a repository
 */
export async function getCurrentBranch(repoPath: string): Promise<string | null> {
  const git = simpleGit(repoPath);
  try {
    const status = await git.status();
    return status.current || null;
  } catch {
    return null;
  }
}

/**
 * Checkout a branch in a repository
 * Throws DirtyRepositoryError if repo has uncommitted changes
 */
export async function checkoutBranch(
  repoPath: string,
  branchName: string,
  repoName?: string
): Promise<void> {
  const git = simpleGit(repoPath);

  // Check current branch first
  const currentBranch = await getCurrentBranch(repoPath);
  if (currentBranch === branchName) {
    debug(`Already on branch ${branchName}`);
    return;
  }

  // Check if repo is dirty
  const status = await getRepoStatus(repoPath);
  if (status.isDirty) {
    throw new DirtyRepositoryError(repoName || path.basename(repoPath));
  }

  try {
    // Try to checkout the branch
    await git.checkout(branchName);
    debug(`Checked out branch ${branchName}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new GitError(`Failed to checkout branch ${branchName}: ${message}`, repoName);
  }
}

/**
 * Clone a repository to a destination path
 */
export async function cloneRepository(
  url: string,
  destPath: string,
  options?: CloneOptions
): Promise<void> {
  const git: SimpleGit = simpleGit({
    baseDir: process.cwd(),
    binary: 'git',
    maxConcurrentProcesses: 6,
  });
  const cloneArgs: string[] = [];

  if (options?.depth) {
    cloneArgs.push('--depth', options.depth.toString());
  }

  if (options?.branch) {
    cloneArgs.push('--branch', options.branch);
  }

  try {
    debug(`Cloning ${url} to ${destPath}`);
    await git.clone(url, destPath, cloneArgs);
    debug(`Successfully cloned ${url}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new CloneError(url, message);
  }
}

/**
 * Fetch updates from remote
 */
export async function fetchRemote(repoPath: string): Promise<void> {
  const git = simpleGit(repoPath);
  try {
    await git.fetch();
    debug(`Fetched updates for ${repoPath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new GitError(`Failed to fetch: ${message}`);
  }
}

/**
 * Pull updates from remote
 */
export async function pullUpdates(repoPath: string, repoName?: string): Promise<void> {
  const git = simpleGit(repoPath);

  // Check if repo is dirty first
  const status = await getRepoStatus(repoPath);
  if (status.isDirty) {
    throw new DirtyRepositoryError(repoName || path.basename(repoPath));
  }

  try {
    await git.pull();
    debug(`Pulled updates for ${repoPath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new GitError(`Failed to pull: ${message}`, repoName);
  }
}

/**
 * Check if a branch exists (locally or remotely)
 */
export async function branchExists(repoPath: string, branchName: string): Promise<boolean> {
  const git = simpleGit(repoPath);
  try {
    const branches = await git.branch(['-a']);
    const allBranches = [...branches.all];
    return allBranches.some(
      (b) =>
        b === branchName ||
        b === `remotes/origin/${branchName}` ||
        b === `origin/${branchName}`
    );
  } catch {
    return false;
  }
}
