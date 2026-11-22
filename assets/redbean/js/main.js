(() => {
  "use strict";

  const body = document.body;
  const landing = document.getElementById("landing");
  const openBtn = document.getElementById("openMemory");
  const memory = document.getElementById("memory");
  const backBtn = document.getElementById("backBtn");
  const soundBtn = document.getElementById("soundBtn");
  const slides = [...document.querySelectorAll(".slide")];
  const dots = document.getElementById("dots");
  const counter = document.getElementById("counter");
  const playBtn = document.getElementById("playBtn");
  const playIcon = document.getElementById("playIcon");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const timeFill = document.getElementById("timeFill");
  const autoLabel = document.getElementById("autoLabel");
  const outro = document.getElementById("outro");
  const replayBtn = document.getElementById("replayBtn");
  const outroBack = document.getElementById("outroBack");
  const toast = document.getElementById("toast");
  const audio = document.getElementById("bgm");

  const params = new URLSearchParams(location.search);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const NORMAL_MS = 5600;
  const TALL_MS = 8200;
  const TOTAL = slides.length;
  const CLIMAX_START = 10;
  const CLIMAX_END = 15;

  let open = false;
  let index = 0;
  let playing = false;
  let duration = NORMAL_MS;
  let elapsed = 0;
  let lastTs = 0;
  let raf = 0;
  let landingTimer = 0;
  let audioBroken = false;
  let climax = false;
  let fadeTimer = null;
  let toastTimer = null;
  let beansRunning = false;
  let beansRaf = 0;

  const dotsEls = [];

  /* ---------- toast ---------- */

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-show"), 3600);
  }

  /* ---------- audio ---------- */

  function setSoundUI(isPlaying) {
    soundBtn.classList.toggle("is-playing", isPlaying);
    soundBtn.setAttribute("aria-pressed", String(isPlaying));
    soundBtn.setAttribute("aria-label", isPlaying ? "暂停背景音乐" : "播放背景音乐");
  }

  function targetVolume() {
    return climax ? 0.72 : 0.55;
  }

  async function playAudio(quiet = false) {
    if (audioBroken) {
      if (!quiet) showToast("BGM 暂时没有加载成功");
      return;
    }
    try {
      audio.volume = 0;
      await audio.play();
      setSoundUI(true);
      clearInterval(fadeTimer);
      const target = targetVolume();
      fadeTimer = setInterval(() => {
        if (audio.paused) { clearInterval(fadeTimer); return; }
        audio.volume = Math.min(target, audio.volume + 0.04);
        if (audio.volume >= target) clearInterval(fadeTimer);
      }, 90);
    } catch (error) {
      audioBroken = true;
      setSoundUI(false);
      if (!quiet) showToast("点一下右上角的音符，允许播放 BGM");
    }
  }

  function setClimax(next) {
    if (climax === next) return;
    climax = next;
    memory.classList.toggle("is-climax", climax);
    if (audio.paused) return;
    const target = targetVolume();
    clearInterval(fadeTimer);
    fadeTimer = setInterval(() => {
      if (audio.paused) { clearInterval(fadeTimer); return; }
      const diff = target - audio.volume;
      if (Math.abs(diff) < 0.015) {
        audio.volume = target;
        clearInterval(fadeTimer);
        return;
      }
      audio.volume += Math.sign(diff) * 0.018;
    }, 80);
  }

  function pauseAudio() {
    audio.pause();
    setSoundUI(false);
  }

  soundBtn.addEventListener("click", () => {
    if (audio.paused) playAudio(false);
    else pauseAudio();
  });

  audio.addEventListener("play", () => setSoundUI(true));
  audio.addEventListener("pause", () => setSoundUI(false));
  audio.addEventListener("error", () => { audioBroken = true; });

  /* ---------- slide engine ---------- */

  function makeDots() {
    slides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "bean-dot";
      dot.setAttribute("aria-label", "第 " + (i + 1) + " 页");
      dot.addEventListener("click", () => {
        goTo(i);
        if (!playing) togglePlay(true);
      });
      dots.appendChild(dot);
      dotsEls.push(dot);
    });
  }

  function updateChrome() {
    counter.textContent = String(index + 1).padStart(2, "0") + " / " + String(TOTAL).padStart(2, "0");
    dotsEls.forEach((dot, i) => {
      dot.classList.toggle("is-active", i === index);
      dot.classList.toggle("is-passed", i < index);
    });
    autoLabel.textContent = playing ? "AUTO" : "PAUSED";
    playIcon.textContent = playing ? "❚❚" : "▶";
    playBtn.setAttribute("aria-label", playing ? "暂停自动放映" : "继续自动放映");
    timeFill.style.width = "0%";
  }

  /* ---------- slide 14: 复古相机 · 胶卷自动放映 ---------- */

  let galleryEl = null;
  let galleryScene = null;
  let galleryRig = null;
  let galleryFramesBox = null;
  let gallerySlots = [];
  let galleryIdx = 0;
  let galleryTotal = 0;
  let galleryTimer = null;
  let galleryCountEl = null;
  let galleryLeverEl = null;
  let galleryInterval = 2500;
  let galleryMax = 6;
  let galleryStarted = false;
  let galleryParallaxHandler = null;
  let galleryParallaxRaf = 0;

  function galleryApply() {
    if (galleryEl) galleryEl.classList.add("is-started");
  }

  function galleryStopTimer() {
    if (galleryTimer) { clearInterval(galleryTimer); galleryTimer = null; }
  }

  function galleryTick() {
    if (!galleryEl) { galleryStopTimer(); return; }
    if (galleryIdx >= galleryTotal) { galleryStopTimer(); return; }
    galleryIdx = galleryIdx + 1;
    galleryReveal(galleryIdx - 1);
  }

  function galleryStartTimer() {
    if (!galleryEl || galleryTimer) return;
    galleryTimer = setInterval(galleryTick, galleryInterval);
  }

  function galleryReveal(i) {
    const slot = gallerySlots[i];
    if (!slot) return;
    slot.classList.add("is-on");
    if (galleryCountEl) galleryCountEl.textContent = String(i + 1);
    if (galleryLeverEl) {
      galleryLeverEl.classList.remove("is-winding");
      void galleryLeverEl.offsetWidth;
      galleryLeverEl.classList.add("is-winding");
    }
    const extra = gallerySlots.length - galleryMax;
    if (extra > 0) {
      const oldest = gallerySlots[i - galleryMax];
      if (oldest && oldest.classList.contains("is-on") && !oldest.classList.contains("is-fading")) {
        oldest.classList.add("is-fading");
      }
    }
  }

  function filmPhotos() {
    const el = document.getElementById("film-photos");
    if (el) {
      try {
        const arr = JSON.parse(el.textContent);
        if (Array.isArray(arr)) return arr;
      } catch (err) { /* 忽略坏数据 */ }
    }
    return [];
  }

  function galleryParallaxLeave() {
    if (galleryParallaxRaf) { cancelAnimationFrame(galleryParallaxRaf); galleryParallaxRaf = 0; }
    if (galleryRig) galleryRig.style.transform = "";
  }

  function galleryParallax(e) {
    if (galleryParallaxRaf || !galleryRig || !galleryScene) return;
    const ev = e;
    galleryParallaxRaf = requestAnimationFrame(() => {
      galleryParallaxRaf = 0;
      if (!galleryRig || !galleryScene) return;
      const r = galleryScene.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width - 0.5;
      const y = (ev.clientY - r.top) / r.height - 0.5;
      galleryRig.style.transform = "rotateY(" + (x * 3.4).toFixed(2) + "deg) rotateX(" + (-y * 2.8).toFixed(2) + "deg)";
    });
  }

  function galleryReset() {
    if (galleryScene && galleryParallaxHandler) {
      galleryScene.removeEventListener("pointermove", galleryParallaxHandler);
      galleryScene.removeEventListener("pointerleave", galleryParallaxLeave);
    }
    galleryParallaxHandler = null;
    if (galleryParallaxRaf) { cancelAnimationFrame(galleryParallaxRaf); galleryParallaxRaf = 0; }
    if (galleryEl) galleryEl.classList.remove("is-started");
    if (galleryLeverEl) galleryLeverEl.classList.remove("is-winding");
    if (galleryRig) galleryRig.style.transform = "";
  }

  /* ---------- 一条连续丝带：起伏曲线 + 端部卷曲，照片沿切线摆放 ---------- */

  function ribbonLayout(scene, slots) {
    const svg = scene.querySelector(".ribbon-svg");
    const box = scene.querySelector(".ribbon-frames");
    const w = scene.clientWidth;
    const h = scene.clientHeight;
    if (!svg || !box || !w || !h || !slots.length) return;
    const gate = scene.querySelector(".film-gate");
    const sr = scene.getBoundingClientRect();
    let gx = w * 0.2;
    let gy = h * 0.34;
    if (gate) {
      const gr = gate.getBoundingClientRect();
      gx = gr.left - sr.left + gr.width * 0.3;
      gy = gr.top - sr.top + gr.height * 0.5;
    }
    const y1 = h * 0.22;
    const y2 = h * 0.5;
    const y3 = h * 0.78;
    const pts = [
      [gx, gy],
      [gx + (w - gx) * 0.2, y1],
      [gx + (w - gx) * 0.5, y1 + h * 0.012],
      [gx + (w - gx) * 0.78, y1],
      [w * 0.95, y1 + h * 0.01],
      [w * 0.995, y1 + h * 0.14],
      [w * 0.88, y2],
      [w * 0.6, y2 + h * 0.012],
      [w * 0.34, y2],
      [w * 0.17, y2 + h * 0.02],
      [w * 0.15, y2 + h * 0.14],
      [w * 0.32, y3],
      [w * 0.58, y3 + h * 0.012],
      [w * 0.8, y3],
      [w * 0.94, y3 + h * 0.02],
      [w * 0.99, y3 + h * 0.13],
      [w * 0.92, y3 + h * 0.205],
      [w * 0.85, y3 + h * 0.14]
    ];
    const samples = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let s = 0; s < 18; s++) {
        const t = s / 18;
        const t2 = t * t;
        const t3 = t2 * t;
        const x = 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
        const y = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
        samples.push([x, y]);
      }
    }
    samples.push([pts[pts.length - 1][0], pts[pts.length - 1][1]]);
    const acc = [0];
    for (let i = 1; i < samples.length; i++) {
      acc.push(acc[i - 1] + Math.hypot(samples[i][0] - samples[i - 1][0], samples[i][1] - samples[i - 1][1]));
    }
    const total = acc[acc.length - 1];
    if (!total) return;
    const at = (dist) => {
      let lo = 0;
      let hi = acc.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (acc[mid] < dist) lo = mid + 1;
        else hi = mid;
      }
      const i = Math.min(acc.length - 1, Math.max(1, lo));
      const d0 = acc[i - 1];
      const d1 = acc[i];
      const t = d1 === d0 ? 0 : (dist - d0) / (d1 - d0);
      const a = samples[i - 1];
      const b = samples[i];
      return {
        x: a[0] + (b[0] - a[0]) * t,
        y: a[1] + (b[1] - a[1]) * t,
        ang: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI
      };
    };
    const d = samples.map((pt, i) => (i ? "L" : "M") + pt[0].toFixed(1) + " " + pt[1].toFixed(1)).join(" ");
    const spacing = (total * 0.86) / slots.length;
    const baseFW = Math.max(88, Math.min(190, spacing * 0.96));
    const baseFH = baseFW * 0.625;
    const bandW = baseFH + 26;
    const off = bandW / 2 - 6;
    const topLine = [];
    const botLine = [];
    for (let i = 0; i < samples.length; i++) {
      const a = samples[Math.max(0, i - 1)];
      const b = samples[Math.min(samples.length - 1, i + 1)];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l;
      const ny = dx / l;
      topLine.push((samples[i][0] + nx * off).toFixed(1) + " " + (samples[i][1] + ny * off).toFixed(1));
      botLine.push((samples[i][0] - nx * off).toFixed(1) + " " + (samples[i][1] - ny * off).toFixed(1));
    }
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    svg.innerHTML =
      '<defs><linearGradient id="rbBand" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#33271b"/><stop offset="0.45" stop-color="#191209"/>' +
      '<stop offset="0.8" stop-color="#241a12"/><stop offset="1" stop-color="#3b2d1d"/></linearGradient></defs>' +
      '<path d="' + d + '" fill="none" stroke="#0b0704" stroke-width="' + (bandW + 5) + '" stroke-linecap="round"/>' +
      '<path d="' + d + '" fill="none" stroke="url(#rbBand)" stroke-width="' + bandW + '" stroke-linecap="round"/>' +
      '<path d="M' + topLine.join(" L") + '" fill="none" stroke="rgba(246,228,192,0.22)" stroke-width="7" stroke-linecap="round" stroke-dasharray="9 9"/>' +
      '<path d="M' + botLine.join(" L") + '" fill="none" stroke="rgba(246,228,192,0.22)" stroke-width="7" stroke-linecap="round" stroke-dasharray="9 9"/>';
    slots.forEach((slot, i) => {
      const pt = at(spacing * (i + 0.55));
      const wob = ((i * 37) % 11) / 10 - 0.5;
      const scale = 0.9 + Math.abs(wob) * 0.22;
      const fw = baseFW * scale;
      const fh = fw * 0.625;
      let ang = pt.ang;
      if (ang > 90) ang -= 180;
      if (ang < -90) ang += 180;
      ang = Math.max(-26, Math.min(26, ang));
      const cx = Math.min(w - fw / 2 - 8, Math.max(fw / 2 + 8, pt.x));
      const cy = Math.min(h - fh / 2 - 8, Math.max(fh / 2 + 22, pt.y));
      slot.style.width = fw.toFixed(1) + "px";
      slot.style.height = fh.toFixed(1) + "px";
      slot.style.left = (cx - fw / 2).toFixed(1) + "px";
      slot.style.top = (cy - fh / 2).toFixed(1) + "px";
      slot.style.transform = "rotateY(" + (wob * 6).toFixed(1) + "deg) rotate(" + (ang + wob * 6).toFixed(1) + "deg)";
      slot.style.zIndex = String(i + 1);
    });
  }


  function galleryStart(slide) {
    galleryStopTimer();
    galleryReset();
    galleryEl = null;
    galleryScene = null;
    galleryRig = null;
    galleryFramesBox = null;
    gallerySlots = [];
    galleryIdx = 0;
    galleryTotal = 0;
    galleryCountEl = null;
    galleryLeverEl = null;
    galleryInterval = 2500;
    galleryMax = 6;
    galleryStarted = false;
    if (!slide) return;
    const scene = slide.querySelector(".film-scene");
    if (!scene) return;
    galleryEl = scene;
    galleryScene = scene;
    const sceneH = Math.round(scene.clientHeight);
    if (sceneH > 0) scene.style.setProperty("--sceneH", sceneH + "px");
    const sceneW = Math.round(scene.clientWidth);
    if (sceneW > 0) scene.style.setProperty("--sceneW", sceneW + "px");
    galleryRig = scene.querySelector(".camera-rig");
    galleryFramesBox = scene.querySelector(".roll--1");
    galleryCountEl = scene.querySelector(".counter-num");
    galleryLeverEl = scene.querySelector(".lever");
    galleryInterval = Number(scene.dataset.interval) || 2500;
    galleryMax = Number(scene.dataset.max) || 6;

    const photos = filmPhotos();
    const framesBox = scene.querySelector(".ribbon-frames");
    if (photos.length && framesBox) {
      framesBox.innerHTML = "";
      photos.forEach((src, i) => {
        const slot = document.createElement("div");
        slot.className = "frame-slot";
        const fig = document.createElement("figure");
        fig.className = "frame";
        fig.dataset.n = String(i + 1).padStart(2, "0");
        const img = document.createElement("img");
        img.src = src;
        img.alt = "搜索记录";
        img.decoding = "async";
        fig.appendChild(img);
        slot.appendChild(fig);
        framesBox.appendChild(slot);
      });
    }
    gallerySlots = Array.from(scene.querySelectorAll(".frame-slot"));
    galleryTotal = gallerySlots.length;
    ribbonLayout(scene, gallerySlots);
    if (galleryCountEl) galleryCountEl.textContent = "0";

    if (window.matchMedia("(pointer: fine)").matches &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      galleryParallaxHandler = (ev) => galleryParallax(ev);
      scene.addEventListener("pointermove", galleryParallaxHandler);
      scene.addEventListener("pointerleave", galleryParallaxLeave);
    }

    galleryStarted = true;
    galleryApply();
    if (playing) galleryStartTimer();
  }


  function showSlide(nextIndex, options = {}) {
    const next = Math.max(0, Math.min(TOTAL - 1, nextIndex));
    const old = slides[index];
    if (old !== slides[next]) {
      if (old) {
        old.classList.remove("is-active", "is-playing");
        old.setAttribute("aria-hidden", "true");
      }
    }

    index = next;
    const slide = slides[index];
    const tall = slide.dataset.tall === "true";
    const custom = Number(slide.dataset.duration);
    duration = custom > 0 ? custom : (tall ? TALL_MS : NORMAL_MS);
    const isClimax = slide.dataset.climax === "true"
      || (slide.dataset.climax !== "false" && index >= CLIMAX_START && index <= CLIMAX_END);
    setClimax(isClimax);
    elapsed = 0;

    slide.classList.add("is-active");
    slide.setAttribute("aria-hidden", "false");

    updateChrome();

    galleryStart(slide);

    if (options.autoplay === false) {
      setPlaying(false);
      timeFill.style.width = "0%";
    } else {
      setPlaying(true);
    }
  }

  function tick(ts) {
    if (!playing) return;
    if (!lastTs) lastTs = ts;
    const delta = Math.min(120, ts - lastTs);
    lastTs = ts;
    elapsed += delta;
    const progress = Math.min(1, elapsed / duration);
    timeFill.style.width = (progress * 100).toFixed(2) + "%";
    if (progress >= 1) {
      nextSlide();
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function setPlaying(next) {
    playing = next;
    cancelAnimationFrame(raf);
    lastTs = 0;
    if (playing) {
      autoLabel.textContent = "AUTO";
      playIcon.textContent = "❚❚";
      playBtn.setAttribute("aria-label", "暂停自动放映");
      raf = requestAnimationFrame(tick);
      galleryStartTimer();
    } else {
      autoLabel.textContent = "PAUSED";
      playIcon.textContent = "▶";
      playBtn.setAttribute("aria-label", "继续自动放映");
      galleryStopTimer();
    }
    if (slides[index]) {
      slides[index].classList.toggle("is-playing", playing);
    }
  }

  function togglePlay(force) {
    const next = typeof force === "boolean" ? force : !playing;
    if (next === playing) return;
    setPlaying(next);
    if (next) lastTs = 0;
  }

  function nextSlide() {
    if (index >= TOTAL - 1) {
      showOutro();
      return;
    }
    showSlide(index + 1);
  }

  function prevSlide() {
    if (index <= 0) {
      showSlide(0);
      return;
    }
    showSlide(index - 1);
  }

  function goTo(i) {
    if (i === index) {
      elapsed = 0;
      lastTs = 0;
      if (playing) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(tick);
      }
      return;
    }
    showSlide(i);
  }

  playBtn.addEventListener("click", () => togglePlay());
  nextBtn.addEventListener("click", nextSlide);
  prevBtn.addEventListener("click", prevSlide);

  document.addEventListener("keydown", (event) => {
    if (!open) return;
    if (event.key === "ArrowRight") { event.preventDefault(); nextSlide(); }
    if (event.key === "ArrowLeft") { event.preventDefault(); prevSlide(); }
    if (event.key === " ") { event.preventDefault(); togglePlay(); }
    if (event.key === "Escape") closeMemory();
  });

  /* ---------- outro ---------- */

  function showOutro() {
    setPlaying(false);
    memory.classList.add("is-outro");
    outro.hidden = false;
    outro.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => outro.classList.add("is-visible"));
    setClimax(false);
    clearInterval(fadeTimer);
    audio.volume = Math.min(audio.volume, 0.32);
    autoLabel.textContent = "END";
    setTimeout(() => replayBtn.focus({ preventScroll: true }), 500);
  }

  function hideOutro() {
    outro.classList.remove("is-visible");
    outro.setAttribute("aria-hidden", "true");
    memory.classList.remove("is-outro");
    setTimeout(() => { outro.hidden = true; }, 900);
  }

  replayBtn.addEventListener("click", () => {
    hideOutro();
    showSlide(0);
    if (audio.paused) playAudio(true);
    else { clearInterval(fadeTimer); audio.volume = 0.55; }
  });

  outroBack.addEventListener("click", closeMemory);

  /* ---------- red bean particles ---------- */

  const canvas = document.getElementById("beans");
  const ctx = canvas.getContext("2d");
  let beans = [];
  let bw = 0;
  let bh = 0;
  let dpr = 1;

  function makeBeans() {
    const count = Math.min(26, Math.max(12, Math.floor((bw * bh) / 42000)));
    beans = Array.from({ length: count }, () => ({
      x: Math.random() * bw,
      y: Math.random() * bh,
      r: Math.random() * 2.2 + 1.1,
      vy: Math.random() * 0.22 + 0.06,
      drift: Math.random() * 0.35 + 0.1,
      phase: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI,
      a: Math.random() * 0.32 + 0.08
    }));
  }

  function resizeBeans() {
    bw = window.innerWidth;
    bh = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(bw * dpr);
    canvas.height = Math.floor(bh * dpr);
    canvas.style.width = bw + "px";
    canvas.style.height = bh + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeBeans();
    if (!beansRunning) drawBeans(performance.now(), false);
  }

  function drawBeans(time, animate) {
    ctx.clearRect(0, 0, bw, bh);
    for (const bean of beans) {
      if (animate && !reduceMotion) {
        bean.y += bean.vy;
        bean.x += Math.sin(time * 0.0004 + bean.phase) * 0.08 + bean.drift * 0.01;
        if (bean.y > bh + 12) {
          bean.y = -12;
          bean.x = Math.random() * bw;
        }
      }
      ctx.save();
      ctx.translate(bean.x, bean.y);
      ctx.rotate(bean.rot + (animate ? Math.sin(time * 0.0005 + bean.phase) * 0.2 : 0));
      ctx.beginPath();
      ctx.ellipse(0, 0, bean.r * 1.25, bean.r * 0.78, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(162, 58, 51, " + bean.a + ")";
      ctx.fill();
      ctx.restore();
    }
    if (animate && !reduceMotion) beansRaf = requestAnimationFrame((t) => drawBeans(t, true));
  }

  function startBeans() {
    if (beansRunning) return;
    beansRunning = true;
    resizeBeans();
    if (!reduceMotion) {
      cancelAnimationFrame(beansRaf);
      beansRaf = requestAnimationFrame((t) => drawBeans(t, true));
    }
  }

  function stopBeans() {
    beansRunning = false;
    cancelAnimationFrame(beansRaf);
  }

  window.addEventListener("resize", () => {
    if (beansRunning) resizeBeans();
  }, { passive: true });

  /* ---------- open / close ---------- */

  function openMemory(options = {}) {
    if (open) return;
    open = true;
    const instant = Boolean(options.instant);
    if (instant) body.classList.add("instant");

    body.classList.add("locked");
    landing.classList.add("is-leaving");
    landing.setAttribute("aria-hidden", "true");
    memory.classList.add("is-active");
    memory.setAttribute("aria-hidden", "false");
    startBeans();

    const start = Number.isFinite(options.startIndex) ? options.startIndex : 0;
    showSlide(start, { autoplay: options.autoplay !== false });

    if (options.sound !== false) playAudio(true);

    clearTimeout(landingTimer);
    landingTimer = window.setTimeout(() => {
      if (open) landing.hidden = true;
    }, instant ? 20 : 980);
    window.setTimeout(() => {
      if (!instant) backBtn.focus({ preventScroll: true });
    }, instant ? 0 : 1050);
  }

  function closeMemory() {
    if (!open) return;
    open = false;
    setPlaying(false);
    setClimax(false);
    stopBeans();
    pauseAudio();
    audio.currentTime = 0;
    hideOutro();
    clearTimeout(landingTimer);
    landing.hidden = false;
    landing.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => landing.classList.remove("is-leaving"));
    memory.classList.remove("is-active");
    memory.setAttribute("aria-hidden", "true");
    body.classList.add("locked");
    window.setTimeout(() => openBtn.focus({ preventScroll: true }), 40);
  }

  openBtn.addEventListener("click", () => openMemory({ sound: true, startIndex: 0 }));
  backBtn.addEventListener("click", closeMemory);

  /* ---------- init ---------- */

  makeDots();
  index = 0;
  slides.forEach((slide, i) => {
    slide.setAttribute("aria-hidden", i === 0 ? "false" : "true");
  });
  slides[0].classList.add("is-active");
  updateChrome();
  setPlaying(false);
  resizeBeans();

  const view = params.get("view");
  if (view === "night" || view === "memory") {
    const startIndex = Number(params.get("slide") || "0");
    const staticMode = params.get("static") === "1";
    body.classList.add("instant");
    openMemory({
      sound: false,
      instant: true,
      startIndex: Number.isFinite(startIndex) ? startIndex : 0,
      autoplay: !staticMode
    });
    if (params.get("outro") === "1") {
      window.setTimeout(showOutro, 160);
    }
  }
})();
