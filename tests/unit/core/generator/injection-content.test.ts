import { describe, it, expect } from '@jest/globals';
import { getInjectionContent } from '../../../../src/core/generator/injection-content';

describe('getInjectionContent', () => {
  const contextMapPath = 'CONTEXT_MAP.md';

  it('should return markdown content for markdown format', () => {
    const result = getInjectionContent('markdown', contextMapPath);
    expect(result).toContain('## Binder Workspace Instructions');
  });

  it('should include reference to CONTEXT_MAP.md path', () => {
    const result = getInjectionContent('markdown', contextMapPath);
    expect(result).toContain('`CONTEXT_MAP.md`');
  });

  it('should include custom context map path when provided', () => {
    const customPath = 'docs/WORKSPACE_CONTEXT.md';
    const result = getInjectionContent('markdown', customPath);
    expect(result).toContain(`\`${customPath}\``);
  });

  it('should include scope system explanation', () => {
    const result = getInjectionContent('markdown', contextMapPath);
    expect(result).toContain('OWNER');
    expect(result).toContain('PLATFORM');
    expect(result).toContain('REFERENCE');
  });

  it('should include OWNER scope description', () => {
    const result = getInjectionContent('markdown', contextMapPath);
    expect(result).toContain('Full Authority');
    expect(result).toMatch(/refactor|restructure/i);
  });

  it('should include PLATFORM scope description', () => {
    const result = getInjectionContent('markdown', contextMapPath);
    expect(result).toContain('Restricted');
    expect(result).toMatch(/minimal/i);
  });

  it('should include REFERENCE scope description', () => {
    const result = getInjectionContent('markdown', contextMapPath);
    expect(result).toContain('Read-Only');
    expect(result).toMatch(/do not modify/i);
  });

  it('should include required action instructions', () => {
    const result = getInjectionContent('markdown', contextMapPath);
    expect(result).toContain('Required Action');
    expect(result).toMatch(/read.*CONTEXT_MAP/i);
  });

  it('should include link to Binder', () => {
    const result = getInjectionContent('markdown', contextMapPath);
    expect(result).toContain('[Binder]');
    expect(result).toContain('github.com');
  });

  it('should produce valid markdown', () => {
    const result = getInjectionContent('markdown', contextMapPath);
    // Should have proper markdown headers
    expect(result).toMatch(/^## /m);
    expect(result).toMatch(/^### /m);
    // Should have bullet points
    expect(result).toMatch(/^- /m);
  });
});
