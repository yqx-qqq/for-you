(() => {
  "use strict";

  const deck = document.getElementById("deck");
  if (!deck) return;

  const body = document.body;
  const slides = [...deck.querySelectorAll(".slide")];
  const dotsWrap = document.getElementById("deckDots");
  const progress = document.getElementById("deckProgress");
  const playBtn = document.getElementById("deckPlay");
  const playIcon = document.getElementById("deckPlayIcon");
  const prevBtn = document.getElementById("deckPrev");
  const nextBtn = document.getElementById("deckNext");
  const status = document.getElementById("deckStatus");
  const videos = [...deck.querySelectorAll("video")];

  const topFreq = document.getElementById("freqReadout");
  const consoleFreq = document.getElementById("consoleFreq");
  const needle = document.getElementById("dialNeedle");
  const startBtn = document.getElementById("startBtn");

  let index = 0;
  let playing = true;
  let duration = 0;
  let elapsed = 0;
  let startedAt = 0;
  let raf = 0;
  let tuningTimer = 0;

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
      /* canplay listener retries */
    }
  };

  videos.forEach((video) => {
    video.addEventListener("canplay", () => {
      if (video.closest(".slide")?.classList.contains("is-active") && video.paused) {
        playVideo(video);
      }
    });
  });

  const updateStation = (slide) => {
    const freq = slide.getAttribute("data-freq") || "03.0";
    const label = "FM " + freq;
    if (topFreq) topFreq.textContent = label;
    if (consoleFreq) consoleFreq.textContent = label;
    if (needle) {
      const p = slides.length > 1 ? index / (slides.length - 1) : 0;
      needle.style.transform = "rotate(" + (-58 + p * 116).toFixed(2) + "deg)";
    }
    body.classList.add("is-tuning");
    window.clearTimeout(tuningTimer);
    tuningTimer = window.setTimeout(() => body.classList.remove("is-tuning"), 420);
  };

  const updateUI = () => {
    const atEnd = index === slides.length - 1 && duration === 0;
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
    if (playIcon) playIcon.textContent = playing ? "Ⅱ" : "▶";
    if (playBtn) {
      playBtn.setAttribute("aria-label", playing ? "暂停自动放映" : atEnd ? "重新放映" : "继续自动放映");
    }
    if (status) {
      status.textContent = atEnd ? "END · 晚安" : playing ? "AUTO · 自动放映" : "PAUSED · 已暂停";
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
    updateStation(slide);
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

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      window.setTimeout(() => go(1, true), 320);
    });
  }

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
  let stripSwipe = false;
  deck.addEventListener("touchstart", (event) => {
    if (event.target && event.target.closest && event.target.closest(".food-strip")) {
      stripSwipe = true;
      return;
    }
    stripSwipe = false;
    const t = event.changedTouches[0];
    touchX = t.clientX;
    touchY = t.clientY;
  }, { passive: true });
  deck.addEventListener("touchend", (event) => {
    if (stripSwipe) {
      stripSwipe = false;
      return;
    }
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
