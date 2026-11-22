(() => {
  "use strict";

  const deck = document.getElementById("deck");
  if (!deck) return;

  const slides = [...deck.querySelectorAll(".slide")];
  const dotsWrap = document.getElementById("deckDots");
  const progress = document.getElementById("deckProgress");
  const playBtn = document.getElementById("deckPlay");
  const playIcon = document.getElementById("deckPlayIcon");
  const prevBtn = document.getElementById("deckPrev");
  const nextBtn = document.getElementById("deckNext");
  const status = document.getElementById("deckStatus");
  const videos = [...deck.querySelectorAll("video")];

  let index = 0;
  let playing = true;
  let duration = 0;
  let elapsed = 0;
  let startedAt = 0;
  let raf = 0;

  const dots = slides.map((_, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "deck-dot";
    dot.setAttribute("aria-label", "第 " + (i + 1) + " 页");
    dot.addEventListener("click", () => go(i, true));
    dotsWrap.appendChild(dot);
    return dot;
  });

  const stopTimer = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const pauseVideos = () => videos.forEach((v) => v.pause());

  const playVideo = (video) => {
    if (!video) return;
    try {
      video.currentTime = 0;
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (error) {
      /* the canplay listener below will retry when the poster is ready */
    }
  };

  videos.forEach((video) => {
    video.addEventListener("canplay", () => {
      if (video.closest(".slide")?.classList.contains("is-active") && video.paused) {
        playVideo(video);
      }
    });
  });

  const updateUI = () => {
    const atEnd = index === slides.length - 1 && duration === 0;
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
    if (playIcon) playIcon.textContent = playing ? "Ⅱ" : "▶";
    if (playBtn) {
      playBtn.setAttribute("aria-label", playing ? "暂停自动翻页" : atEnd ? "重新播放" : "继续自动翻页");
    }
    if (status) {
      status.textContent = atEnd ? "END · 已结束" : playing ? "AUTO · 自动翻页" : "PAUSED · 已暂停";
    }
  };

  const tick = (now) => {
    if (!playing || document.hidden) return;
    const p = duration > 0 ? Math.min(1, (elapsed + (now - startedAt)) / duration) : 1;
    if (progress) progress.style.width = (p * 100).toFixed(2) + "%";
    if (p >= 1) {
      go(index + 1, true);
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  const startTimer = () => {
    stopTimer();
    if (!playing || duration <= 0) return;
    startedAt = performance.now();
    raf = requestAnimationFrame(tick);
  };

  const go = (nextIndex, auto = true) => {
    stopTimer();
    pauseVideos();
    index = (nextIndex + slides.length) % slides.length;
    const slide = slides[index];
    slides.forEach((s, i) => s.classList.toggle("is-active", i === index));
    duration = Number(slide.getAttribute("data-duration")) || 0;
    elapsed = 0;
    if (progress) progress.style.width = "0%";
    const video = slide.querySelector("video");
    if (video) playVideo(video);
    if (duration > 0) {
      playing = auto;
      if (auto) startTimer();
    } else {
      playing = false;
      if (progress) progress.style.width = "100%";
    }
    updateUI();
  };

  const toggle = () => {
    if (duration === 0) {
      go(0, true);
      return;
    }
    if (playing) {
      elapsed += performance.now() - startedAt;
      playing = false;
      stopTimer();
      pauseVideos();
    } else {
      playing = true;
      const video = slides[index].querySelector("video");
      if (video) playVideo(video);
      startTimer();
    }
    updateUI();
  };

  playBtn.addEventListener("click", toggle);
  prevBtn.addEventListener("click", () => go(index - 1, true));
  nextBtn.addEventListener("click", () => go(index + 1, true));

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index + 1, true);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1, true);
    } else if (event.key === " " || event.key === "Spacebar") {
      if (event.target && /^(BUTTON|A|INPUT|TEXTAREA)$/.test(event.target.tagName)) return;
      event.preventDefault();
      toggle();
    }
  });

  let touchX = 0;
  let touchY = 0;
  deck.addEventListener("touchstart", (event) => {
    const t = event.changedTouches[0];
    touchX = t.clientX;
    touchY = t.clientY;
  }, { passive: true });
  deck.addEventListener("touchend", (event) => {
    const t = event.changedTouches[0];
    const dx = t.clientX - touchX;
    const dy = t.clientY - touchY;
    if (Math.abs(dx) < 46 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    go(index + (dx < 0 ? 1 : -1), true);
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && playing) {
      elapsed += performance.now() - startedAt;
      playing = false;
      stopTimer();
      pauseVideos();
      updateUI();
    }
  });

  go(0, true);
})();
