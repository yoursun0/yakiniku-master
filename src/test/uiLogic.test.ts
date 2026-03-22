import { describe, it, expect } from 'vitest';

/**
 * 模擬 App.tsx 中的座標限制邏輯
 */
export function clampScorePosition(x: number, containerWidth: number, margin: number): number {
  return Math.max(margin, Math.min(containerWidth - margin, x));
}

describe('UI Logic - Score Position Clamping', () => {
  const CONTAINER_WIDTH = 375; // 標準行動裝置寬度
  const MARGIN = 120;

  it('should keep the score position within the right boundary', () => {
    const edgeX = 370; // 靠近右邊緣
    const clampedX = clampScorePosition(edgeX, CONTAINER_WIDTH, MARGIN);
    expect(clampedX).toBeLessThanOrEqual(CONTAINER_WIDTH - MARGIN);
    expect(clampedX).toBe(255);
  });

  it('should keep the score position within the left boundary', () => {
    const edgeX = 10; // 靠近左邊緣
    const clampedX = clampScorePosition(edgeX, CONTAINER_WIDTH, MARGIN);
    expect(clampedX).toBeGreaterThanOrEqual(MARGIN);
    expect(clampedX).toBe(120);
  });

  it('should not change the position if it is well within boundaries', () => {
    const centerX = 187;
    const clampedX = clampScorePosition(centerX, CONTAINER_WIDTH, MARGIN);
    expect(clampedX).toBe(centerX);
  });
});
