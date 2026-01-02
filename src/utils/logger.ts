import chalk from 'chalk';
import ora from 'ora';
import type { Ora } from 'ora';

export interface Logger {
  info(message: string): void;
  success(message: string): void;
  warning(message: string): void;
  error(message: string): void;
  debug(message: string): void;
  spinner(message: string): Ora;
}

let verboseMode = false;

/**
 * Enable or disable verbose/debug logging
 */
export function setVerbose(enabled: boolean): void {
  verboseMode = enabled;
}

/**
 * Check if verbose mode is enabled
 */
export function isVerbose(): boolean {
  return verboseMode;
}

/**
 * Log an info message
 */
export function info(message: string): void {
  console.log(chalk.blue('info'), message);
}

/**
 * Log a success message
 */
export function success(message: string): void {
  console.log(chalk.green('✓'), message);
}

/**
 * Log a warning message
 */
export function warning(message: string): void {
  console.log(chalk.yellow('⚠'), message);
}

/**
 * Log an error message
 */
export function error(message: string): void {
  console.error(chalk.red('✗'), message);
}

/**
 * Log a debug message (only in verbose mode)
 */
export function debug(message: string): void {
  if (verboseMode) {
    console.log(chalk.gray('debug'), message);
  }
}

/**
 * Create a spinner for long-running operations
 */
export function spinner(message: string): Ora {
  return ora({
    text: message,
    color: 'cyan',
  });
}

/**
 * Log a blank line
 */
export function newline(): void {
  console.log();
}

/**
 * Log a header/title
 */
export function header(title: string): void {
  console.log();
  console.log(chalk.bold.underline(title));
  console.log();
}

/**
 * Log a list item
 */
export function listItem(text: string, indent = 0): void {
  const padding = '  '.repeat(indent);
  console.log(`${padding}${chalk.dim('•')} ${text}`);
}

/**
 * Format a scope for display
 */
export function formatScope(scope: 'owner' | 'platform' | 'reference'): string {
  switch (scope) {
    case 'owner':
      return chalk.green('owner');
    case 'platform':
      return chalk.yellow('platform');
    case 'reference':
      return chalk.red('reference');
  }
}

// Export a logger object for convenience
export const logger: Logger = {
  info,
  success,
  warning,
  error,
  debug,
  spinner,
};
