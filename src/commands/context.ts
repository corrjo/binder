import * as path from 'path';
import { loadConfig, ConfigError } from '../core/config/parser';
import { generateContextMap } from '../core/generator/context-map';
import { writeFile } from '../utils/filesystem';
import { success, error, info, newline } from '../utils/logger';

const CONTEXT_MAP_FILENAME = 'CONTEXT_MAP.md';

/**
 * Generate CONTEXT_MAP.md from binder.yaml
 */
export async function contextCommand(): Promise<void> {
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
    newline();
    info('This file describes your workspace topology for AI agents.');
    info('Add it to your AI context or include it in prompts.');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    error(`Failed to write ${CONTEXT_MAP_FILENAME}: ${message}`);
    process.exit(1);
  }
}
