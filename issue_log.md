# Issue Log - Yakiniku Master Ultimate

### 1. UI Refinement & Layout Cleanup
- **Issue:** The golden border around the grill was taking up too much space, and the square sauce dish was requested for better aesthetics.
- **Fix:** 
    - Removed the "Golden Grill Frame" div and expanded the `grill.png` container to fill the space.
    - Reverted the main background to the original dark radial gradient for better contrast.
    - Changed the `score-dish` container from `rounded-full` to `rounded-2xl` for a square look.
    - Updated UI versioning to v5.2.
- **Status:** Fixed & Verified (v5.2).

### 2. Realistic Graphics Integration
- **Issue:** The generated UI (grill mesh, solid color plates) looked too "flat" and less like a BBQ experience.
- **Fix:** 
    - Replaced CSS-generated backgrounds with high-quality image resources (`grill.png`, `start-dish.png`, `score-dish.png`, `table.png`).
    - Adjusted Tailwind classes to use `bg-cover` and `bg-center` for proper image scaling.
    - Updated UI versioning to v5.1.
- **Status:** Fixed & Verified (v5.1).

### 2. Time Bonus Visual Feedback
- **Issue:** The +10s time bonus when clearing a plate lacked visual feedback, making it hard for players to notice.
- **Fix:** 
    - Created `applyTimeBonus` function to handle both state update and animation trigger.
    - Integrated `applyTimeBonus` into the refill logic.
    - Updated `floatingScores` rendering to support `isTimeBonus` type with unique styling (Cyan color).
    - Added `timeBonus` translation to `constants.ts`.
    - Updated UI versioning to v5.0.
- **Status:** Fixed & Verified (v5.0).

### 2. Border Removal for Meat
- **Issue:** The border lines around the meat textures felt artificial and broke immersion.
- **Fix:** 
    - Updated `getMeatStyle` in `App.tsx` to set `border: 'none'` and removed all `borderColor` and `borderWidth` properties.
    - Updated UI versioning to v4.9.
- **Status:** Fixed & Verified (v4.9).

### 2. Meat Texture Integration
- **Issue:** Solid color gradients for meat were functional but lacked visual appeal.
- **Fix:** 
    - Updated `getMeatStyle` in `App.tsx` to use `backgroundImage` with URL paths to `/resources/*.png`.
    - Added `backgroundSize: 'cover'` and `backgroundPosition: 'center'` for proper image fitting.
    - Updated UI versioning to v4.8.
- **Status:** Fixed & Verified (v4.8).

### 2. Difficulty Balancing & Time Bonus
- **Issue:** The difficulty settings were slightly unbalanced, and players needed more incentive to clear full plates.
- **Fix:** 
    - Updated `DIFFICULTY_SETTINGS` in `src/gameLogic.ts`.
    - Implemented a +10s time bonus in the refill `useEffect` in `App.tsx`.
    - Fixed a potential crash by correctly exporting and importing `TRANSLATIONS` from `src/constants.ts`.
    - Updated UI versioning to v4.7.
- **Status:** Fixed & Verified (v4.7).

### 2. Feature Flag for Debug Panel
- **Issue:** The debug panel was always visible in the playing state, which is not ideal for regular players.
- **Fix:** 
    - Created `src/constants.ts` to manage feature flags.
    - Added `ENABLE_DEBUG_PANEL` flag (default: `false`).
    - Wrapped the debug panel in `App.tsx` with this flag.
    - Updated UI versioning to v4.6.
- **Status:** Fixed & Verified (v4.6).

### 2. Codebase Refactoring & Cleanup
- **Issue:** The codebase contained legacy states (`bonusTimeAdded`), redundant logic in `gameLogic.ts`, and unused dependencies in `package.json`.
- **Fix:** 
    - Removed `bonusTimeAdded` state and simplified `endGame` logic.
    - Cleaned up `console.log` statements in `applyScore`.
    - Removed `express`, `@types/express`, and `dotenv` from `package.json`.
    - Removed redundant `label` property from `DIFFICULTY_SETTINGS`.
    - Updated UI versioning to v4.5.
- **Status:** Fixed & Verified (v4.5).

### 2. Sound System Simplification & Localization
- **Issue:** External sound resources were unreliable, and the background loop was distracting.
- **Fix:** 
    - Removed background sizzle loop.
    - Moved all sound assets to `/resources`.
    - Simplified `playSound` logic to use local MP3 files.
    - Updated triggers for `sizzle`, `correct`, `fail`, and `end` sounds.
- **Status:** Fixed & Verified (v4.4).

### 2. Scoring System Refactor & Terminology Update
- **Issue:** The original additive scoring system was too simple.
- **Fix:** 
    - Implemented a multiplicative scoring system: `10 * sideA_mult * sideB_mult`.
    - Updated `getSideMultiplier` in `src/gameLogic.ts`.
    - Renamed "體力 (HP)" to "健康值 (Health)" across all translations and UI.
    - Updated floating score feedback thresholds (40/20/10/0).
- **Status:** Fixed & Verified (v4.3).

## [2026-03-22]

### 1. Mobile Responsiveness Evaluation
- **Issue:** The game was not responsive on mobile devices, especially in portrait mode.
- **Fix:** 
    - Implemented responsive Tailwind classes (`md:`) for all major UI components.
    - Added `isTouchDevice` detection and `Touch Events` (`onTouchStart`, `onTouchMove`, `onTouchEnd`) for dragging.
    - Refactored drop logic into unified handlers to support both mouse and touch.
    - Added a touch drag proxy for visual feedback.
- **Status:** Fixed & Verified (v3.6).

### 2. Test Infrastructure & Collision Logic Refinement
- **Issue:** Test files were scattered in `src/`, and meat collision detection used a rectangular box which was inaccurate for oval shapes.
- **Fix:** 
    - Moved all `.test.ts` files to `/src/test/` directory.
    - Refactored `checkOverlap` in `src/gameLogic.ts` to use an **Elliptical Distance Formula** ($(\Delta x/W)^2 + (\Delta y/H)^2 < 1$).
    - Added comprehensive test cases for diagonal near-misses where rectangles would overlap but ovals should not.
- **Status:** Fixed & Verified (27 tests passing).

### 3. Cooking Speed Balancing
- **Issue:** Cooking was too fast, leading to frequent over-burning and a stressful experience.
- **Fix:** 
    - Extended cooking time thresholds (e.g., Well-done is now 20-25s instead of 10-15s).
    - Updated `getNewState` implementation and corresponding unit tests.
- **Status:** Fixed & Verified (v3.3).

### 4. Sound Effect Access Denied / 404
- **Issue:** Sound effect files from `actions.google.com` (Access Denied) and `soundjay.com` (404) were failing.
- **Fix:** 
    - Replaced all sound URLs with reliable alternatives from `assets.mixkit.co`.
    - Verified and fixed a syntax error in `App.tsx` related to CSS transforms.
- **Status:** Fixed & Verified (v3.5).

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
