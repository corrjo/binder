import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { DirtyRepositoryError, CloneError, GitError } from '../../../../src/utils/errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockFn = jest.Mock<any>;

// Mock simple-git
const mockStatus: MockFn = jest.fn();
const mockCheckout: MockFn = jest.fn();
const mockClone: MockFn = jest.fn();
const mockBranch: MockFn = jest.fn();
const mockFetch: MockFn = jest.fn();
const mockPull: MockFn = jest.fn();

jest.mock('simple-git', () => {
  return jest.fn(() => ({
    status: mockStatus,
    checkout: mockCheckout,
    clone: mockClone,
    branch: mockBranch,
    fetch: mockFetch,
    pull: mockPull,
  }));
});

// Mock fs-extra
const mockStat: MockFn = jest.fn();
jest.mock('fs-extra', () => ({
  stat: mockStat,
}));

import {
  isGitRepo,
  getRepoStatus,
  cloneRepository,
  checkoutBranch,
  getCurrentBranch,
  fetchRemote,
  pullUpdates,
  branchExists,
} from '../../../../src/core/git/operations';

describe('Git Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isGitRepo', () => {
    it('should return false for non-existent path', async () => {
      mockStat.mockRejectedValue(new Error('ENOENT'));

      const result = await isGitRepo('/some/path');
      expect(result).toBe(false);
      expect(mockStat).toHaveBeenCalledWith('/some/path/.git');
    });

    it('should return false when .git is not a directory', async () => {
      mockStat.mockResolvedValue({ isDirectory: () => false });

      const result = await isGitRepo('/some/path');
      expect(result).toBe(false);
    });

    it('should return true for git repository', async () => {
      mockStat.mockResolvedValue({ isDirectory: () => true });

      const result = await isGitRepo('/some/repo');
      expect(result).toBe(true);
      expect(mockStat).toHaveBeenCalledWith('/some/repo/.git');
    });
  });

  describe('getRepoStatus', () => {
    it('should return exists false for non-git directory', async () => {
      mockStat.mockRejectedValue(new Error('ENOENT'));

      const status = await getRepoStatus('/not/a/repo');
      expect(status).toEqual({
        exists: false,
        isDirty: false,
        currentBranch: null,
        hasUntracked: false,
        hasModified: false,
        hasStaged: false,
      });
    });

    it('should return clean status for repo with no changes', async () => {
      mockStat.mockResolvedValue({ isDirectory: () => true });
      mockStatus.mockResolvedValue({
        current: 'main',
        not_added: [],
        modified: [],
        deleted: [],
        staged: [],
        created: [],
        renamed: [],
      });

      const status = await getRepoStatus('/clean/repo');
      expect(status).toEqual({
        exists: true,
        isDirty: false,
        currentBranch: 'main',
        hasUntracked: false,
        hasModified: false,
        hasStaged: false,
      });
    });

    it('should detect untracked files', async () => {
      mockStat.mockResolvedValue({ isDirectory: () => true });
      mockStatus.mockResolvedValue({
        current: 'main',
        not_added: ['new-file.txt'],
        modified: [],
        deleted: [],
        staged: [],
        created: [],
        renamed: [],
      });

      const status = await getRepoStatus('/repo');
      expect(status.isDirty).toBe(true);
      expect(status.hasUntracked).toBe(true);
      expect(status.hasModified).toBe(false);
      expect(status.hasStaged).toBe(false);
    });

    it('should detect modified files', async () => {
      mockStat.mockResolvedValue({ isDirectory: () => true });
      mockStatus.mockResolvedValue({
        current: 'feature',
        not_added: [],
        modified: ['changed.ts'],
        deleted: [],
        staged: [],
        created: [],
        renamed: [],
      });

      const status = await getRepoStatus('/repo');
      expect(status.isDirty).toBe(true);
      expect(status.hasModified).toBe(true);
    });

    it('should detect deleted files as modified', async () => {
      mockStat.mockResolvedValue({ isDirectory: () => true });
      mockStatus.mockResolvedValue({
        current: 'main',
        not_added: [],
        modified: [],
        deleted: ['removed.ts'],
        staged: [],
        created: [],
        renamed: [],
      });

      const status = await getRepoStatus('/repo');
      expect(status.isDirty).toBe(true);
      expect(status.hasModified).toBe(true);
    });

    it('should detect staged files', async () => {
      mockStat.mockResolvedValue({ isDirectory: () => true });
      mockStatus.mockResolvedValue({
        current: 'main',
        not_added: [],
        modified: [],
        deleted: [],
        staged: ['ready.ts'],
        created: [],
        renamed: [],
      });

      const status = await getRepoStatus('/repo');
      expect(status.isDirty).toBe(true);
      expect(status.hasStaged).toBe(true);
    });

    it('should detect created files as staged', async () => {
      mockStat.mockResolvedValue({ isDirectory: () => true });
      mockStatus.mockResolvedValue({
        current: 'main',
        not_added: [],
        modified: [],
        deleted: [],
        staged: [],
        created: ['new.ts'],
        renamed: [],
      });

      const status = await getRepoStatus('/repo');
      expect(status.hasStaged).toBe(true);
    });

    it('should detect renamed files as staged', async () => {
      mockStat.mockResolvedValue({ isDirectory: () => true });
      mockStatus.mockResolvedValue({
        current: 'main',
        not_added: [],
        modified: [],
        deleted: [],
        staged: [],
        created: [],
        renamed: [{ from: 'old.ts', to: 'new.ts' }],
      });

      const status = await getRepoStatus('/repo');
      expect(status.hasStaged).toBe(true);
    });

    it('should handle git status errors gracefully', async () => {
      mockStat.mockResolvedValue({ isDirectory: () => true });
      mockStatus.mockRejectedValue(new Error('Git error'));

      const status = await getRepoStatus('/repo');
      expect(status.exists).toBe(true);
      expect(status.isDirty).toBe(false);
      expect(status.currentBranch).toBe(null);
    });

    it('should handle detached HEAD state', async () => {
      mockStat.mockResolvedValue({ isDirectory: () => true });
      mockStatus.mockResolvedValue({
        current: null,
        not_added: [],
        modified: [],
        deleted: [],
        staged: [],
        created: [],
        renamed: [],
      });

      const status = await getRepoStatus('/repo');
      expect(status.currentBranch).toBe(null);
    });
  });

  describe('getCurrentBranch', () => {
    it('should return current branch name', async () => {
      mockStatus.mockResolvedValue({ current: 'feature-branch' });

      const branch = await getCurrentBranch('/repo');
      expect(branch).toBe('feature-branch');
    });

    it('should return null for detached HEAD', async () => {
      mockStatus.mockResolvedValue({ current: null });

      const branch = await getCurrentBranch('/repo');
      expect(branch).toBe(null);
    });

    it('should return null on error', async () => {
      mockStatus.mockRejectedValue(new Error('Git error'));

      const branch = await getCurrentBranch('/repo');
      expect(branch).toBe(null);
    });
  });

  describe('checkoutBranch', () => {
    it('should skip checkout when already on target branch', async () => {
      mockStatus.mockResolvedValue({ current: 'main' });

      await checkoutBranch('/repo', 'main');
      expect(mockCheckout).not.toHaveBeenCalled();
    });

    it('should checkout branch when repo is clean', async () => {
      mockStat.mockResolvedValue({ isDirectory: () => true });
      mockStatus.mockResolvedValue({
        current: 'main',
        not_added: [],
        modified: [],
        deleted: [],
        staged: [],
        created: [],
        renamed: [],
      });
      mockCheckout.mockResolvedValue(undefined);

      await checkoutBranch('/repo', 'feature');
      expect(mockCheckout).toHaveBeenCalledWith('feature');
    });

    it('should throw DirtyRepositoryError when repo has uncommitted changes', async () => {
      mockStat.mockResolvedValue({ isDirectory: () => true });
      mockStatus.mockResolvedValue({
        current: 'main',
        not_added: ['dirty.txt'],
        modified: [],
        deleted: [],
        staged: [],
        created: [],
        renamed: [],
      });

      await expect(checkoutBranch('/repo', 'feature', 'my-repo')).rejects.toThrow(
        DirtyRepositoryError
      );
      expect(mockCheckout).not.toHaveBeenCalled();
    });

    it('should throw GitError when checkout fails', async () => {
      mockStat.mockResolvedValue({ isDirectory: () => true });
      mockStatus.mockResolvedValue({
        current: 'main',
        not_added: [],
        modified: [],
        deleted: [],
        staged: [],
        created: [],
        renamed: [],
      });
      mockCheckout.mockRejectedValue(new Error('Branch not found'));

      await expect(checkoutBranch('/repo', 'nonexistent')).rejects.toThrow(GitError);
    });
  });

  describe('cloneRepository', () => {
    it('should clone repository successfully', async () => {
      mockClone.mockResolvedValue(undefined);

      await cloneRepository('https://github.com/org/repo.git', '/dest/path');
      expect(mockClone).toHaveBeenCalledWith(
        'https://github.com/org/repo.git',
        '/dest/path',
        []
      );
    });

    it('should pass depth option for shallow clone', async () => {
      mockClone.mockResolvedValue(undefined);

      await cloneRepository('https://github.com/org/repo.git', '/dest', { depth: 1 });
      expect(mockClone).toHaveBeenCalledWith(
        'https://github.com/org/repo.git',
        '/dest',
        ['--depth', '1']
      );
    });

    it('should pass branch option', async () => {
      mockClone.mockResolvedValue(undefined);

      await cloneRepository('https://github.com/org/repo.git', '/dest', { branch: 'develop' });
      expect(mockClone).toHaveBeenCalledWith(
        'https://github.com/org/repo.git',
        '/dest',
        ['--branch', 'develop']
      );
    });

    it('should pass both depth and branch options', async () => {
      mockClone.mockResolvedValue(undefined);

      await cloneRepository('https://github.com/org/repo.git', '/dest', {
        depth: 1,
        branch: 'main',
      });
      expect(mockClone).toHaveBeenCalledWith(
        'https://github.com/org/repo.git',
        '/dest',
        ['--depth', '1', '--branch', 'main']
      );
    });

    it('should throw CloneError on failure', async () => {
      mockClone.mockRejectedValue(new Error('Repository not found'));

      await expect(
        cloneRepository('https://github.com/org/nonexistent.git', '/dest')
      ).rejects.toThrow(CloneError);
    });
  });

  describe('fetchRemote', () => {
    it('should fetch successfully', async () => {
      mockFetch.mockResolvedValue(undefined);

      await fetchRemote('/repo');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should throw GitError on failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(fetchRemote('/repo')).rejects.toThrow(GitError);
    });
  });

  describe('pullUpdates', () => {
    it('should pull when repo is clean', async () => {
      mockStat.mockResolvedValue({ isDirectory: () => true });
      mockStatus.mockResolvedValue({
        current: 'main',
        not_added: [],
        modified: [],
        deleted: [],
        staged: [],
        created: [],
        renamed: [],
      });
      mockPull.mockResolvedValue(undefined);

      await pullUpdates('/repo');
      expect(mockPull).toHaveBeenCalled();
    });

    it('should throw DirtyRepositoryError when repo is dirty', async () => {
      mockStat.mockResolvedValue({ isDirectory: () => true });
      mockStatus.mockResolvedValue({
        current: 'main',
        not_added: [],
        modified: ['dirty.ts'],
        deleted: [],
        staged: [],
        created: [],
        renamed: [],
      });

      await expect(pullUpdates('/repo', 'my-repo')).rejects.toThrow(DirtyRepositoryError);
      expect(mockPull).not.toHaveBeenCalled();
    });

    it('should throw GitError on pull failure', async () => {
      mockStat.mockResolvedValue({ isDirectory: () => true });
      mockStatus.mockResolvedValue({
        current: 'main',
        not_added: [],
        modified: [],
        deleted: [],
        staged: [],
        created: [],
        renamed: [],
      });
      mockPull.mockRejectedValue(new Error('Merge conflict'));

      await expect(pullUpdates('/repo')).rejects.toThrow(GitError);
    });
  });

  describe('branchExists', () => {
    it('should return true for existing local branch', async () => {
      mockBranch.mockResolvedValue({
        all: ['main', 'feature', 'develop'],
      });

      const exists = await branchExists('/repo', 'feature');
      expect(exists).toBe(true);
    });

    it('should return true for existing remote branch', async () => {
      mockBranch.mockResolvedValue({
        all: ['main', 'remotes/origin/feature'],
      });

      const exists = await branchExists('/repo', 'feature');
      expect(exists).toBe(true);
    });

    it('should return true for origin prefixed remote branch', async () => {
      mockBranch.mockResolvedValue({
        all: ['main', 'origin/feature'],
      });

      const exists = await branchExists('/repo', 'feature');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent branch', async () => {
      mockBranch.mockResolvedValue({
        all: ['main', 'develop'],
      });

      const exists = await branchExists('/repo', 'nonexistent');
      expect(exists).toBe(false);
    });

    it('should return false on error', async () => {
      mockBranch.mockRejectedValue(new Error('Git error'));

      const exists = await branchExists('/repo', 'feature');
      expect(exists).toBe(false);
    });
  });
});
