export type MeatState = 'raw' | 'half' | 'well' | 'over' | 'burnt';

export type Difficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTY_SETTINGS: Record<Difficulty, { meats: number; hp: number; label: string }> = {
  easy: { meats: 10, hp: 80, label: '簡單' },
  normal: { meats: 20, hp: 50, label: '普通' },
  hard: { meats: 35, hp: 30, label: '困難' },
};

export const MEAT_WIDTH = 85;
export const MEAT_HEIGHT = 65;
export const GRILL_RADIUS = 160;

export const getNewState = (elapsed: number): MeatState => {
  if (elapsed > 30) return 'burnt';
  if (elapsed > 25) return 'over';
  if (elapsed > 20) return 'well';
  if (elapsed > 10) return 'half';
  return 'raw';
};

export const getPoints = (state: MeatState): number => {
  switch (state) {
    case 'well': return 10;
    case 'half': return 5;
    default: return 0;
  }
};

export const calculateHpChange = (sA: MeatState, sB: MeatState): number => {
  if (sA === 'raw' || sB === 'raw' || sA === 'burnt' || sB === 'burnt') {
    return -5;
  } else if (sA === 'over' || sB === 'over') {
    return -1;
  } else if (sA === 'well' && sB === 'well') {
    return 1;
  }
  return 0;
};

export const checkOverlap = (x1: number, y1: number, x2: number, y2: number): boolean => {
  const dx = x1 - x2;
  const dy = y1 - y2;
  
  // Use elliptical distance formula: (dx/W)^2 + (dy/H)^2 < 1
  // We use a slightly smaller factor (0.9) to allow a tiny bit of visual overlap for better "feel"
  const normalizedDx = dx / (MEAT_WIDTH * 0.95);
  const normalizedDy = dy / (MEAT_HEIGHT * 0.95);
  
  return (normalizedDx * normalizedDx + normalizedDy * normalizedDy) < 1;
};
