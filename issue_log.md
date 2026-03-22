# Issue Log - Yakiniku Master Ultimate

## [2026-03-21]

### 1. Mobile Layout & Interaction Refinement
- **Issue:** Mobile users found it difficult to drag meat due to layout constraints and requested a specific stacking order.
- **Fix:** Restructured mobile portrait layout to: Plate (Top), Grill (Middle), Sauce Bowl (Bottom).
- **Issue:** "Tap-to-place" feature was added without approval and was not desired.
- **Fix:** Removed "tap-to-place" functionality; meat placement now strictly requires dragging.
- **Issue:** Meat became hidden/clipped when dragged from the grill to the sauce bowl.
- **Fix:** Set `overflow-visible` on grill containers and added `whileDrag` with high `zIndex` to meats on the grill to ensure visibility during interaction.
- **Issue:** Drag-and-drop accuracy was poor on mobile; meat often failed to drop on targets.
- **Fix:** Refactored hit detection to use coordinate-based math with generous margins (55% grill radius, 30px sauce bowl margin) instead of `elementFromPoint`.
- **Status:** Fixed & Verified.

## [2026-03-20]

### 1. Extracted Game Logic for Testing
- **Issue:** Core game logic (cooking, scoring, HP changes) was embedded within the `App.tsx` component, making it difficult to test in isolation.
- **Fix:** Extracted `getNewState`, `getPoints`, and `calculateHpChange` functions to `src/gameLogic.ts`.
- **Status:** Fixed & Verified with unit tests.

### 2. Difficulty Labels Localization
- **Issue:** Difficulty labels in `DIFFICULTY_SETTINGS` still contained English text (e.g., `簡單 (Easy)`).
- **Fix:** Removed English text from labels to strictly follow the "Chinese only" requirement.
- **Status:** Fixed.

### 3. Version Mismatch
- **Issue:** The footer displayed `v3.0` while the debug panel displayed `v3.1`.
- **Fix:** Updated footer version to `v3.1` for consistency.
- **Status:** Fixed.

### 4. Unstable Keys in Meat Stack
- **Issue:** Meats on the plate used array indices as keys, which can lead to unstable rendering during state changes.
- **Fix:** Changed keys to include a more descriptive prefix (`plate-meat-${i}`).
- **Status:** Fixed.

### 5. Floating Score Animation Initial Position
- **Issue:** The `initial` `y` position for floating scores was set to `fs.y`, but since it was relative to the `top` style, it was redundant or potentially confusing.
- **Fix:** Simplified `initial` `y` to `0` and `animate` `y` to `-150` relative to the `top` style.
- **Status:** Fixed.
