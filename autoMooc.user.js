// ==UserScript==
// @name         超星学习通自动刷课
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  自动播放视频、跳过章节、倍速播放、卡顿检测
// @author       You
// @match        https://mooc1.chaoxing.com/mycourse/studentstudy*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=chaoxing.com
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  // ===== 配置常量 =====
  const CONFIG = {
    SCAN_INTERVAL: 3000,
    SWITCH_DELAY: 5000,
    SKIP_TO_END_OFFSET: 5,
    END_THRESHOLD: 0.5,
    FORCE_CHECK_INTERVAL: 3000,
    META_CHECK_INTERVAL: 1000,
    PAGE_LOAD_DELAY: 5000,
    STUCK_THRESHOLD: 30000,
    PLAYBACK_CHECK_INTERVAL: 5000
  };

  let currentVideo = null;
  let enabled = true;
  let playFromStart = false;
  let autoRefresh = true;
  let preferredSpeed = 2;
  let lastProgress = 0;
  let lastProgressTime = Date.now();

  function log(...args) {
    console.log("[AutoNext]", ...args);
  }

  // ===== 深度查找 video =====
  function findVideoDeep(doc) {
    if (!doc) return null;

    const v = doc.querySelector("video");
    if (v) return v;

    const iframes = doc.querySelectorAll("iframe");

    for (const iframe of iframes) {
      try {
        const subDoc = iframe.contentDocument;
        if (!subDoc) continue;

        const found = findVideoDeep(subDoc);
        if (found) return found;
      } catch {}
    }

    return null;
  }

  // ===== 跳到接近结尾 =====
  function skipNearEnd(video) {
    if (!enabled || playFromStart) return false;
    
    if (!isFinite(video.duration) || video.duration === 0) {
      log("duration 不可用");
      return false;
    }

    const target = Math.max(video.duration - CONFIG.SKIP_TO_END_OFFSET, 0);
    video.currentTime = target;

    log("跳到接近结尾:", target, "/", video.duration);
    return true;
  }

  // ===== 获取目录 =====
  function getCatalogItems() {
    const doc = window.top.document;

    return Array.from(doc.querySelectorAll(".posCatalog_name")).map(el => ({
      el,
      title: el.getAttribute("title") || ""
    }));
  }

  // ===== 判断是否跳过 =====
  function isSkipChapter(title) {
    return /(PPT|测试|测验|作业|quiz)/i.test(title);
  }

  // ===== 找当前章节 =====
  function findCurrentIndex(list) {
    for (let i = 0; i < list.length; i++) {
      const el = list[i].el;

      const cls = el.className || "";
      const pcls = el.parentElement?.className || "";

      if (
        cls.includes("active") ||
        pcls.includes("active") ||
        cls.includes("curr") ||
        pcls.includes("curr")
      ) {
        return i;
      }
    }
    return 0;
  }

  // ===== 点击下一节按钮 =====
  function clickNextButton() {
    const doc = window.top.document;

    const mainBtn = doc.querySelector("#prevNextFocusNext");

    if (mainBtn) {
      log("点击主 下一节");
      mainBtn.click();

      setTimeout(() => {
        const confirmBtn = doc.querySelector(".nextChapter");
        if (confirmBtn) {
          log("点击确认 下一节");
          confirmBtn.click();
        }
      }, 1000);

      return true;
    }

    return false;
  }

  // ===== fallback 跳转 =====
  function jumpNextValid(list, startIndex) {
    for (let i = startIndex + 1; i < list.length; i++) {
      if (!isSkipChapter(list[i].title)) {
        log("fallback 跳转:", i, list[i].title);
        list[i].el.click();
        return true;
      } else {
        log("跳过:", list[i].title);
      }
    }
    return false;
  }

  // ===== 切换章节 =====
  function next() {
    const list = getCatalogItems();
    if (!list.length) {
      log("目录为空");
      return;
    }

    const current = findCurrentIndex(list);
    const { title } = list[current];

    log("当前章节:", current, title);

    // ===== 当前是跳过类型 =====
    if (isSkipChapter(title)) {
      log("当前是跳过章节 → index跳");

      if (!jumpNextValid(list, current)) {
        log("没有后续视频");
      }

      setTimeout(scan, CONFIG.SWITCH_DELAY);
      return;
    }

    // ===== 正常视频 =====
    log("正常视频 → 按钮跳转");

    if (!clickNextButton()) {
      log("按钮失败 → fallback");

      if (!jumpNextValid(list, current)) {
        log("没有后续视频");
      }
    }

    setTimeout(scan, CONFIG.SWITCH_DELAY);
  }

  // ===== 清理视频资源 =====
  function cleanupVideo(video) {
    if (!video) return;
    if (video.__timers) {
      video.__timers.forEach(t => clearInterval(t));
      video.__timers = [];
    }
  }

  // ===== 设置播放速度 =====
  function setPlaybackSpeed(video, speed) {
    try {
      video.playbackRate = speed;
      log("设置速度:", speed + "x");
    } catch (e) {
      log("设置速度失败:", e);
    }
  }

  // ===== 监控播放进度 =====
  function monitorPlayback(video) {
    const monitor = setInterval(() => {
      if (!video || video.ended || !autoRefresh) {
        clearInterval(monitor);
        return;
      }

      const currentTime = video.currentTime;
      const now = Date.now();

      if (Math.abs(currentTime - lastProgress) < 0.1) {
        if (now - lastProgressTime > CONFIG.STUCK_THRESHOLD) {
          log("视频卡住超过30秒，刷新页面");
          location.reload();
        }
      } else {
        lastProgress = currentTime;
        lastProgressTime = now;
      }
    }, CONFIG.PLAYBACK_CHECK_INTERVAL);
    video.__timers.push(monitor);
  }

  // ===== 绑定 video =====
  function bind(video) {
    if (!video || video === currentVideo) return;
    
    cleanupVideo(currentVideo);
    currentVideo = video;
    video.__timers = [];

    log("=== 绑定新 video ===");

    function tryPlay() {
      video.muted = true;
      video.volume = 0;

      video.play()
        .then(() => log("播放成功"))
        .catch(err => log("播放失败:", err));
    }

    document.addEventListener("click", tryPlay, { once: true });
    tryPlay();

    setPlaybackSpeed(video, preferredSpeed);
    monitorPlayback(video);

    // ===== 等待 duration =====
    function waitForDuration() {
      if (isFinite(video.duration) && video.duration > 0) {
        log("duration:", video.duration);
        if (!playFromStart) skipNearEnd(video);
      } else {
        video.addEventListener("loadedmetadata", () => {
          log("duration:", video.duration);
          if (!playFromStart) skipNearEnd(video);
        }, { once: true });
        
        const metaTimer = setInterval(() => {
          if (isFinite(video.duration) && video.duration > 0) {
            log("duration:", video.duration);
            if (!playFromStart) skipNearEnd(video);
            clearInterval(metaTimer);
          }
        }, CONFIG.META_CHECK_INTERVAL);
        video.__timers.push(metaTimer);
      }
    }
    waitForDuration();

    // ===== 防拖回 =====
    const forceTimer = setInterval(() => {
      if (!video || video.ended || !enabled || playFromStart) {
        clearInterval(forceTimer);
        return;
      }

      if (isFinite(video.duration) && video.duration > CONFIG.SKIP_TO_END_OFFSET) {
        if (video.currentTime < video.duration - CONFIG.SKIP_TO_END_OFFSET) {
          log("强制拉进度");
          video.currentTime = video.duration - CONFIG.SKIP_TO_END_OFFSET;
        }
      }
    }, CONFIG.FORCE_CHECK_INTERVAL);
    video.__timers.push(forceTimer);

    // ===== 结束 =====
    function handleEnd() {
      if (video.__endedHandled) return;
      video.__endedHandled = true;

      log("播放结束 → 下一节");
      cleanupVideo(video);
      next();
    }

    video.addEventListener("ended", handleEnd);

    // ===== 兜底 =====
    const endCheck = setInterval(() => {
      if (video.__endedHandled) {
        clearInterval(endCheck);
        return;
      }

      if (
        isFinite(video.duration) &&
        video.currentTime >= video.duration - CONFIG.END_THRESHOLD
      ) {
        log("检测到结尾 → 强制结束");
        handleEnd();
      }
    }, CONFIG.META_CHECK_INTERVAL);
    video.__timers.push(endCheck);
  }

  // ===== 扫描 =====
  function scan() {
    if (!enabled) return;
    
    try {
      const doc = window.top.document;
      const v = findVideoDeep(doc);

      // ⭐ 没有 video = PPT/测试页面
      if (!v) {
        log("未找到 video → 判定为非视频页面");

        // 防止疯狂触发
        if (!scan.__noVideoHandled) {
          scan.__noVideoHandled = true;
          next();
        }
        return;
      }

      scan.__noVideoHandled = false;
      bind(v);

    } catch (e) {
      log("扫描异常:", e);
    }
  }

  // ===== 控制面板 =====
  function createControls() {
    if (document.getElementById("autoMooc-panel")) return;
    
    const panel = document.createElement("div");
    panel.id = "autoMooc-panel";
    panel.innerHTML = `
      <span id="autoMooc-status">运行中</span>
      <button id="autoMooc-toggle">暂停</button>
      <button id="autoMooc-skip">跳过</button>
      <button id="autoMooc-mode">${playFromStart ? "从头播放" : "拖到底"}</button>
      <button id="autoMooc-refresh">${autoRefresh ? "自动刷新" : "禁用刷新"}</button>
      <button id="autoMooc-speed">${preferredSpeed}x</button>
    `;
    panel.style.cssText = `
      position: fixed; top: 10px; right: 10px; z-index: 99999;
      background: rgba(0,0,0,0.8); color: #fff; padding: 10px;
      border-radius: 8px; font-size: 14px; display: flex; gap: 10px;
      align-items: center; flex-wrap: wrap;
    `;
    
    setTimeout(() => {
      document.body.appendChild(panel);
      
      document.getElementById("autoMooc-toggle").onclick = () => {
        enabled = !enabled;
        document.getElementById("autoMooc-status").textContent = enabled ? "运行中" : "已暂停";
        document.getElementById("autoMooc-toggle").textContent = enabled ? "暂停" : "恢复";
        log(enabled ? "脚本已恢复" : "脚本已暂停");
      };
      
      document.getElementById("autoMooc-skip").onclick = () => {
        log("手动跳过");
        next();
      };
      
      document.getElementById("autoMooc-mode").onclick = () => {
        playFromStart = !playFromStart;
        document.getElementById("autoMooc-mode").textContent = playFromStart ? "从头播放" : "拖到底";
        log(playFromStart ? "切换到从头播放模式" : "切换到拖到底模式");
      };
      
      document.getElementById("autoMooc-refresh").onclick = () => {
        autoRefresh = !autoRefresh;
        document.getElementById("autoMooc-refresh").textContent = autoRefresh ? "自动刷新" : "禁用刷新";
        log(autoRefresh ? "启用自动刷新" : "禁用自动刷新");
      };
      
      document.getElementById("autoMooc-speed").onclick = () => {
        const speeds = [0.75, 1, 1.25, 1.5, 2];
        const idx = speeds.indexOf(preferredSpeed);
        preferredSpeed = speeds[(idx + 1) % speeds.length];
        document.getElementById("autoMooc-speed").textContent = preferredSpeed + "x";
        if (currentVideo) setPlaybackSpeed(currentVideo, preferredSpeed);
        log("切换速度:", preferredSpeed + "x");
      };
    }, 2000);
  }

  // ===== 启动 =====
  log("脚本启动，等待页面加载...");
  
  setTimeout(() => {
    log("开始运行");
    createControls();
    scan();
    setInterval(scan, CONFIG.SCAN_INTERVAL);
  }, CONFIG.PAGE_LOAD_DELAY);

})();
