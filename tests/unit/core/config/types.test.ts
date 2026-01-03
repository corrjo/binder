import { describe, it, expect } from '@jest/globals';
import {
  ScopeSchema,
  RepositorySchema,
  BinderConfigSchema,
  type Scope,
  type Repository,
  type BinderConfig,
} from '../../../../src/core/config/types';

describe('ScopeSchema', () => {
  it('should accept valid scope values', () => {
    expect(ScopeSchema.parse('owner')).toBe('owner');
    expect(ScopeSchema.parse('platform')).toBe('platform');
    expect(ScopeSchema.parse('reference')).toBe('reference');
  });

  it('should reject invalid scope values', () => {
    expect(() => ScopeSchema.parse('admin')).toThrow();
    expect(() => ScopeSchema.parse('OWNER')).toThrow();
    expect(() => ScopeSchema.parse('')).toThrow();
    expect(() => ScopeSchema.parse(null)).toThrow();
  });
});

describe('RepositorySchema', () => {
  const validRepo: Repository = {
    name: 'my-repo',
    url: 'https://github.com/org/repo.git',
    scope: 'owner',
  };

  it('should accept a minimal valid repository', () => {
    const result = RepositorySchema.parse(validRepo);
    expect(result.name).toBe('my-repo');
    expect(result.url).toBe('https://github.com/org/repo.git');
    expect(result.scope).toBe('owner');
  });

  it('should accept a repository with all optional fields', () => {
    const fullRepo: Repository = {
      name: 'my-repo',
      url: 'git@github.com:org/repo.git',
      path: './repos/my-repo',
      scope: 'platform',
      branch: 'develop',
      notes: 'Some notes about this repo',
      depth: 1,
    };
    const result = RepositorySchema.parse(fullRepo);
    expect(result.path).toBe('./repos/my-repo');
    expect(result.branch).toBe('develop');
    expect(result.notes).toBe('Some notes about this repo');
    expect(result.depth).toBe(1);
  });

  it('should accept SSH URLs', () => {
    const sshRepo = { ...validRepo, url: 'git@github.com:org/repo.git' };
    expect(() => RepositorySchema.parse(sshRepo)).not.toThrow();
  });

  it('should reject empty name', () => {
    const badRepo = { ...validRepo, name: '' };
    expect(() => RepositorySchema.parse(badRepo)).toThrow();
  });

  it('should reject missing required fields', () => {
    expect(() => RepositorySchema.parse({ name: 'test' })).toThrow();
    expect(() => RepositorySchema.parse({ url: 'https://github.com/test' })).toThrow();
    expect(() => RepositorySchema.parse({ scope: 'owner' })).toThrow();
  });

  it('should reject invalid depth (non-positive)', () => {
    const badRepo = { ...validRepo, depth: 0 };
    expect(() => RepositorySchema.parse(badRepo)).toThrow();
    const negativeDepth = { ...validRepo, depth: -1 };
    expect(() => RepositorySchema.parse(negativeDepth)).toThrow();
  });

  it('should accept positive depth values', () => {
    const repo = { ...validRepo, depth: 1 };
    expect(RepositorySchema.parse(repo).depth).toBe(1);
    const deepRepo = { ...validRepo, depth: 100 };
    expect(RepositorySchema.parse(deepRepo).depth).toBe(100);
  });

  describe('path: "." (current directory)', () => {
    it('should allow path "." without URL', () => {
      const currentDirRepo = {
        name: 'current',
        path: '.',
        scope: 'owner',
      };
      const result = RepositorySchema.parse(currentDirRepo);
      expect(result.path).toBe('.');
      expect(result.url).toBeUndefined();
    });

    it('should allow path "." with URL (URL is optional)', () => {
      const currentDirRepo = {
        name: 'current',
        path: '.',
        url: 'https://github.com/org/repo.git',
        scope: 'owner',
      };
      const result = RepositorySchema.parse(currentDirRepo);
      expect(result.path).toBe('.');
      expect(result.url).toBe('https://github.com/org/repo.git');
    });

    it('should still require URL for other paths', () => {
      const otherPathRepo = {
        name: 'other',
        path: './some/path',
        scope: 'owner',
      };
      expect(() => RepositorySchema.parse(otherPathRepo)).toThrow(
        'URL is required for repositories'
      );
    });

    it('should still require URL when path is not specified', () => {
      const noPathRepo = {
        name: 'no-path',
        scope: 'owner',
      };
      expect(() => RepositorySchema.parse(noPathRepo)).toThrow('URL is required for repositories');
    });
  });
});

describe('BinderConfigSchema', () => {
  const validConfig: BinderConfig = {
    name: 'my-workspace',
    repos: [
      {
        name: 'service-a',
        url: 'https://github.com/org/service-a.git',
        scope: 'owner',
      },
    ],
  };

  it('should accept a valid config with one repo', () => {
    const result = BinderConfigSchema.parse(validConfig);
    expect(result.name).toBe('my-workspace');
    expect(result.repos).toHaveLength(1);
  });

  it('should accept a config with multiple repos of different scopes', () => {
    const multiRepoConfig: BinderConfig = {
      name: 'multi-workspace',
      repos: [
        { name: 'owned', url: 'https://github.com/org/owned.git', scope: 'owner' },
        { name: 'platform', url: 'https://github.com/org/platform.git', scope: 'platform' },
        { name: 'reference', url: 'https://github.com/org/reference.git', scope: 'reference' },
      ],
    };
    const result = BinderConfigSchema.parse(multiRepoConfig);
    expect(result.repos).toHaveLength(3);
    expect(result.repos.map((r) => r.scope)).toEqual(['owner', 'platform', 'reference']);
  });

  it('should reject empty workspace name', () => {
    const badConfig = { ...validConfig, name: '' };
    expect(() => BinderConfigSchema.parse(badConfig)).toThrow();
  });

  it('should reject empty repos array', () => {
    const badConfig = { ...validConfig, repos: [] };
    expect(() => BinderConfigSchema.parse(badConfig)).toThrow();
  });

  it('should reject missing repos field', () => {
    expect(() => BinderConfigSchema.parse({ name: 'test' })).toThrow();
  });

  it('should reject invalid repo in array', () => {
    const badConfig = {
      name: 'test',
      repos: [{ name: '', url: 'https://github.com/test', scope: 'owner' }],
    };
    expect(() => BinderConfigSchema.parse(badConfig)).toThrow();
  });
});

describe('Type inference', () => {
  it('should infer correct types from schemas', () => {
    // These are compile-time checks - if this file compiles, types are correct
    const scope: Scope = 'owner';
    const repo: Repository = {
      name: 'test',
      url: 'https://github.com/test',
      scope: 'owner',
    };
    const config: BinderConfig = {
      name: 'test',
      repos: [repo],
    };

    expect(scope).toBe('owner');
    expect(repo.name).toBe('test');
    expect(config.repos).toHaveLength(1);
  });
});
