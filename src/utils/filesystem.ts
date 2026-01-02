import * as fs from 'fs-extra';
import * as path from 'path';
import { FileSystemError } from './errors';

/**
 * Resolve a path relative to the current working directory
 * Handles both absolute and relative paths
 */
export function resolvePath(inputPath: string, basePath?: string): string {
  const base = basePath ?? process.cwd();
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }
  return path.resolve(base, inputPath);
}

/**
 * Check if a path exists
 */
export async function exists(targetPath: string): Promise<boolean> {
  return fs.pathExists(targetPath);
}

/**
 * Check if a path is a directory
 */
export async function isDirectory(targetPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(targetPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if a path is a git repository (contains .git directory)
 */
export async function isGitRepository(targetPath: string): Promise<boolean> {
  const gitDir = path.join(targetPath, '.git');
  return isDirectory(gitDir);
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.ensureDir(dirPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new FileSystemError(`Failed to create directory: ${message}`, dirPath);
  }
}

/**
 * Write content to a file, creating directories if needed
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  try {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new FileSystemError(`Failed to write file: ${message}`, filePath);
  }
}

/**
 * Read a file's content
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new FileSystemError(`Failed to read file: ${message}`, filePath);
  }
}

/**
 * Remove a directory and its contents
 */
export async function removeDir(dirPath: string): Promise<void> {
  try {
    await fs.remove(dirPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new FileSystemError(`Failed to remove directory: ${message}`, dirPath);
  }
}

/**
 * List directories in a path
 */
export async function listDirectories(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

/**
 * Get the default repository path based on repo name
 */
export function getDefaultRepoPath(repoName: string): string {
  return `./repos/${repoName}`;
}
