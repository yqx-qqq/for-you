(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wrap = document.querySelector(".entry-wrap");

  document.querySelectorAll("[data-transition]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const href = link.getAttribute("href");
      if (!href) return;
      event.preventDefault();
      if (wrap && !reduceMotion) {
        wrap.classList.add("fade-out");
        window.setTimeout(() => { window.location.href = href; }, 460);
      } else {
        window.location.href = href;
      }
    });
  });

  if (!reduceMotion) {
    document.body.classList.add("ready");
  }
})();
