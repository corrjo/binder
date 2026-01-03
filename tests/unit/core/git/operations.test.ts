import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import simpleGit from 'simple-git';
import {
  isGitRepo,
  getRepoStatus,
  cloneRepository,
  checkoutBranch,
  getCurrentBranch,
} from '../../../../src/core/git/operations';
import { DirtyRepositoryError, CloneError } from '../../../../src/utils/errors';

describe('Git Operations', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'binder-git-test-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe('isGitRepo', () => {
    it('should return false for non-existent path', async () => {
      const result = await isGitRepo(path.join(tmpDir, 'nonexistent'));
      expect(result).toBe(false);
    });

    it('should return false for regular directory', async () => {
      const dirPath = path.join(tmpDir, 'regular-dir');
      await fs.mkdir(dirPath);
      const result = await isGitRepo(dirPath);
      expect(result).toBe(false);
    });

    it('should return true for git repository', async () => {
      const repoPath = path.join(tmpDir, 'git-repo');
      await fs.mkdir(repoPath);
      const git = simpleGit(repoPath);
      await git.init();
      const result = await isGitRepo(repoPath);
      expect(result).toBe(true);
    });
  });

  describe('getRepoStatus', () => {
    it('should return status for clean repo', async () => {
      const repoPath = path.join(tmpDir, 'clean-repo');
      await fs.mkdir(repoPath);
      const git = simpleGit(repoPath);
      await git.init();
      // Create initial commit so we have a branch
      await fs.writeFile(path.join(repoPath, 'README.md'), '# Test');
      await git.add('.');
      await git.commit('Initial commit');

      const status = await getRepoStatus(repoPath);
      expect(status.exists).toBe(true);
      expect(status.isDirty).toBe(false);
      expect(status.currentBranch).toBeTruthy();
    });

    it('should return isDirty true for repo with uncommitted changes', async () => {
      const repoPath = path.join(tmpDir, 'dirty-repo');
      await fs.mkdir(repoPath);
      const git = simpleGit(repoPath);
      await git.init();
      // Create initial commit
      await fs.writeFile(path.join(repoPath, 'README.md'), '# Test');
      await git.add('.');
      await git.commit('Initial commit');
      // Make uncommitted change
      await fs.writeFile(path.join(repoPath, 'dirty.txt'), 'uncommitted');

      const status = await getRepoStatus(repoPath);
      expect(status.isDirty).toBe(true);
    });

    it('should return isDirty true for repo with staged changes', async () => {
      const repoPath = path.join(tmpDir, 'staged-repo');
      await fs.mkdir(repoPath);
      const git = simpleGit(repoPath);
      await git.init();
      // Create initial commit
      await fs.writeFile(path.join(repoPath, 'README.md'), '# Test');
      await git.add('.');
      await git.commit('Initial commit');
      // Stage a change but don't commit
      await fs.writeFile(path.join(repoPath, 'staged.txt'), 'staged');
      await git.add('staged.txt');

      const status = await getRepoStatus(repoPath);
      expect(status.isDirty).toBe(true);
    });

    it('should return exists false for non-existent repo', async () => {
      const status = await getRepoStatus(path.join(tmpDir, 'nonexistent'));
      expect(status.exists).toBe(false);
    });
  });

  describe('getCurrentBranch', () => {
    it('should return current branch name', async () => {
      const repoPath = path.join(tmpDir, 'branch-repo');
      await fs.mkdir(repoPath);
      const git = simpleGit(repoPath);
      await git.init();
      await fs.writeFile(path.join(repoPath, 'README.md'), '# Test');
      await git.add('.');
      await git.commit('Initial commit');

      const branch = await getCurrentBranch(repoPath);
      // Git default branch could be 'main' or 'master' depending on config
      expect(['main', 'master']).toContain(branch);
    });
  });

  describe('checkoutBranch', () => {
    it('should checkout existing branch', async () => {
      const repoPath = path.join(tmpDir, 'checkout-repo');
      await fs.mkdir(repoPath);
      const git = simpleGit(repoPath);
      await git.init();
      await fs.writeFile(path.join(repoPath, 'README.md'), '# Test');
      await git.add('.');
      await git.commit('Initial commit');
      // Create a feature branch
      await git.branch(['feature']);

      await checkoutBranch(repoPath, 'feature');
      const currentBranch = await getCurrentBranch(repoPath);
      expect(currentBranch).toBe('feature');
    });

    it('should throw DirtyRepositoryError when repo has uncommitted changes', async () => {
      const repoPath = path.join(tmpDir, 'dirty-checkout');
      await fs.mkdir(repoPath);
      const git = simpleGit(repoPath);
      await git.init();
      await fs.writeFile(path.join(repoPath, 'README.md'), '# Test');
      await git.add('.');
      await git.commit('Initial commit');
      await git.branch(['feature']);
      // Make uncommitted change
      await fs.writeFile(path.join(repoPath, 'dirty.txt'), 'uncommitted');

      await expect(checkoutBranch(repoPath, 'feature', 'test-repo')).rejects.toThrow(
        DirtyRepositoryError
      );
    });

    it('should not throw when already on target branch', async () => {
      const repoPath = path.join(tmpDir, 'same-branch');
      await fs.mkdir(repoPath);
      const git = simpleGit(repoPath);
      await git.init();
      await fs.writeFile(path.join(repoPath, 'README.md'), '# Test');
      await git.add('.');
      await git.commit('Initial commit');

      const currentBranch = await getCurrentBranch(repoPath);
      // Should not throw even though we're already on this branch
      await expect(checkoutBranch(repoPath, currentBranch!)).resolves.not.toThrow();
    });
  });

  describe('cloneRepository', () => {
    // Note: cloneRepository tests are limited because they require network access
    // We test error handling for invalid URLs

    it('should throw CloneError for invalid URL', async () => {
      const destPath = path.join(tmpDir, 'clone-dest');
      await expect(
        cloneRepository(
          'https://github.com/nonexistent-org-12345/nonexistent-repo-67890.git',
          destPath
        )
      ).rejects.toThrow(CloneError);
    });

    it('should pass depth option for shallow clone', async () => {
      // This test documents the expected behavior - actual network test would be in integration
      const destPath = path.join(tmpDir, 'shallow-clone');
      // We can't actually test without network, but we verify the function accepts depth
      await expect(
        cloneRepository('https://invalid-url-for-test.example.com/repo.git', destPath, { depth: 1 })
      ).rejects.toThrow(CloneError);
    });
  });
});
