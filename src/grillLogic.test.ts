import { describe, it, expect, vi } from 'vitest';

// We want to test the logic that determines if a drop point is within the grill radius.
// Since the original code is in App.tsx, we can extract the core calculation logic for testing.

const MEAT_WIDTH_PCT = (85 / 380) * 100;
const MEAT_HEIGHT_PCT = (65 / 380) * 100;

function isPointOnGrill(pointX: number, pointY: number, grillRect: { left: number, top: number, width: number, height: number }) {
  const xPct = ((pointX - grillRect.left) / grillRect.width) * 100 - MEAT_WIDTH_PCT / 2;
  const yPct = ((pointY - grillRect.top) / grillRect.height) * 100 - MEAT_HEIGHT_PCT / 2;

  const centerX = 50;
  const centerY = 50;
  const dist = Math.sqrt(Math.pow(xPct + MEAT_WIDTH_PCT / 2 - centerX, 2) + Math.pow(yPct + MEAT_HEIGHT_PCT / 2 - centerY, 2));

  return dist <= 45;
}

describe('Grill Drop Logic', () => {
  const mockGrillRect = {
    left: 100,
    top: 100,
    width: 400,
    height: 400
  };

  it('should detect a point in the center of the grill as valid', () => {
    const centerX = mockGrillRect.left + mockGrillRect.width / 2;
    const centerY = mockGrillRect.top + mockGrillRect.height / 2;
    expect(isPointOnGrill(centerX, centerY, mockGrillRect)).toBe(true);
  });

  it('should detect a point far outside the grill as invalid', () => {
    expect(isPointOnGrill(0, 0, mockGrillRect)).toBe(false);
  });

  it('should detect a point near the edge of the grill as valid', () => {
    // Edge is at 45% radius from center (50, 50)
    // 45% of 400px is 180px.
    // Center is 300, 300.
    // Point at 300 + 170, 300 should be valid.
    expect(isPointOnGrill(470, 300, mockGrillRect)).toBe(true);
  });

  it('should detect a point just outside the edge as invalid', () => {
    // 300 + 200 = 500. 50% radius is 200px. 45% is 180px.
    expect(isPointOnGrill(490, 300, mockGrillRect)).toBe(false);
  });
});
