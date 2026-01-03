import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockFn = jest.Mock<any>;

// Mock git operations
const mockIsGitRepo: MockFn = jest.fn();
const mockCloneRepository: MockFn = jest.fn();
const mockCheckoutBranch: MockFn = jest.fn();
const mockGetCurrentBranch: MockFn = jest.fn();

jest.mock('../../../../src/core/git/operations', () => ({
  isGitRepo: (...args: unknown[]) => mockIsGitRepo(...args),
  cloneRepository: (...args: unknown[]) => mockCloneRepository(...args),
  checkoutBranch: (...args: unknown[]) => mockCheckoutBranch(...args),
  getCurrentBranch: (...args: unknown[]) => mockGetCurrentBranch(...args),
}));

// Mock logger
jest.mock('../../../../src/utils/logger', () => ({
  success: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  spinner: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    text: '',
  })),
}));

import { orchestrate } from '../../../../src/core/workspace/orchestrator';
import type { BinderConfig } from '../../../../src/core/config/types';

describe('orchestrate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('current directory repos (path: ".")', () => {
    const configWithCurrentDir: BinderConfig = {
      name: 'test-workspace',
      repos: [
        {
          name: 'main-app',
          path: '.',
          scope: 'owner',
        },
      ],
    };

    it('should skip cloning for path "." and return skipped action', async () => {
      mockIsGitRepo.mockResolvedValue(true);
      mockGetCurrentBranch.mockResolvedValue('main');

      const result = await orchestrate(configWithCurrentDir, '/workspace');

      expect(result.success).toBe(true);
      expect(result.repos).toHaveLength(1);
      expect(result.repos[0].action).toBe('skipped');
      expect(result.repos[0].branch).toBe('main');
      expect(result.skipped).toBe(1);
      expect(result.cloned).toBe(0);

      // Should NOT have called cloneRepository
      expect(mockCloneRepository).not.toHaveBeenCalled();
    });

    it('should return error when current directory is not a git repo', async () => {
      mockIsGitRepo.mockResolvedValue(false);

      const result = await orchestrate(configWithCurrentDir, '/workspace');

      expect(result.success).toBe(false);
      expect(result.repos).toHaveLength(1);
      expect(result.repos[0].action).toBe('error');
      expect(result.repos[0].error).toBe('Current directory is not a git repository');
      expect(result.errors).toBe(1);
    });

    it('should checkout branch for path "." when branch differs', async () => {
      const configWithBranch: BinderConfig = {
        name: 'test-workspace',
        repos: [
          {
            name: 'main-app',
            path: '.',
            scope: 'owner',
            branch: 'develop',
          },
        ],
      };

      mockIsGitRepo.mockResolvedValue(true);
      mockGetCurrentBranch.mockResolvedValue('main');
      mockCheckoutBranch.mockResolvedValue(undefined);

      const result = await orchestrate(configWithBranch, '/workspace');

      expect(result.success).toBe(true);
      expect(result.repos[0].action).toBe('checkout');
      expect(result.repos[0].branch).toBe('develop');
      expect(result.checkedOut).toBe(1);

      expect(mockCheckoutBranch).toHaveBeenCalledWith('/workspace', 'develop', 'main-app');
    });

    it('should skip checkout for path "." when already on correct branch', async () => {
      const configWithBranch: BinderConfig = {
        name: 'test-workspace',
        repos: [
          {
            name: 'main-app',
            path: '.',
            scope: 'owner',
            branch: 'main',
          },
        ],
      };

      mockIsGitRepo.mockResolvedValue(true);
      mockGetCurrentBranch.mockResolvedValue('main');

      const result = await orchestrate(configWithBranch, '/workspace');

      expect(result.success).toBe(true);
      expect(result.repos[0].action).toBe('skipped');
      expect(result.repos[0].branch).toBe('main');

      // Should NOT have called checkoutBranch
      expect(mockCheckoutBranch).not.toHaveBeenCalled();
    });

    it('should handle mixed repos with path "." and remote repos', async () => {
      const mixedConfig: BinderConfig = {
        name: 'test-workspace',
        repos: [
          {
            name: 'main-app',
            path: '.',
            scope: 'owner',
          },
          {
            name: 'shared-lib',
            url: 'https://github.com/org/shared.git',
            scope: 'platform',
          },
        ],
      };

      // First repo: current dir exists as git repo
      mockIsGitRepo.mockResolvedValueOnce(true);
      mockGetCurrentBranch.mockResolvedValueOnce('main');

      // Second repo: doesn't exist, needs cloning
      mockIsGitRepo.mockResolvedValueOnce(false);
      mockCloneRepository.mockResolvedValue(undefined);
      mockGetCurrentBranch.mockResolvedValueOnce('main');

      const result = await orchestrate(mixedConfig, '/workspace');

      expect(result.success).toBe(true);
      expect(result.repos).toHaveLength(2);
      expect(result.repos[0].action).toBe('skipped');
      expect(result.repos[1].action).toBe('cloned');
      expect(result.skipped).toBe(1);
      expect(result.cloned).toBe(1);
    });
  });

  describe('remote repos', () => {
    const remoteConfig: BinderConfig = {
      name: 'test-workspace',
      repos: [
        {
          name: 'service',
          url: 'https://github.com/org/service.git',
          scope: 'owner',
        },
      ],
    };

    it('should clone remote repo when it does not exist', async () => {
      mockIsGitRepo.mockResolvedValue(false);
      mockCloneRepository.mockResolvedValue(undefined);
      mockGetCurrentBranch.mockResolvedValue('main');

      const result = await orchestrate(remoteConfig, '/workspace');

      expect(result.success).toBe(true);
      expect(result.repos[0].action).toBe('cloned');
      expect(result.cloned).toBe(1);

      expect(mockCloneRepository).toHaveBeenCalledWith(
        'https://github.com/org/service.git',
        '/workspace/repos/service',
        { depth: undefined, branch: undefined }
      );
    });

    it('should return up-to-date for existing remote repo on correct branch', async () => {
      mockIsGitRepo.mockResolvedValue(true);
      mockGetCurrentBranch.mockResolvedValue('main');

      const result = await orchestrate(remoteConfig, '/workspace');

      expect(result.success).toBe(true);
      expect(result.repos[0].action).toBe('up-to-date');
      expect(result.skipped).toBe(1);
    });
  });
});
