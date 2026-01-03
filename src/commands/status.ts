import chalk from 'chalk';
import { loadConfig, ConfigError } from '../core/config/parser';
import { getWorkspaceStatus, RepoStatusInfo } from '../core/workspace/status';
import { error, info, newline, header, formatScope } from '../utils/logger';
import type { Scope } from '../core/config/types';

type RepoState = 'missing' | 'not-git' | 'dirty' | 'branch-mismatch' | 'ok';

interface StatusDisplay {
  icon: string;
  text: string;
}

function getRepoState(repo: RepoStatusInfo): RepoState {
  if (!repo.exists) return 'missing';
  if (!repo.isGitRepo) return 'not-git';
  if (repo.isDirty) return 'dirty';
  if (repo.branchMismatch) return 'branch-mismatch';
  return 'ok';
}

function getStatusDisplay(repo: RepoStatusInfo): StatusDisplay {
  const displays: Record<RepoState, () => StatusDisplay> = {
    missing: () => ({
      icon: chalk.red('✗'),
      text: chalk.red('missing'),
    }),
    'not-git': () => ({
      icon: chalk.yellow('?'),
      text: chalk.yellow('not a git repo'),
    }),
    dirty: () => ({
      icon: chalk.yellow('●'),
      text: chalk.yellow('dirty'),
    }),
    'branch-mismatch': () => ({
      icon: chalk.yellow('⇄'),
      text: chalk.yellow(`on ${repo.currentBranch}, expected ${repo.expectedBranch}`),
    }),
    ok: () => ({
      icon: chalk.green('✓'),
      text: chalk.green(repo.currentBranch || 'ok'),
    }),
  };

  return displays[getRepoState(repo)]();
}

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
      const { icon, text } = getStatusDisplay(repo);
      console.log(`  ${icon} ${repo.name} ${chalk.dim(`(${text})`)}`);
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
