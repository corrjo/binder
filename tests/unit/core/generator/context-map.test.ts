import { describe, it, expect } from '@jest/globals';
import { generateContextMap } from '../../../../src/core/generator/context-map';
import type { BinderConfig } from '../../../../src/core/config/types';

describe('generateContextMap', () => {
  const baseConfig: BinderConfig = {
    name: 'test-workspace',
    repos: [
      {
        name: 'main-service',
        url: 'https://github.com/org/main.git',
        scope: 'owner',
        path: './services/main',
      },
    ],
  };

  it('should include workspace name in header', () => {
    const result = generateContextMap(baseConfig);
    expect(result).toContain('test-workspace');
  });

  it('should include generated timestamp', () => {
    const result = generateContextMap(baseConfig);
    expect(result).toMatch(/Generated:/);
  });

  it('should include OWNER scope section with green emoji', () => {
    const result = generateContextMap(baseConfig);
    expect(result).toContain('🟢');
    expect(result).toContain('OWNER');
    expect(result).toContain('Full Authority');
  });

  it('should include PLATFORM scope section with yellow emoji', () => {
    const config: BinderConfig = {
      name: 'test',
      repos: [{ name: 'platform', url: 'https://github.com/test', scope: 'platform' }],
    };
    const result = generateContextMap(config);
    expect(result).toContain('🟡');
    expect(result).toContain('PLATFORM');
    expect(result).toContain('Restricted');
  });

  it('should include REFERENCE scope section with red emoji', () => {
    const config: BinderConfig = {
      name: 'test',
      repos: [{ name: 'docs', url: 'https://github.com/test', scope: 'reference' }],
    };
    const result = generateContextMap(config);
    expect(result).toContain('🔴');
    expect(result).toContain('REFERENCE');
    expect(result).toContain('Read Only');
  });

  it('should list repositories under their scope sections', () => {
    const config: BinderConfig = {
      name: 'multi-scope',
      repos: [
        {
          name: 'owned-service',
          url: 'https://github.com/org/owned.git',
          scope: 'owner',
          path: './owned',
        },
        {
          name: 'platform-lib',
          url: 'https://github.com/org/platform.git',
          scope: 'platform',
          path: './platform',
        },
        {
          name: 'reference-docs',
          url: 'https://github.com/org/docs.git',
          scope: 'reference',
          path: './docs',
        },
      ],
    };
    const result = generateContextMap(config);
    expect(result).toContain('owned-service');
    expect(result).toContain('./owned');
    expect(result).toContain('platform-lib');
    expect(result).toContain('./platform');
    expect(result).toContain('reference-docs');
    expect(result).toContain('./docs');
  });

  it('should include repository notes when provided', () => {
    const config: BinderConfig = {
      name: 'test',
      repos: [
        {
          name: 'service',
          url: 'https://github.com/test',
          scope: 'owner',
          notes: 'This is our main service',
        },
      ],
    };
    const result = generateContextMap(config);
    expect(result).toContain('This is our main service');
  });

  it('should use default path when path not specified', () => {
    const config: BinderConfig = {
      name: 'test',
      repos: [{ name: 'my-repo', url: 'https://github.com/test', scope: 'owner' }],
    };
    const result = generateContextMap(config);
    expect(result).toContain('./repos/my-repo');
  });

  it('should only include sections for scopes that have repos', () => {
    const ownerOnly: BinderConfig = {
      name: 'test',
      repos: [{ name: 'owned', url: 'https://github.com/test', scope: 'owner' }],
    };
    const result = generateContextMap(ownerOnly);
    expect(result).toContain('🟢');
    expect(result).not.toContain('🟡');
    expect(result).not.toContain('🔴');
  });

  it('should include permission instructions for each scope', () => {
    const config: BinderConfig = {
      name: 'test',
      repos: [
        { name: 'a', url: 'https://github.com/a', scope: 'owner' },
        { name: 'b', url: 'https://github.com/b', scope: 'platform' },
        { name: 'c', url: 'https://github.com/c', scope: 'reference' },
      ],
    };
    const result = generateContextMap(config);
    // Owner instructions
    expect(result).toContain('Full read/write access');
    // Platform instructions
    expect(result).toContain('Limited write access');
    expect(result).toContain('minimal changes');
    // Reference instructions
    expect(result).toContain('Read-only');
    expect(result).toContain('Do not suggest modifications');
  });

  it('should produce valid markdown', () => {
    const result = generateContextMap(baseConfig);
    // Should have proper markdown headers
    expect(result).toMatch(/^# /m);
    expect(result).toMatch(/^## /m);
    // Should have horizontal rules
    expect(result).toMatch(/^---$/m);
  });
});
