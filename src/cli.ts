#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { pullCommand } from './commands/pull';
import { contextCommand } from './commands/context';
import { statusCommand } from './commands/status';
import { setVerbose } from './utils/logger';

// Read version from package.json
// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json') as { version: string };

const program = new Command();

program
  .name('binder')
  .description('Orchestrate Virtual Monoliths from distributed repositories')
  .version(packageJson.version)
  .option('-v, --verbose', 'Enable verbose output')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.verbose) {
      setVerbose(true);
    }
  });

program
  .command('init')
  .description('Create a new binder.yaml configuration file')
  .action(async () => {
    await initCommand();
  });

program
  .command('pull')
  .description('Clone missing repositories and checkout configured branches')
  .action(async () => {
    await pullCommand();
  });

program
  .command('context')
  .description('Generate CONTEXT_MAP.md for AI agents')
  .action(async () => {
    await contextCommand();
  });

program
  .command('status')
  .description('Show workspace status (repos, branches, dirty state)')
  .action(async () => {
    await statusCommand();
  });

// Parse arguments
program.parse();
