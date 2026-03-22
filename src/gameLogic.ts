export type MeatState = 'raw' | 'half' | 'well' | 'over' | 'burnt';

export const getNewState = (elapsed: number): MeatState => {
  if (elapsed > 20) return 'burnt';
  if (elapsed > 15) return 'over';
  if (elapsed > 10) return 'well';
  if (elapsed > 5) return 'half';
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
