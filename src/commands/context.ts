import * as path from 'path';
import { loadConfig, ConfigError } from '../core/config/parser';
import { generateContextMap } from '../core/generator/context-map';
import { injectIntoRuleFiles, InjectionTargets } from '../core/generator/rule-injector';
import { writeFile } from '../utils/filesystem';
import { success, error, info, newline } from '../utils/logger';

const CONTEXT_MAP_FILENAME = 'CONTEXT_MAP.md';

export interface ContextCommandOptions {
  claude?: boolean;
  cursor?: boolean;
  roo?: boolean;
  agents?: boolean;
  file?: string[];
}

/**
 * Generate CONTEXT_MAP.md from binder.yaml
 */
export async function contextCommand(options: ContextCommandOptions = {}): Promise<void> {
  // Load configuration
  let config;
  try {
    config = await loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      error(err.message);
      info('Run `binder init` to create a configuration file.');
    } else {
      error('Failed to load configuration');
    }
    process.exit(1);
  }

  // Generate context map content
  const content = generateContextMap(config);

  // Write to file
  const outputPath = path.join(process.cwd(), CONTEXT_MAP_FILENAME);
  try {
    await writeFile(outputPath, content);
    success(`Generated ${CONTEXT_MAP_FILENAME}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    error(`Failed to write ${CONTEXT_MAP_FILENAME}: ${message}`);
    process.exit(1);
  }

  // Check if any injection flags were provided
  const hasInjectionFlags =
    options.claude ||
    options.cursor ||
    options.roo ||
    options.agents ||
    (options.file && options.file.length > 0);

  if (hasInjectionFlags) {
    newline();
    info('Injecting Binder instructions into AI rule files...');
    newline();

    const targets: InjectionTargets = {
      claude: options.claude,
      cursor: options.cursor,
      roo: options.roo,
      agents: options.agents,
      file: options.file,
    };

    await injectIntoRuleFiles({
      basePath: process.cwd(),
      contextMapPath: CONTEXT_MAP_FILENAME,
      targets,
    });
  } else {
    newline();
    info('This file describes your workspace topology for AI agents.');
    info('Use --claude, --cursor, --roo, --agents, or --file to inject instructions.');
  }
}
