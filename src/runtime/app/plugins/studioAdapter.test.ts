import { describe, expect, it, vi } from 'vitest';
import { createStudioAdapter } from './studioAdapter';

describe('createStudioAdapter', () => {
  it('grants every purpose, so the editor renders consent-gated blocks', () => {
    const report = vi.fn();

    createStudioAdapter().setup(report);

    expect(report).toHaveBeenCalledExactlyOnceWith({
      necessary: true,
      functional: true,
      analytics: true,
      advertising: true,
      personalization: true,
    });
  });

  it('reports a decision, so nothing waits on a banner that never loads', () => {
    expect(createStudioAdapter().hasDecision?.()).toBe(true);
  });
});
