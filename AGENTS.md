# AGENTS.md

## Project Overview

Browser userscript for auto-advancing video chapters on Chaoxing MOOC platform. Features video monitoring, playback speed control, and multiple play modes. No build system, no dependencies, no tests.

### Files
- `autoMooc.js` - Base version (standalone)
- `autoMooc.user.js` - Tampermonkey version with metadata header

### Target Platform
- Chaoxing Learning Platform (mooc1.chaoxing.com)

---

## Build/Lint/Test Commands

**No build system present.** This is a standalone JavaScript file.

### Running the Script
- **Userscript**: Install `autoMooc.user.js` via Tampermonkey/Violentmonkey
- **Standalone**: Copy `autoMooc.js` content to browser console
- **Testing**: Manual testing on mooc1.chaoxing.com only

### No Automated Tests
No test framework configured. Changes require manual verification.

### No Linting
No ESLint, Prettier, or other linters configured.

---

## Code Style Guidelines

### File Structure

**IIFE Pattern** (Immediately Invoked Function Expression):
```javascript
(function () {
  // 1. CONFIG object with all constants
  const CONFIG = { SCAN_INTERVAL: 3000, ... };
  
  // 2. Module state variables
  let currentVideo = null;
  let enabled = true;
  let playFromStart = false;
  
  // 3. Utility functions
  function log(...args) { ... }
  
  // 4. Business logic with Chinese section markers
  // ===== 深度查找 video =====
  function findVideoDeep(doc) { ... }
  
  // 5. Entry point with delay
  setTimeout(() => { scan(); }, CONFIG.PAGE_LOAD_DELAY);
})();
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Config object | `CONFIG` (all caps) | `CONFIG.SCAN_INTERVAL` |
| Constants in CONFIG | `SCREAMING_SNAKE_CASE` | `SCAN_INTERVAL`, `STUCK_THRESHOLD` |
| Functions | `camelCase` | `findVideoDeep`, `skipNearEnd`, `monitorPlayback` |
| Variables | `camelCase` | `currentVideo`, `enabled`, `preferredSpeed` |
| Internal flags | `__doubleUnderscore` | `video.__endedHandled`, `video.__timers` |

### Formatting

- **Braces**: K&R style (opening brace on same line)
- **Semicolons**: Always required
- **Spacing**: Space after `function` keyword
- **Comments**: Chinese section markers `// ===== 标题 =====`

### Error Handling

**Empty catch for expected failures**:
```javascript
try {
  const subDoc = iframe.contentDocument;
  const found = findVideoDeep(subDoc);
  if (found) return found;
} catch {}  // Cross-origin access expected to fail
```

**Logged catch for unexpected errors**:
```javascript
try {
  const doc = window.top.document;
  const v = findVideoDeep(doc);
  bind(v);
} catch (e) {
  log("扫描异常:", e);
}
```

**Promise error handling**:
```javascript
video.play()
  .then(() => log("播放成功"))
  .catch(err => log("播放失败:", err));
```

### DOM Patterns

**Query selectors**:
- Use `querySelector` for single elements
- Use `querySelectorAll` + `Array.from` for collections
- Optional chaining for safety: `el.parentElement?.className`

**Event listeners**:
```javascript
video.addEventListener("ended", handleEnd);
document.addEventListener("click", tryPlay, { once: true });
```

### Timing Patterns

**Intervals for polling**:
```javascript
setInterval(scan, SCAN_INTERVAL);  // Recurring checks
```

**Timeouts for delays**:
```javascript
setTimeout(() => {
  const confirmBtn = doc.querySelector(".nextChapter");
  if (confirmBtn) confirmBtn.click();
}, 1000);
```

### State Management

**Module-scoped state**:
```javascript
let currentVideo = null;
let enabled = true;
let playFromStart = false;
let autoRefresh = true;
let preferredSpeed = 2;
let lastProgress = 0;
let lastProgressTime = Date.now();
```

**Element-attached state**:
```javascript
video.__endedHandled = true;
video.__timers = [];  // Array of interval IDs for cleanup
scan.__noVideoHandled = false;
```

**Timer cleanup pattern**:
```javascript
function cleanupVideo(video) {
  if (video.__timers) {
    video.__timers.forEach(t => clearInterval(t));
    video.__timers = [];
  }
}
```

---

## Browser Compatibility

- **Target**: Modern browsers (ES2015+)
- **Features used**: Arrow functions, const/let, optional chaining, template literals
- **DOM APIs**: querySelector, addEventListener, Promise

---

## Modification Guidelines

### Before Making Changes

1. **Read the entire file** — ~630 lines, understand full context
2. **Test manually** — no automated tests exist
3. **Preserve IIFE wrapper** — maintains encapsulation
4. **Match existing patterns** — consistency over personal preference
5. **Version management** — optimizations use small versions (2.3.1), features use big versions (2.4.0)

### Common Tasks

**Adding new constants**:
```javascript
const NEW_CONSTANT = 1000;  // SCREAMING_SNAKE_CASE at top
```

**Adding new functions**:
```javascript
// ===== 功能描述 =====
function newFunction(param) {
  // Implementation
}
```

**Modifying selectors**:
- Test in browser console first
- Update both primary and fallback selectors if applicable

### Testing Checklist

