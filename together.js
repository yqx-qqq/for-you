(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const body = document.body;

  /* ---------- audio ---------- */

  const bgm = document.getElementById("bgm");
  const player = document.getElementById("player");
  const playBtn = document.getElementById("playBtn");
  const soundBtn = document.getElementById("soundBtn");
  const startBtn = document.getElementById("startBtn");
  const progress = document.getElementById("progress");
  const time = document.getElementById("time");

  let fadeTimer = 0;
  let audioReady = Boolean(bgm);

  const fmt = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return m + ":" + s;
  };

  const fadeTo = (target, ms) => {
    if (!bgm) return;
    window.clearInterval(fadeTimer);
    const from = bgm.volume;
    const started = performance.now();
    fadeTimer = window.setInterval(() => {
      const t = Math.min(1, (performance.now() - started) / ms);
      bgm.volume = Math.max(0, Math.min(1, from + (target - from) * t));
      if (t >= 1) window.clearInterval(fadeTimer);
    }, 40);
  };

  const setPlayingUI = (playing) => {
    if (player) player.classList.toggle("playing", playing);
    if (soundBtn) soundBtn.setAttribute("aria-pressed", playing ? "true" : "false");
    body.classList.toggle("audio-playing", playing);
  };

  const startAudio = async () => {
    if (!bgm || !audioReady) return false;
    if (!bgm.paused) return true;
    try {
      bgm.volume = 0;
      await bgm.play();
      setPlayingUI(true);
      fadeTo(0.38, 1400);
      return true;
    } catch (error) {
      audioReady = false;
      setPlayingUI(false);
      return false;
    }
  };

  const stopAudio = () => {
    if (!bgm || bgm.paused) return;
    fadeTo(0, 260);
    setPlayingUI(false);
    window.setTimeout(() => {
      if (bgm.volume === 0) bgm.pause();
    }, 280);
  };

  const toggleAudio = () => {
    if (!bgm) return;
    if (bgm.paused) startAudio();
    else stopAudio();
  };

  if (bgm) {
    bgm.addEventListener("timeupdate", () => {
      if (progress && bgm.duration) {
        progress.style.width = ((bgm.currentTime / bgm.duration) * 100).toFixed(2) + "%";
      }
      if (time) time.textContent = fmt(bgm.currentTime);
    });
    bgm.addEventListener("loadedmetadata", () => {
      if (time) time.textContent = fmt(bgm.currentTime);
    });
    bgm.addEventListener("play", () => setPlayingUI(true));
    bgm.addEventListener("pause", () => setPlayingUI(false));
    bgm.addEventListener("error", () => {
      audioReady = false;
      setPlayingUI(false);
    });
  }

  if (playBtn) playBtn.addEventListener("click", toggleAudio);
  if (soundBtn) soundBtn.addEventListener("click", toggleAudio);

  if (startBtn) {
    startBtn.addEventListener("click", async () => {
      await startAudio();
      const target = document.getElementById("silly");
      const deck = document.getElementById("deck");
      if (target && !deck) {
        window.setTimeout(() => {
          target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        }, 420);
      }
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && bgm && !bgm.paused) {
      stopAudio();
    }
  });

  /* ---------- read progress ---------- */

  const readBar = document.getElementById("readBar");
  let ticking = false;

  const updateReadBar = () => {
    if (!readBar) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    readBar.style.width = (p * 100).toFixed(2) + "%";
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      updateReadBar();
      ticking = false;
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", updateReadBar);
  updateReadBar();

  /* ---------- reveal ---------- */

  const reveals = [...document.querySelectorAll(".reveal")];
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- Live Photo lightbox ---------- */

  const lightbox = document.getElementById("lightbox");
  const lightboxVideo = document.getElementById("lightboxVideo");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxClose = document.getElementById("lightboxClose");
  let lastTrigger = null;

  const openLightbox = (trigger) => {
    if (!lightbox || !lightboxVideo) return;
    const src = trigger.getAttribute("data-video");
    if (!src) return;
    lastTrigger = trigger;
    lightboxVideo.src = src;
    if (lightboxCaption) lightboxCaption.textContent = trigger.getAttribute("data-caption") || "";
    lightbox.hidden = false;
    body.style.overflow = "hidden";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    const p = lightboxVideo.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
    if (lightboxClose) lightboxClose.focus({ preventScroll: true });
  };

  const closeLightbox = () => {
    if (!lightbox || !lightboxVideo) return;
    lightboxVideo.pause();
    lightboxVideo.removeAttribute("src");
    lightboxVideo.load();
    lightbox.hidden = true;
    body.style.overflow = "";
    if (lastTrigger) lastTrigger.focus({ preventScroll: true });
  };

  document.querySelectorAll("[data-video]").forEach((trigger) => {
    trigger.addEventListener("click", () => openLightbox(trigger));
  });

  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightbox) {
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });
  }

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox && !lightbox.hidden) closeLightbox();
  });
})();
