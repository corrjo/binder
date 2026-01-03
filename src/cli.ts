#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { initCommand } from './commands/init';
import { pullCommand } from './commands/pull';
import { contextCommand } from './commands/context';
import { statusCommand } from './commands/status';
import { setVerbose } from './utils/logger';

// Read version from package.json
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as { version: string };

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
    try {
      await initCommand();
    } catch (error) {
      console.error('Unexpected error while running "init" command:', error);
      process.exitCode = 1;
    }
  });

program
  .command('pull')
  .description('Clone missing repositories and checkout configured branches')
  .action(async () => {
    try {
      await pullCommand();
    } catch (error) {
      console.error('Unexpected error while running "pull" command:', error);
      process.exitCode = 1;
    }
  });

program
  .command('context')
  .description('Generate CONTEXT_MAP.md for AI agents')
  .action(async () => {
    try {
      await contextCommand();
    } catch (error) {
      console.error('Unexpected error while running "context" command:', error);
      process.exitCode = 1;
    }
  });

program
  .command('status')
  .description('Show workspace status (repos, branches, dirty state)')
  .action(async () => {
    try {
      await statusCommand();
    } catch (error) {
      console.error('Unexpected error while running "status" command:', error);
      process.exitCode = 1;
    }
  });

// Parse arguments
program.parse();
