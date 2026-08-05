import { describe, expect, it } from 'vitest';
import { resolveScriptId } from './resolveScriptId';

const MARKET_DE = 'd6b03ihh228s8e4i35og';
const MARKET_FR = 'd7c14jii339t9f5j46ph';
const SCRIPT_DE = '10378097-4355-4435-be22-e07c5874eac9';
const SCRIPT_FR = '78ce031e-aa89-4c18-9b0a-315b795b7ab9';

describe('resolveScriptId', () => {
  describe('single-script form', () => {
    it('returns the script regardless of market', () => {
      expect(resolveScriptId(SCRIPT_DE, MARKET_DE)).toBe(SCRIPT_DE);
      expect(resolveScriptId(SCRIPT_DE, MARKET_FR)).toBe(SCRIPT_DE);
    });

    it('returns the script when no market resolved', () => {
      expect(resolveScriptId(SCRIPT_DE, undefined)).toBe(SCRIPT_DE);
    });

    it('treats an empty string as unconfigured', () => {
      expect(resolveScriptId('', MARKET_DE)).toBeUndefined();
    });
  });

  describe('per-market form', () => {
    const perMarket = { [MARKET_DE]: SCRIPT_DE, [MARKET_FR]: SCRIPT_FR };

    it('returns the script mapped to the market', () => {
      expect(resolveScriptId(perMarket, MARKET_DE)).toBe(SCRIPT_DE);
      expect(resolveScriptId(perMarket, MARKET_FR)).toBe(SCRIPT_FR);
    });

    it('returns undefined for an unmapped market rather than another market script', () => {
      expect(resolveScriptId(perMarket, 'd8d25kjj440u0g6k57qi')).toBeUndefined();
    });

    it('returns undefined when no market resolved', () => {
      expect(resolveScriptId(perMarket, undefined)).toBeUndefined();
    });

    it('treats an empty record as unconfigured', () => {
      expect(resolveScriptId({}, MARKET_DE)).toBeUndefined();
    });

    it('treats an empty mapped value as unconfigured', () => {
      expect(resolveScriptId({ [MARKET_DE]: '' }, MARKET_DE)).toBeUndefined();
    });
  });

  it('returns undefined when nothing is configured', () => {
    expect(resolveScriptId(undefined, MARKET_DE)).toBeUndefined();
  });
});
