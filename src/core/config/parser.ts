import * as fs from 'fs-extra';
import * as path from 'path';
import * as YAML from 'yaml';
import { ZodError } from 'zod';
import { BinderConfigSchema, type BinderConfig } from './types';

/**
 * Custom error class for configuration-related errors
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConfigError);
    }
  }
}

/**
 * Parse a YAML string into a validated BinderConfig
 *
 * @param yamlContent - Raw YAML string to parse
 * @returns Validated BinderConfig object
 * @throws ConfigError if YAML syntax is invalid or validation fails
 */
export function parseConfig(yamlContent: string): BinderConfig {
  let parsed: unknown;

  // Parse YAML syntax
  try {
    parsed = YAML.parse(yamlContent);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown YAML parsing error';
    throw new ConfigError(`Invalid YAML syntax: ${message}`);
  }

  // Validate against schema
  try {
    return BinderConfigSchema.parse(parsed);
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues.map((issue) => {
        const path = issue.path.join('.');
        return path ? `${path}: ${issue.message}` : issue.message;
      });
      throw new ConfigError(`Configuration validation failed:\n  - ${issues.join('\n  - ')}`);
    }
    throw new ConfigError('Unknown validation error');
  }
}

/**
 * Load and parse a binder.yaml configuration file
 *
 * @param configPath - Path to the config file (defaults to ./binder.yaml)
 * @returns Validated BinderConfig object
 * @throws ConfigError if file doesn't exist, is unreadable, or fails validation
 */
export async function loadConfig(configPath?: string): Promise<BinderConfig> {
  const resolvedPath = configPath ?? path.join(process.cwd(), 'binder.yaml');

  // Check if file exists
  const exists = await fs.pathExists(resolvedPath);
  if (!exists) {
    throw new ConfigError(`Configuration file not found: ${resolvedPath}`);
  }

  // Read file contents
  let content: string;
  try {
    content = await fs.readFile(resolvedPath, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new ConfigError(`Failed to read configuration file ${resolvedPath}: ${message}`);
  }

  // Parse and validate
  return parseConfig(content);
}
