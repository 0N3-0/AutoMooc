# AGENTS.md

## Project Overview

Single-file browser userscript for auto-advancing video chapters in online learning platforms. No build system, no dependencies, no tests.

---

## Build/Lint/Test Commands

**No build system present.** This is a standalone JavaScript file.

### Running the Script
- **Browser**: Load via userscript manager (Tampermonkey, Violentmonkey, Greasemonkey)
- **Testing**: Manual testing in target website only

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
  // 1. Constants (SCREAMING_SNAKE_CASE)
  const SCAN_INTERVAL = 3000;
  
  // 2. Module state
  let currentVideo = null;
  
  // 3. Utility functions
  function log(...args) { ... }
  
  // 4. Business logic with section markers
  // ===== 深度查找 video =====
  function findVideoDeep(doc) { ... }
  
  // 5. Entry point
  log("脚本启动");
  scan();
})();
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Constants | `SCREAMING_SNAKE_CASE` | `SCAN_INTERVAL`, `SWITCH_DELAY` |
| Functions | `camelCase` | `findVideoDeep`, `skipNearEnd` |
| Variables | `camelCase` | `currentVideo`, `metaTimer` |
| Internal flags | `__doubleUnderscore` | `video.__endedHandled` |

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
let currentVideo = null;  // Track bound video element
```

**Element-attached flags**:
```javascript
video.__endedHandled = true;  // Prevent duplicate handling
scan.__noVideoHandled = false;  // Function-attached state
```

---

## Browser Compatibility

- **Target**: Modern browsers (ES2015+)
- **Features used**: Arrow functions, const/let, optional chaining, template literals
- **DOM APIs**: querySelector, addEventListener, Promise

---

## Modification Guidelines

### Before Making Changes

1. **Read the entire file** — only 262 lines, understand full context
2. **Test manually** — no automated tests exist
3. **Preserve IIFE wrapper** — maintains encapsulation
4. **Match existing patterns** — consistency over personal preference

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

## Project Context

**Purpose**: Automate video chapter progression in online learning platforms  
**Deployment**: Browser userscript (injected via extension)  
**Maintenance**: Single developer, manual testing only

