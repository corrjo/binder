import chalk from 'chalk';
import { loadConfig, ConfigError } from '../core/config/parser';
import { getWorkspaceStatus } from '../core/workspace/status';
import { error, info, newline, header, formatScope } from '../utils/logger';
import type { Scope } from '../core/config/types';

/**
 * Display workspace status
 */
export async function statusCommand(): Promise<void> {
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

  // Get workspace status
  const status = await getWorkspaceStatus(config);

  header(`Workspace: ${status.workspaceName}`);

  // Group repos by scope for display
  const byScope: Record<Scope, typeof status.repos> = {
    owner: [],
    platform: [],
    reference: [],
  };

  for (const repo of status.repos) {
    byScope[repo.scope].push(repo);
  }

  // Display repos by scope
  const scopes: Scope[] = ['owner', 'platform', 'reference'];
  for (const scope of scopes) {
    const repos = byScope[scope];
    if (repos.length === 0) continue;

    console.log(formatScope(scope).toUpperCase());
    for (const repo of repos) {
      let statusIcon: string;
      let statusText: string;

      if (!repo.exists) {
        statusIcon = chalk.red('✗');
        statusText = chalk.red('missing');
      } else if (!repo.isGitRepo) {
        statusIcon = chalk.yellow('?');
        statusText = chalk.yellow('not a git repo');
      } else if (repo.isDirty) {
        statusIcon = chalk.yellow('●');
        statusText = chalk.yellow('dirty');
      } else if (repo.branchMismatch) {
        statusIcon = chalk.yellow('⇄');
        statusText = chalk.yellow(`on ${repo.currentBranch}, expected ${repo.expectedBranch}`);
      } else {
        statusIcon = chalk.green('✓');
        statusText = chalk.green(repo.currentBranch || 'ok');
      }

      console.log(`  ${statusIcon} ${repo.name} ${chalk.dim(`(${statusText})`)}`);
    }
    newline();
  }

  // Display orphaned repos if any
  if (status.orphanedRepos.length > 0) {
    console.log(chalk.gray('ORPHANED (not in config)'));
    for (const repo of status.orphanedRepos) {
      console.log(`  ${chalk.gray('?')} ${repo.name} ${chalk.dim(`(${repo.path})`)}`);
    }
    newline();
  }

  // Summary
  console.log(chalk.bold('Summary'));
  console.log(`  Total: ${status.summary.total}`);
  console.log(`  Existing: ${chalk.green(status.summary.existing)}`);
  if (status.summary.missing > 0) {
    console.log(`  Missing: ${chalk.red(status.summary.missing)}`);
  }
  if (status.summary.dirty > 0) {
    console.log(`  Dirty: ${chalk.yellow(status.summary.dirty)}`);
  }
  if (status.summary.branchMismatches > 0) {
    console.log(`  Branch mismatches: ${chalk.yellow(status.summary.branchMismatches)}`);
  }
  if (status.summary.orphaned > 0) {
    console.log(`  Orphaned: ${chalk.gray(status.summary.orphaned)}`);
  }
}
