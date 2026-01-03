import { loadConfig, ConfigError } from '../core/config/parser';
import { orchestrate } from '../core/workspace/orchestrator';
import { success, error, info, newline, header } from '../utils/logger';

/**
 * Pull (clone/checkout) repositories according to binder.yaml
 */
export async function pullCommand(): Promise<void> {
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

  header(`Pulling repositories for "${config.name}"`);

  // Orchestrate repositories
  const result = await orchestrate(config);

  // Summary
  newline();
  if (result.success) {
    success('Orchestration complete!');
  } else {
    error('Orchestration completed with errors.');
  }

  info(`  Cloned: ${result.cloned}`);
  info(`  Checked out: ${result.checkedOut}`);
  info(`  Up to date: ${result.skipped}`);
  if (result.errors > 0) {
    info(`  Errors: ${result.errors}`);
  }

  if (!result.success) {
    process.exit(1);
  }
}
