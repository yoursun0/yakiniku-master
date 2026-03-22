import { describe, it, expect } from 'vitest';
import { getNewState, getSideMultiplier, calculateHpChange, DIFFICULTY_SETTINGS, checkOverlap, MEAT_WIDTH, MEAT_HEIGHT } from '../gameLogic';

describe('Game Logic', () => {
  describe('getNewState', () => {
    it('should return raw for elapsed <= 10', () => {
      expect(getNewState(0)).toBe('raw');
      expect(getNewState(10)).toBe('raw');
    });

    it('should return half for 10 < elapsed <= 20', () => {
      expect(getNewState(10.1)).toBe('half');
      expect(getNewState(20)).toBe('half');
    });

    it('should return well for 20 < elapsed <= 25', () => {
      expect(getNewState(20.1)).toBe('well');
      expect(getNewState(25)).toBe('well');
    });

    it('should return over for 25 < elapsed <= 30', () => {
      expect(getNewState(25.1)).toBe('over');
      expect(getNewState(30)).toBe('over');
    });

    it('should return burnt for elapsed > 30', () => {
      expect(getNewState(30.1)).toBe('burnt');
    });
  });

  describe('getSideMultiplier', () => {
    it('should return 2 for well', () => {
      expect(getSideMultiplier('well')).toBe(2);
    });

    it('should return 1 for half', () => {
      expect(getSideMultiplier('half')).toBe(1);
    });

    it('should return 1 for over', () => {
      expect(getSideMultiplier('over')).toBe(1);
    });

    it('should return 0 for others', () => {
      expect(getSideMultiplier('raw')).toBe(0);
      expect(getSideMultiplier('burnt')).toBe(0);
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

  describe('DIFFICULTY_SETTINGS', () => {
    it('should have correct settings for easy', () => {
      expect(DIFFICULTY_SETTINGS.easy).toEqual({ meats: 10, hp: 80, label: '簡單' });
    });

    it('should have correct settings for normal', () => {
      expect(DIFFICULTY_SETTINGS.normal).toEqual({ meats: 20, hp: 50, label: '普通' });
    });

    it('should have correct settings for hard', () => {
      expect(DIFFICULTY_SETTINGS.hard).toEqual({ meats: 35, hp: 30, label: '困難' });
    });
  });

  describe('checkOverlap', () => {
    it('should return true if two meats overlap (center hit)', () => {
      expect(checkOverlap(100, 100, 100, 100)).toBe(true);
    });

    it('should return true if they significantly overlap', () => {
      expect(checkOverlap(100, 100, 100 + MEAT_WIDTH * 0.5, 100 + MEAT_HEIGHT * 0.5)).toBe(true);
    });

    it('should return false if they are far apart', () => {
      expect(checkOverlap(100, 100, 100 + MEAT_WIDTH * 2, 100 + MEAT_HEIGHT * 2)).toBe(false);
    });

    it('should return false when meeting at horizontal tangent position', () => {
      // 剛好在左右邊緣接觸 (dx = MEAT_WIDTH)
      expect(checkOverlap(100, 100, 100 + MEAT_WIDTH, 100)).toBe(false);
    });

    it('should return false when meeting at vertical tangent position', () => {
      // 剛好在上下邊緣接觸 (dy = MEAT_HEIGHT)
      expect(checkOverlap(100, 100, 100, 100 + MEAT_HEIGHT)).toBe(false);
    });

    it('should return false for diagonal near-miss (where rectangles overlap but ovals do not)', () => {
      // 在對角線位置，dx = 0.8W, dy = 0.8H
      // 矩形判定: 0.8 < 0.9 (重疊)
      // 橢圓判定: (0.8)^2 + (0.8)^2 = 1.28 > 1 (不重疊)
      const dx = MEAT_WIDTH * 0.8;
      const dy = MEAT_HEIGHT * 0.8;
      expect(checkOverlap(100, 100, 100 + dx, 100 + dy)).toBe(false);
    });
  });
});
