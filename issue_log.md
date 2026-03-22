# Issue Log - Yakiniku Master Ultimate

## [2026-03-22]

### 1. Mobile Responsiveness Evaluation
- **Issue:** The game is currently not fully responsive on mobile devices, especially in portrait mode.
- **Details:**
    - **Horizontal Overflow:** The grill (420px) and the bottom interaction area (Plate + Bowl > 400px) exceed the standard mobile screen width (320px-375px).
    - **Drag & Drop Incompatibility:** The game relies on HTML5 Drag and Drop API, which is not natively supported by touch events on mobile browsers.
    - **Viewport Clipping:** Using `h-screen` (100vh) often leads to content being cut off by mobile browser address bars.
    - **Touch Target Size:** UI elements like the debug panel buttons and game controls are too small for comfortable touch interaction.
    - **Lack of Responsive Breakpoints:** The current layout is fixed and does not adapt to different screen aspect ratios.
- **Status:** Pending Review (Do not fix yet).

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
