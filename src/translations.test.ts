import { describe, it, expect } from 'vitest';
import { getLocalizedSkillLabel, getLocalizedEvalLabel } from './translations';

describe('getLocalizedSkillLabel', () => {
  it('returns the label in the requested language', () => {
    expect(getLocalizedSkillLabel('attack', 'th')).toBe('ตบ (A)');
    expect(getLocalizedSkillLabel('attack', 'en')).toBe('Attack (A)');
  });

  it('falls back to the raw id for an unknown skill', () => {
    expect(getLocalizedSkillLabel('unknown_skill', 'en')).toBe('unknown_skill');
  });
});

describe('getLocalizedEvalLabel', () => {
  it('returns the label in the requested language', () => {
    expect(getLocalizedEvalLabel('#', 'th')).toBe('ดีเยี่ยม (#)');
    expect(getLocalizedEvalLabel('#', 'en')).toBe('Perfect (#)');
  });

  it('falls back to the raw id for an unknown evaluation code', () => {
    expect(getLocalizedEvalLabel('?', 'en')).toBe('?');
  });
});
