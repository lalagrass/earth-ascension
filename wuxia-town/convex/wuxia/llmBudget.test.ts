import { estimateTokens, overCap, parseTokenCap, utcDay } from './llmBudget';
import { conversationTemplate } from './templates';

describe('LLM_DAILY_TOKEN_CAP', () => {
  test('parse cap', () => {
    expect(parseTokenCap(undefined)).toBeNull();
    expect(parseTokenCap('')).toBeNull();
    expect(parseTokenCap('0')).toBeNull();
    expect(parseTokenCap('abc')).toBeNull();
    expect(parseTokenCap('50000')).toBe(50000);
  });
  test('over cap', () => {
    expect(overCap(10, null)).toBe(false);
    expect(overCap(49999, 50000)).toBe(false);
    expect(overCap(50000, 50000)).toBe(true);
  });
  test('day key and estimate', () => {
    expect(utcDay(Date.UTC(2026, 10, 11, 23, 59))).toBe('2026-11-11');
    expect(estimateTokens('你好')).toBe(2);
    expect(estimateTokens('abcdefgh')).toBe(2);
  });
  test('templates fill names', () => {
    expect(conversationTemplate('start', 0, { other: '阿青' })).toBe('阿青，你好。');
    expect(conversationTemplate('leave', 0.99, { other: 'x' })).toBe('時候不早了，告辭。');
  });
});
