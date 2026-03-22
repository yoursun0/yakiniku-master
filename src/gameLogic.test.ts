import { describe, it, expect } from 'vitest';
import { getNewState, getPoints, calculateHpChange } from './gameLogic';

describe('Game Logic', () => {
  describe('getNewState', () => {
    it('should return raw for elapsed <= 5', () => {
      expect(getNewState(0)).toBe('raw');
      expect(getNewState(5)).toBe('raw');
    });

    it('should return half for 5 < elapsed <= 10', () => {
      expect(getNewState(5.1)).toBe('half');
      expect(getNewState(10)).toBe('half');
    });

    it('should return well for 10 < elapsed <= 15', () => {
      expect(getNewState(10.1)).toBe('well');
      expect(getNewState(15)).toBe('well');
    });

    it('should return over for 15 < elapsed <= 20', () => {
      expect(getNewState(15.1)).toBe('over');
      expect(getNewState(20)).toBe('over');
    });

    it('should return burnt for elapsed > 20', () => {
      expect(getNewState(20.1)).toBe('burnt');
    });
  });

  describe('getPoints', () => {
    it('should return 10 for well', () => {
      expect(getPoints('well')).toBe(10);
    });

    it('should return 5 for half', () => {
      expect(getPoints('half')).toBe(5);
    });

    it('should return 0 for others', () => {
      expect(getPoints('raw')).toBe(0);
      expect(getPoints('over')).toBe(0);
      expect(getPoints('burnt')).toBe(0);
    });
  });

  describe('calculateHpChange', () => {
    it('should return -5 for raw or burnt', () => {
      expect(calculateHpChange('raw', 'well')).toBe(-5);
      expect(calculateHpChange('well', 'raw')).toBe(-5);
      expect(calculateHpChange('burnt', 'well')).toBe(-5);
      expect(calculateHpChange('well', 'burnt')).toBe(-5);
    });

    it('should return -1 for over', () => {
      expect(calculateHpChange('over', 'well')).toBe(-1);
      expect(calculateHpChange('well', 'over')).toBe(-1);
    });

    it('should return 1 for both well', () => {
      expect(calculateHpChange('well', 'well')).toBe(1);
    });

    it('should return 0 for others', () => {
      expect(calculateHpChange('half', 'half')).toBe(0);
      expect(calculateHpChange('half', 'well')).toBe(0);
    });

    it('should prioritize raw/burnt over over/well', () => {
      expect(calculateHpChange('raw', 'over')).toBe(-5);
      expect(calculateHpChange('burnt', 'over')).toBe(-5);
      expect(calculateHpChange('raw', 'well')).toBe(-5);
    });

    it('should prioritize over over well', () => {
      expect(calculateHpChange('over', 'well')).toBe(-1);
    });
  });
});