Manual verification required for:
- [ ] Video detection works across iframes
- [ ] Auto-skip triggers at correct time
- [ ] Next chapter navigation succeeds
- [ ] PPT/quiz chapters are skipped
- [ ] No console errors in target site

---

## Configuration

All timing and behavior constants are centralized in the `CONFIG` object:

```javascript
const CONFIG = {
  SCAN_INTERVAL: 3000,              // Main loop interval (ms)
  SWITCH_DELAY: 8000,               // Chapter switch delay (ms)
  SKIP_TO_END_OFFSET: 5,            // Seconds from end when skipping
  FORCE_CHECK_INTERVAL: 3000,       // Anti-drag interval (ms)
  META_CHECK_INTERVAL: 1000,        // Metadata check interval (ms)
  PAGE_LOAD_DELAY: 5000,            // Startup delay (ms)
  STUCK_THRESHOLD: 30000,           // Stuck detection threshold (ms)
  PLAYBACK_CHECK_INTERVAL: 5000,    // Playback monitoring interval (ms)
  CONFIRM_DIALOG_DELAY: 1000,       // Confirm button click delay (ms)
  CONTROL_PANEL_DELAY: 2000,        // Control panel init delay (ms)
  END_CHECK_WINDOW: 3,              // End detection window (seconds)
  END_CHECK_COUNT: 3,               // Required consecutive checks
  VIDEO_CACHE_TTL: 2000,            // Video cache validity (ms)
  CATALOG_CACHE_TTL: 5000           // Catalog cache validity (ms)
};
```

---

## Features

### Core Features
- **Video Auto-play**: Automatically detects and plays video content across iframes
- **Chapter Navigation**: Auto-advances to next chapter when video ends
- **Skip Non-Video Content**: Automatically skips PPT, tests, quizzes, and homework chapters
- **Playback Speed Control**: Supports 0.75x, 1x, 1.25x, 1.5x, 2x speeds
- **Stuck Detection**: Refreshes page if video progress stalls for 30+ seconds

### v2.3.1 Optimizations
- **Video End Detection Enhancement**: 3-second continuous verification to prevent premature chapter switching
- **Code Refactoring**: Extracted `handlePostChapterNavigation()` and `onDurationReady()` helpers to reduce duplication
- **Configuration Consolidation**: All timing constants moved to CONFIG object (no hardcoded values)
- **Dead Code Removal**: Removed unused `END_THRESHOLD` and `rescanStats.processed` array
- **Performance Caching**: Added `VIDEO_CACHE_TTL` and `CATALOG_CACHE_TTL` to CONFIG

### v2.3 New Features
- **Chapter Completion Detection**: Detects completed chapters via `.icon_Completed` CSS class and skips them
- **Rescan Mechanism**: After first pass through all chapters, rescans for incomplete videos with detailed progress tracking
- **Completion Skip Toggle**: Control panel button to enable/disable chapter completion skipping
- **Debug Logging**: Console logs show completion detection details with emoji indicators

### Control Panel Buttons
- **暂停/恢复**: Toggle script on/off
- **跳过**: Manually skip current chapter
- **从头播放/拖到底**: Toggle play-from-start vs skip-to-end modes
- **自动刷新/禁用刷新**: Toggle auto-refresh on video stuck
- **0.75x/1x/1.25x/1.5x/2x**: Cycle playback speed
- **跳过已完成/不跳过已完成**: Toggle chapter completion detection

## Video End Detection (v2.3.1)

### Dual Detection Strategy
To prevent premature chapter switching, the script uses a two-layer detection system:

1. **Primary Detection**: `ended` event listener
   - Most accurate method
   - Triggers immediately when video naturally ends

2. **Fallback Detection**: Continuous verification (v2.3.1 enhancement)
   - Requires video to be within last 3 seconds (`END_CHECK_WINDOW`)
   - Requires 3 consecutive checks (`END_CHECK_COUNT`) over ~3 seconds
   - Counter resets if video moves away from end
   - Prevents false triggers from buffering or seeking

```javascript
// Primary: ended event
video.addEventListener("ended", handleEnd);

// Fallback: continuous verification
let endCheckCounter = 0;
if (timeRemaining <= CONFIG.END_CHECK_WINDOW) {
  endCheckCounter++;
  if (endCheckCounter >= CONFIG.END_CHECK_COUNT) {
    handleEnd();  // Confirmed end
  }
} else {
  endCheckCounter = 0;  // Reset if moved away
}
```

---

## Chapter Completion Detection

### Detection Logic
Completed chapters are identified by the presence of `.icon_Completed` class:

```javascript
function isChapterCompleted(el) {
  const item = el.closest('.posCatalog_select, li, .chapter');
  const completedIcon = item.querySelector('.icon_Completed, .icon_completed, [class*="Completed"]');
  return !!completedIcon;
}
```

### DOM Structure
```
LI (chapter container)
└── DIV.posCatalog_select
    ├── SPAN.posCatalog_name (chapter title)
    ├── EM.posCatalog_sbar
    ├── SPAN.icon_Completed.prevTips  ← Completion marker
    └── SPAN.prevHoverTips
```

## Project Context

**Purpose**: Automate video chapter progression in online learning platforms  
**Deployment**: Browser userscript (injected via extension)  
**Maintenance**: Single developer, manual testing only
**Version**: 2.3.1

