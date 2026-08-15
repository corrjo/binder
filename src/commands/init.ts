import * as path from 'path';
import * as fs from 'fs-extra';
import { success, warning, info, error } from '../utils/logger';

const CONFIG_FILENAME = 'binder.yaml';

/**
 * Initialize a new binder.yaml configuration file
 */
export async function initCommand(): Promise<void> {
  const configPath = path.join(process.cwd(), CONFIG_FILENAME);

  // Check if config already exists
  if (await fs.pathExists(configPath)) {
    warning(`${CONFIG_FILENAME} already exists in this directory.`);
    info('Edit the existing file or delete it to start fresh.');
    return;
  }

  // Read the template
  const templatePath = path.join(__dirname, '../../templates/binder.yaml.template');
  let template: string;

  try {
    template = await fs.readFile(templatePath, 'utf-8');
  } catch {
    // Fallback if template file is not found (e.g., in development)
    template = getDefaultTemplate();
  }

  // Write the config file
  try {
    await fs.writeFile(configPath, template, 'utf-8');
    success(`Created ${CONFIG_FILENAME}`);
    info('');
    info('Next steps:');
    info('  1. Edit binder.yaml to add your repositories');
    info('  2. Run `binder pull` to clone repositories and pull updates');
    info('  3. Run `binder context` to generate CONTEXT_MAP.md');
    info('  4. Run `binder status` to see workspace state');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    error(`Failed to create ${CONFIG_FILENAME}: ${message}`);
    process.exit(1);
  }
}

/**
 * Default template content (fallback)
 */
function getDefaultTemplate(): string {
  return `# ============================================================================
# Binder Configuration
# ============================================================================
# This file defines your workspace topology and repository scopes.
# Run 'binder pull' to clone repositories and pull updates.
# Run 'binder context' to generate CONTEXT_MAP.md for AI agents.
# Run 'binder status' to see workspace state.
# ============================================================================

# Workspace name (used in CONTEXT_MAP.md header)
name: my-workspace

# Repository definitions
repos:
  # OWNER SCOPE - Full Authority
  - name: my-service
    url: git@github.com:org/my-service.git
    scope: owner
    # path: ./services/my-service   # Optional: local path
    # branch: main                  # Optional: branch to checkout
    # notes: "Core service"         # Optional: context for AI agents

  # PLATFORM SCOPE - Restricted Contributor
  # - name: shared-platform
  #   url: https://github.com/org/platform.git
  #   scope: platform
  #   notes: "Shared infrastructure - minimal changes only"

  # REFERENCE SCOPE - Read Only
  # - name: legacy-api
  #   url: git@github.com:org/legacy-api.git
  #   scope: reference
  #   depth: 1                      # Optional: shallow clone
  #   notes: "Reference only - historical context"
`;
}
