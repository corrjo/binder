// Main entry point for programmatic usage
export { parseConfig, loadConfig, ConfigError } from './core/config/parser';
export { BinderConfigSchema, RepositorySchema, ScopeSchema } from './core/config/types';
export type { BinderConfig, Repository, Scope } from './core/config/types';
export { generateContextMap } from './core/generator/context-map';
export { orchestrate } from './core/workspace/orchestrator';
export type { OrchestrationResult, RepoOrchestrationResult } from './core/workspace/orchestrator';
export { getWorkspaceStatus } from './core/workspace/status';
export type { WorkspaceStatus, RepoStatusInfo, OrphanedRepo } from './core/workspace/status';
