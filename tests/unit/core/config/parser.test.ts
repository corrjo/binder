import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { parseConfig, loadConfig, ConfigError } from '../../../../src/core/config/parser';

describe('parseConfig', () => {
  it('should parse valid YAML string', () => {
    const yaml = `
name: my-workspace
repos:
  - name: service-a
    url: https://github.com/org/service-a.git
    scope: owner
`;
    const config = parseConfig(yaml);
    expect(config.name).toBe('my-workspace');
    expect(config.repos).toHaveLength(1);
    expect(config.repos[0].name).toBe('service-a');
    expect(config.repos[0].scope).toBe('owner');
  });

  it('should parse config with all optional fields', () => {
    const yaml = `
name: full-workspace
repos:
  - name: main-service
    url: git@github.com:org/main.git
    path: ./services/main
    scope: owner
    branch: develop
    notes: Main service we own
    depth: 1
`;
    const config = parseConfig(yaml);
    expect(config.repos[0].path).toBe('./services/main');
    expect(config.repos[0].branch).toBe('develop');
    expect(config.repos[0].notes).toBe('Main service we own');
    expect(config.repos[0].depth).toBe(1);
  });

  it('should parse config with multiple scopes', () => {
    const yaml = `
name: multi-scope
repos:
  - name: owned
    url: https://github.com/org/owned.git
    scope: owner
  - name: platform
    url: https://github.com/org/platform.git
    scope: platform
    notes: Shared infrastructure
  - name: docs
    url: https://github.com/org/docs.git
    scope: reference
`;
    const config = parseConfig(yaml);
    expect(config.repos).toHaveLength(3);
    expect(config.repos[0].scope).toBe('owner');
    expect(config.repos[1].scope).toBe('platform');
    expect(config.repos[2].scope).toBe('reference');
  });

  it('should throw ConfigError for invalid YAML syntax', () => {
    const badYaml = `
name: test
repos:
  - name: broken
    url: https://example.com
    scope: [invalid yaml here
`;
    expect(() => parseConfig(badYaml)).toThrow(ConfigError);
  });

  it('should throw ConfigError for missing required fields', () => {
    const missingName = `
repos:
  - name: test
    url: https://github.com/test
    scope: owner
`;
    expect(() => parseConfig(missingName)).toThrow(ConfigError);

    const missingRepos = `
name: test
`;
    expect(() => parseConfig(missingRepos)).toThrow(ConfigError);
  });

  it('should throw ConfigError for invalid scope', () => {
    const invalidScope = `
name: test
repos:
  - name: test
    url: https://github.com/test
    scope: admin
`;
    expect(() => parseConfig(invalidScope)).toThrow(ConfigError);
  });

  it('should throw ConfigError for empty repos array', () => {
    const emptyRepos = `
name: test
repos: []
`;
    expect(() => parseConfig(emptyRepos)).toThrow(ConfigError);
  });

  it('should include helpful error message for validation failures', () => {
    const invalidConfig = `
name: ""
repos:
  - name: test
    url: https://github.com/test
    scope: owner
`;
    try {
      parseConfig(invalidConfig);
      fail('Expected ConfigError to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).message).toContain('name');
    }
  });
});

describe('loadConfig', () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'binder-test-'));
    configPath = path.join(tmpDir, 'binder.yaml');
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('should load and parse config from file', async () => {
    const yaml = `
name: test-workspace
repos:
  - name: repo-a
    url: https://github.com/org/repo-a.git
    scope: owner
`;
    await fs.writeFile(configPath, yaml);

    const config = await loadConfig(configPath);
    expect(config.name).toBe('test-workspace');
    expect(config.repos).toHaveLength(1);
  });

  it('should throw ConfigError if file does not exist', async () => {
    const nonExistent = path.join(tmpDir, 'nonexistent.yaml');
    await expect(loadConfig(nonExistent)).rejects.toThrow(ConfigError);
  });

  it('should throw ConfigError with file path in message', async () => {
    const nonExistent = path.join(tmpDir, 'missing.yaml');
    try {
      await loadConfig(nonExistent);
      fail('Expected ConfigError to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).message).toContain('missing.yaml');
    }
  });

  it('should use default path (binder.yaml) when no path provided', async () => {
    // This test verifies the function signature allows optional path
    // The actual default path behavior depends on cwd, so we test explicitly
    const cwd = process.cwd();
    const defaultPath = path.join(cwd, 'binder.yaml');

    // Create a config in cwd temporarily (if it doesn't exist)
    const existed = await fs.pathExists(defaultPath);
    if (!existed) {
      const yaml = `
name: default-test
repos:
  - name: test
    url: https://github.com/test
    scope: owner
`;
      await fs.writeFile(defaultPath, yaml);
      try {
        const config = await loadConfig();
        expect(config.name).toBe('default-test');
      } finally {
        await fs.remove(defaultPath);
      }
    }
  });
});

describe('ConfigError', () => {
  it('should be an instance of Error', () => {
    const error = new ConfigError('Test error');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ConfigError);
  });

  it('should have correct name and message', () => {
    const error = new ConfigError('Something went wrong');
    expect(error.name).toBe('ConfigError');
    expect(error.message).toBe('Something went wrong');
  });
});
