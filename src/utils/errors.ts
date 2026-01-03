/**
 * Base error class for all Binder errors
 */
export class BinderError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'BinderError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BinderError);
    }
  }
}

/**
 * Error thrown when git operations fail
 */
export class GitError extends BinderError {
  constructor(
    message: string,
    public readonly repoName?: string
  ) {
    super(message, 'GIT_ERROR');
    this.name = 'GitError';
  }
}

/**
 * Error thrown when a repository has uncommitted changes
 */
export class DirtyRepositoryError extends BinderError {
  constructor(public readonly repoName: string) {
    super(
      `Repository "${repoName}" has uncommitted changes. Commit or stash changes before switching branches.`,
      'DIRTY_REPOSITORY'
    );
    this.name = 'DirtyRepositoryError';
  }
}

/**
 * Error thrown when a branch doesn't exist
 */
export class BranchNotFoundError extends BinderError {
  constructor(
    public readonly branchName: string,
    public readonly repoName: string
  ) {
    super(`Branch "${branchName}" not found in repository "${repoName}".`, 'BRANCH_NOT_FOUND');
    this.name = 'BranchNotFoundError';
  }
}

/**
 * Error thrown when clone fails
 */
export class CloneError extends BinderError {
  constructor(
    public readonly repoUrl: string,
    public readonly reason: string
  ) {
    super(`Failed to clone ${repoUrl}: ${reason}`, 'CLONE_ERROR');
    this.name = 'CloneError';
  }
}

/**
 * Error thrown when file system operations fail
 */
export class FileSystemError extends BinderError {
  constructor(
    message: string,
    public readonly path: string
  ) {
    super(message, 'FILESYSTEM_ERROR');
    this.name = 'FileSystemError';
  }
}
