# Issue Log - Yakiniku Master Ultimate

## [v6.6] 2026-03-22 - 結算畫面崩潰修復 (Game Over Crash Fix)
- **問題描述**: 遊戲結束時（時間到或健康值歸零），畫面會崩潰並顯示 `Uncaught ReferenceError: setLeaderboardDifficulty is not defined`。
- **根本原因**: 在 v6.6 版本中為了簡化 UI，移除了 `leaderboardDifficulty` 狀態與其設定函數 `setLeaderboardDifficulty`，但遺漏了 `endGame` 函數中對該函數的呼叫。
- **解決方案**: 從 `App.tsx` 的 `endGame` 函數中移除 `setLeaderboardDifficulty(difficulty);` 這行已經失效的程式碼。
- **狀態**: 已解決 (Fixed)

## [v6.5] 2026-03-22 - 行動版平衡性與動態評語 (Mobile Balance & Dynamic Comments)
- **問題描述**: 
    1. 行動版烤網縮小但肉塊維持原大，導致操作空間變窄，不公平。
    2. 排行榜無資料時顯示英文。
    3. 遊戲結束評語門檻固定，未隨難度調整。
- **解決方案**: 
    1. 實作 `scale` 狀態，根據視窗寬度動態調整 `MEAT_WIDTH`、`MEAT_HEIGHT` 與 `GRILL_RADIUS`。
    2. 補齊 `noScoresYet` 翻譯字串。
    3. 實作難度感知的評語邏輯，根據 `difficulty` 設定不同的分數門檻。
- **狀態**: 已解決 (Fixed)

## [v6.4] 2026-03-22 - 分級排行榜實作 (Difficulty-Specific Leaderboard Implementation)
- **問題描述**: 原本的排行榜是全球統一排名，但不同難度的得分潛力不同，導致排名不公平。
- **解決方案**: 
    1. 修改 Firestore Schema，為每筆紀錄增加 `difficulty` 欄位。
    2. 更新 `App.tsx` 的查詢邏輯，根據 `leaderboardDifficulty` 狀態進行過濾。
    3. 在主畫面增加難度切換按鈕，供玩家瀏覽不同難度的排名。
    4. 在結算畫面根據當前難度顯示對應的排行榜。
- **狀態**: 已解決 (Fixed)

### 1. Global Leaderboard Integration
- **Issue:** Players wanted a way to compare their scores with others globally.
- **Fix:** 
    - Integrated Firebase Firestore for data storage.
    - Added a submission form in the Game Over screen.
    - Implemented a real-time leaderboard showing the top 20 scores.
    - Added security rules to validate score submissions.
    - Updated UI versioning to v6.0.
- **Status:** Fixed & Verified (v6.0).

### 2. Firebase Import Errors
- **Issue:** `Failed to resolve import "firebase/firestore"` and `Failed to resolve import "./firebase-applet-config.json"`.
- **Fix:** 
    - Installed the `firebase` package.
    - Corrected the import path in `src/firebase.ts` to `../firebase-applet-config.json`.
- **Status:** Fixed & Verified (v6.0).

### 3. Firebase Project Migration
- **Issue:** User wanted to move the backend from "My First Project" to an existing "MiniGame" project.
- **Fix:** 
    - Re-provisioned Firebase with Project ID `minigame-b258e`.
    - Re-deployed Firestore Security Rules to the new project.
    - Verified real-time connection to the new database.
- **Status:** Fixed & Verified (v6.1).

### 4. UI Refinement & Layout Cleanup
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

### 5. 音效資源遺失 (Sound Assets Missing)
- **Issue:** 玩家反應音效消失，經檢查發現 `/public/resources` 目錄下缺少 `.mp3` 檔案。
- **Fix:** 
    - 將 `App.tsx` 中的 `SOUNDS` 常數更新為指向 `assets.mixkit.co` 的公共 CDN 連結。
    - 驗證了 `playSound` 邏輯在不同觸發點（放置、翻面、得分、結束）的正確性。
    - 更新版本號至 v6.2。
- **Status:** Fixed & Verified (v6.2).

### 6. 音效資源還原至本地 (Revert to Local Sound Assets)
- **Issue:** 使用者已手動補齊本地 `/public/resources` 下的 `.mp3` 檔案，要求停止使用 CDN。
- **Fix:** 
    - 將 `App.tsx` 中的 `SOUNDS` 常數還原為本地路徑。
    - 更新版本號至 v6.3。
- **Status:** Fixed & Verified (v6.3).

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
