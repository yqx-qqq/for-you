(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- stars ---------- */
  const canvas = document.getElementById("stars");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    let stars = [];
    let dpr = 1;

    const makeStars = () => {
      const count = window.innerWidth < 620 ? 90 : 150;
      stars = Array.from({ length: count }, () => ({
        x: Math.random(),
        y: Math.random() * 0.92,
        r: Math.random() * 1.15 + 0.25,
        a: Math.random() * 0.55 + 0.15,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.35 + 0.12,
        warm: Math.random() > 0.82,
        glow: Math.random() > 0.88,
      }));
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      makeStars();
    };

    const paint = (t) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const flicker = reduceMotion ? 1 : 0.55 + 0.45 * Math.sin(t * 0.001 * s.speed + s.phase);
        const alpha = Math.max(0, s.a * flicker);
        const x = s.x * w;
        const y = s.y * h;
        ctx.beginPath();
        ctx.fillStyle = s.warm
          ? "rgba(240, 213, 173, " + alpha + ")"
          : "rgba(208, 224, 255, " + alpha + ")";
        if (s.glow) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = s.warm ? "rgba(240, 213, 173, 0.5)" : "rgba(180, 208, 255, 0.45)";
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });

    if (reduceMotion) {
      paint(0);
    } else {
      let start = performance.now();
      const loop = (now) => {
        paint(now - start);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }

  /* ---------- toast ---------- */
  const toast = document.getElementById("toast");
  let toastTimer = 0;
  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3200);
  };

  /* ---------- lightbox ---------- */
  const lightbox = document.getElementById("lightbox");
  if (lightbox) {
    const lightboxImg = document.getElementById("lightboxImg");
    const lightboxCaption = document.getElementById("lightboxCaption");
    const closeBtn = document.getElementById("lightboxClose");
    let lastFocus = null;

    const close = () => {
      lightbox.hidden = true;
      document.body.classList.remove("locked");
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    };

    const open = (button) => {
      lastFocus = button;
      lightboxImg.src = button.dataset.full || button.querySelector("img").src;
      lightboxImg.alt = button.querySelector("img")?.alt || "";
      lightboxCaption.textContent = button.dataset.caption || "";
      lightbox.hidden = false;
      document.body.classList.add("locked");
      closeBtn.focus({ preventScroll: true });
    };

    document.querySelectorAll(".card-button").forEach((button) => {
      button.addEventListener("click", () => open(button));
    });

    closeBtn.addEventListener("click", close);
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) close();
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !lightbox.hidden) close();
    });
  }

  /* ---------- audio ---------- */
  const bgm = document.getElementById("bgm");
  const player = document.getElementById("player");
  if (bgm && player) {
    const playBtn = document.getElementById("playBtn");
    const progress = document.getElementById("progress");
    const time = document.getElementById("time");
    let fadeTimer = 0;
    let missing = false;

    const fmt = (seconds) => {
      if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60).toString().padStart(2, "0");
      return m + ":" + s;
    };

    const fadeTo = (target, ms) => {
      clearInterval(fadeTimer);
      const from = bgm.volume;
      const start = performance.now();
      fadeTimer = window.setInterval(() => {
        const t = Math.min(1, (performance.now() - start) / ms);
        bgm.volume = Math.max(0, Math.min(1, from + (target - from) * t));
        if (t >= 1) clearInterval(fadeTimer);
      }, 40);
    };

    const markMissing = () => {
      if (missing) return;
      missing = true;
      player.classList.add("is-missing");
      player.classList.remove("playing");
      showToast("音乐还没放进来：把 MP3 放到 assets/audio/xiangni.mp3");
    };

    bgm.addEventListener("error", markMissing);

    playBtn.addEventListener("click", async () => {
      if (missing) {
        showToast("把《想你想你》的 MP3 放到 assets/audio/xiangni.mp3");
        return;
      }
      if (bgm.paused) {
        try {
          bgm.volume = 0;
          await bgm.play();
          player.classList.add("playing");
          fadeTo(0.55, 1200);
        } catch (error) {
          markMissing();
        }
      } else {
        fadeTo(0, 250);
        window.setTimeout(() => bgm.pause(), 260);
        player.classList.remove("playing");
      }
    });

    bgm.addEventListener("timeupdate", () => {
      if (progress && bgm.duration) {
        progress.style.width = ((bgm.currentTime / bgm.duration) * 100).toFixed(2) + "%";
      }
      if (time) time.textContent = fmt(bgm.currentTime);
    });

    bgm.addEventListener("loadedmetadata", () => {
      if (time) time.textContent = fmt(bgm.currentTime);
    });

    bgm.addEventListener("play", () => player.classList.add("playing"));
    bgm.addEventListener("pause", () => player.classList.remove("playing"));
  }

  /* ---------- entry transition ---------- */
  const sentence = document.querySelector(".sentence");
  if (sentence) {
    sentence.addEventListener("click", (event) => {
      const href = sentence.getAttribute("href");
      if (!href) return;
      event.preventDefault();
      const wrap = document.querySelector(".entry-wrap");
      if (wrap) wrap.classList.add("fade-out");
      window.setTimeout(() => {
        window.location.href = href;
      }, 480);
    });
  }
})();
