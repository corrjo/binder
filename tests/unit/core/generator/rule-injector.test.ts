import { describe, it, expect } from '@jest/globals';
import { injectContent } from '../../../../src/core/generator/rule-injector';

describe('injectContent', () => {
  const testContent = 'Test injected content';
  const MARKER_START = '<!-- binder:start -->';
  const MARKER_END = '<!-- binder:end -->';

  describe('when file is empty', () => {
    it('should add content with markers', () => {
      const { content, wasUpdated } = injectContent('', testContent);
      expect(content).toContain(MARKER_START);
      expect(content).toContain(testContent);
      expect(content).toContain(MARKER_END);
      expect(wasUpdated).toBe(true);
    });

    it('should have proper structure', () => {
      const { content } = injectContent('', testContent);
      const lines = content.split('\n');
      expect(lines[0]).toBe(MARKER_START);
      expect(lines[lines.length - 2]).toBe(MARKER_END);
    });
  });

  describe('when file has existing content without markers', () => {
    it('should append with markers', () => {
      const existing = '# My Rules\n\nSome existing rules.\n';
      const { content, wasUpdated } = injectContent(existing, testContent);

      expect(content).toContain('# My Rules');
      expect(content).toContain(MARKER_START);
      expect(content).toContain(testContent);
      expect(content).toContain(MARKER_END);
      expect(wasUpdated).toBe(true);
    });

    it('should preserve existing content', () => {
      const existing = '# Header\n\nParagraph content.\n';
      const { content } = injectContent(existing, testContent);

      // Existing content should be at the start
      expect(content.indexOf('# Header')).toBeLessThan(content.indexOf(MARKER_START));
    });

    it('should add separator when needed', () => {
      const existingNoNewline = '# Header';
      const { content } = injectContent(existingNoNewline, testContent);

      // Should have newlines between existing and new content
      expect(content).toContain('# Header\n\n');
    });
  });

  describe('when file has existing markers', () => {
    it('should replace content between markers', () => {
      const existing = `# Header
${MARKER_START}
Old content
${MARKER_END}
# Footer`;
      const { content, wasUpdated } = injectContent(existing, testContent);

      expect(content).toContain('# Header');
      expect(content).toContain('# Footer');
      expect(content).toContain(testContent);
      expect(content).not.toContain('Old content');
      expect(wasUpdated).toBe(true);
    });

    it('should preserve content before and after markers', () => {
      const existing = `Before content
${MARKER_START}
Old
${MARKER_END}
After content`;
      const { content } = injectContent(existing, testContent);

      expect(content).toContain('Before content');
      expect(content).toContain('After content');
    });
  });

  describe('idempotency', () => {
    it('should return wasUpdated=false when content is unchanged', () => {
      const existing = `${MARKER_START}
${testContent}
${MARKER_END}`;
      const { wasUpdated } = injectContent(existing, testContent);
      expect(wasUpdated).toBe(false);
    });

    it('should produce identical output on second run', () => {
      const { content: firstRun } = injectContent('# Header\n', testContent);
      const { content: secondRun, wasUpdated } = injectContent(firstRun, testContent);

      expect(secondRun).toBe(firstRun);
      expect(wasUpdated).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle only start marker (append instead)', () => {
      const existing = `# Header
${MARKER_START}
Some content`;
      const { content, wasUpdated } = injectContent(existing, testContent);

      // Should append because markers are malformed
      expect(wasUpdated).toBe(true);
      // Content should be appended at end
      expect(content.lastIndexOf(testContent)).toBeGreaterThan(content.indexOf('Some content'));
    });

    it('should handle only end marker (append instead)', () => {
      const existing = `# Header
${MARKER_END}`;
      const { wasUpdated } = injectContent(existing, testContent);

      expect(wasUpdated).toBe(true);
    });

    it('should handle markers in wrong order (append instead)', () => {
      const existing = `${MARKER_END}
Some content
${MARKER_START}`;
      const { wasUpdated } = injectContent(existing, testContent);

      // Should append because markers are in wrong order
      expect(wasUpdated).toBe(true);
    });
  });
});
