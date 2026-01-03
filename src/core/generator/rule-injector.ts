/**
 * Rule file injection for AI tool configurations
 */

import * as path from 'path';
import { exists, readFile, writeFile, ensureDir } from '../../utils/filesystem';
import { success, warning, info } from '../../utils/logger';
import { getInjectionContent, InjectionFormat } from './injection-content';

// Marker constants for idempotent injection
const MARKER_START = '<!-- binder:start -->';
const MARKER_END = '<!-- binder:end -->';

/**
 * Target file configuration
 */
interface TargetFileConfig {
  filename: string;
  format: InjectionFormat;
  directory?: string;
  createHint: string;
}

/**
 * Known AI tool targets
 */
const TARGETS: Record<string, TargetFileConfig> = {
  claude: {
    filename: 'CLAUDE.md',
    format: 'markdown',
    createHint: "Run 'claude /init' or create CLAUDE.md manually",
  },
  cursor: {
    filename: '.cursorrules',
    format: 'markdown',
    createHint: 'Create .cursorrules in your project root',
  },
  roo: {
    filename: 'rules.md',
    directory: '.roo',
    format: 'markdown',
    createHint: "Run 'roo init' or create .roo/rules.md manually",
  },
  agents: {
    filename: 'agents.md',
    format: 'markdown',
    createHint: 'Create agents.md in your project root',
  },
};

type KnownTarget = 'claude' | 'cursor' | 'roo' | 'agents';

export interface InjectionTargets {
  claude?: boolean;
  cursor?: boolean;
  roo?: boolean;
  agents?: boolean;
  file?: string[];
}

export interface InjectionOptions {
  basePath: string;
  contextMapPath: string;
  targets: InjectionTargets;
}

export interface InjectionResult {
  file: string;
  action: 'updated' | 'unchanged' | 'skipped' | 'error';
  message?: string;
}

/**
 * Inject content between markers, handling idempotency
 * Exported for testing
 */
export function injectContent(
  existingContent: string,
  injectedContent: string
): { content: string; wasUpdated: boolean } {
  const markerStartIndex = existingContent.indexOf(MARKER_START);
  const markerEndIndex = existingContent.indexOf(MARKER_END);

  const wrappedContent = `${MARKER_START}\n${injectedContent}\n${MARKER_END}`;

  // Both markers exist and are in correct order
  if (markerStartIndex !== -1 && markerEndIndex !== -1 && markerEndIndex > markerStartIndex) {
    const before = existingContent.substring(0, markerStartIndex);
    const after = existingContent.substring(markerEndIndex + MARKER_END.length);
    const newContent = before + wrappedContent + after;
    const wasUpdated = newContent !== existingContent;
    return { content: newContent, wasUpdated };
  }

  // No markers or malformed - append to end
  const needsNewline = existingContent.length > 0 && !existingContent.endsWith('\n');
  const separator = existingContent.length === 0 ? '' : needsNewline ? '\n\n' : '\n';
  return {
    content: existingContent + separator + wrappedContent + '\n',
    wasUpdated: true,
  };
}

/**
 * Inject into a single known target file
 */
async function injectIntoKnownTarget(
  targetKey: KnownTarget,
  basePath: string,
  contextMapPath: string
): Promise<InjectionResult> {
  const config = TARGETS[targetKey];
  const dir = config.directory ? path.join(basePath, config.directory) : basePath;
  const filePath = path.join(dir, config.filename);
  const displayPath = config.directory ? `${config.directory}/${config.filename}` : config.filename;

  // Check if file exists
  if (!(await exists(filePath))) {
    return {
      file: displayPath,
      action: 'skipped',
      message: config.createHint,
    };
  }

  return injectIntoFilePath(filePath, displayPath, contextMapPath);
}

/**
 * Inject into a custom file path
 */
async function injectIntoCustomFile(
  customPath: string,
  basePath: string,
  contextMapPath: string
): Promise<InjectionResult> {
  const filePath = path.isAbsolute(customPath) ? customPath : path.join(basePath, customPath);

  // Check if file exists
  if (!(await exists(filePath))) {
    return {
      file: customPath,
      action: 'skipped',
      message: `File not found: ${customPath}`,
    };
  }

  return injectIntoFilePath(filePath, customPath, contextMapPath);
}

/**
 * Core injection logic for a file path
 */
async function injectIntoFilePath(
  filePath: string,
  displayPath: string,
  contextMapPath: string
): Promise<InjectionResult> {
  try {
    const existingContent = await readFile(filePath);
    const injectedContent = getInjectionContent('markdown', contextMapPath);
    const { content, wasUpdated } = injectContent(existingContent, injectedContent);

    if (wasUpdated) {
      // Ensure parent directory exists (for .roo/rules.md case)
      await ensureDir(path.dirname(filePath));
      await writeFile(filePath, content);
      return { file: displayPath, action: 'updated' };
    }

    return { file: displayPath, action: 'unchanged' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { file: displayPath, action: 'error', message };
  }
}

/**
 * Log the result of an injection
 */
function logResult(result: InjectionResult): void {
  switch (result.action) {
    case 'updated':
      success(`Updated Binder instructions in ${result.file}`);
      break;
    case 'unchanged':
      info(`${result.file} already up to date`);
      break;
    case 'skipped':
      warning(`${result.file} not found. ${result.message}`);
      break;
    case 'error':
      warning(`Failed to update ${result.file}: ${result.message}`);
      break;
  }
}

/**
 * Main entry point: inject into all specified rule files
 */
export async function injectIntoRuleFiles(options: InjectionOptions): Promise<InjectionResult[]> {
  const results: InjectionResult[] = [];
  const { basePath, contextMapPath, targets } = options;

  // Process known targets
  if (targets.claude) {
    const result = await injectIntoKnownTarget('claude', basePath, contextMapPath);
    results.push(result);
    logResult(result);
  }
  if (targets.cursor) {
    const result = await injectIntoKnownTarget('cursor', basePath, contextMapPath);
    results.push(result);
    logResult(result);
  }
  if (targets.roo) {
    const result = await injectIntoKnownTarget('roo', basePath, contextMapPath);
    results.push(result);
    logResult(result);
  }
  if (targets.agents) {
    const result = await injectIntoKnownTarget('agents', basePath, contextMapPath);
    results.push(result);
    logResult(result);
  }

  // Process custom files
  if (targets.file && targets.file.length > 0) {
    for (const customPath of targets.file) {
      const result = await injectIntoCustomFile(customPath, basePath, contextMapPath);
      results.push(result);
      logResult(result);
    }
  }

  return results;
}
