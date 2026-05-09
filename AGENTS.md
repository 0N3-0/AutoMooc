# AGENTS.md

## Project

Browser userscript for auto-advancing video chapters on Chaoxing MOOC (mooc1.chaoxing.com).
No build, lint, test, or dependencies. Manual verification on target site only.

### Files — keep in sync
- `autoMooc.js` — standalone, paste into browser console
- `autoMooc.user.js` — Tampermonkey version (same code + `==UserScript==` header, version 2.5.0)

## Architecture

IIFE `(function () { ... })();` — never break this wrapper.

**Flow:** 5s delay → `scan()` every 3s → finds `<video>` recursively across iframes → `bind()` attaches speed/stuck/end/anti-drag → video end → `next()` → advances catalog. On first-pass completion, rescans for missed incomplete chapters.

**Key selectors** (test on target site before changing):
| Selector | Purpose |
|---|---|
| `video` | Target media element |
| `.posCatalog_name` | Chapter catalog items |
| `#prevNextFocusNext` | "Next chapter" button |
| `.nextChapter` | Confirm dialog button |
| `.active`, `.curr` | Current chapter marker |
| `.icon_Completed`, `[class*="Completed"]` | Completion indicator |

## Conventions

- Chinese section markers: `// ===== 标题 =====`
- Space after `function` keyword: `function foo() {}`
- K&R braces, always semicolons, no trailing commas
- Element-attached state uses `__` prefix: `video.__endedHandled`, `video.__timers`, `scan.__noVideoHandled`
- Timer cleanup: store interval IDs in `video.__timers[]`, flush with `cleanupVideo(video)`
- All timing constants in `CONFIG` object with `SCREAMING_SNAKE_CASE` keys

## Critical rules

1. **`currentVideo` must be set to `null` after cleanup on EVERY chapter-navigation path**, or `bind()` will treat the next video as "already bound" and skip speed/controls initialization.

2. **`cleanupVideo(currentVideo)` must always precede `currentVideo = null`** — the function clears `__timers`, which won't exist on `null`.

3. **Cross-origin iframe access fails silently** — `catch {}` (no logging) on `iframe.contentDocument` is intentional.

4. **`playFromStart` defaults to `true`** — this controls `skipNearEnd()` and the anti-drag timer. When `true`, video plays from beginning and force-timer is disabled.

5. **No-video handling is gated** — `scan.__noVideoHandled` prevents `next()` from being called repeatedly on the same non-video page (resets to `false` once a video is found).

6. **`rescanStats.processed: []`** is set in `handleFirstPassComplete()` but never read — dead code, do not rely on it. The actual counting uses `total/skipped/completed/incomplete`.
