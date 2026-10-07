/* MAX — Wedding Photography · interactions */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const body = document.body;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if ("scrollRestoration" in history && !location.hash) history.scrollRestoration = "manual";

  /* ---------- Smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ duration: 1.25, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const scrollToEl = (el) => {
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.6 });
    else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  };

  /* ---------- Loader ---------- */
  const counter = $("[data-count]");
  const fromInside = sessionStorageGet("max-visited");
  const finishLoad = () => {
    body.classList.add("is-loaded");
    // déclenche les éléments déjà visibles
    setTimeout(checkReveals, 50);
  };
  if (fromInside || reduce) {
    $(".loader") && ($(".loader").style.display = "none");
    setTimeout(finishLoad, 30);
  } else {
    // laisse l'étoile exploser et le nom apparaître avant de lever le rideau
    const introEnd = performance.now() + 3000;
    let n = 0;
    const tick = () => {
      n = Math.min(100, n + Math.ceil((100 - n) / 9));
      if (counter) counter.textContent = n;
      if (n < 100) setTimeout(tick, 55);
      else setTimeout(finishLoad, Math.max(250, introEnd - performance.now()));
    };
    window.addEventListener("load", () => {}, { once: true });
    tick();
  }
  sessionStorageSet("max-visited", "1");

  function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

  /* ---------- Transitions de page ---------- */
  $$("a[data-transition]").forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || e.metaKey || e.ctrlKey || a.target === "_blank") return;
      const url = new URL(href, location.href);
      if (url.pathname === location.pathname && url.hash) return; // ancre interne, géré plus bas
      e.preventDefault();
      body.classList.add("is-leaving");
      setTimeout(() => (location.href = a.href), reduce ? 0 : 850);
    });
  });
  window.addEventListener("pageshow", (e) => { if (e.persisted) body.classList.remove("is-leaving"); });

  /* ---------- Ancres internes ---------- */
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a) return;
    const url = new URL(a.getAttribute("href"), location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const target = document.getElementById(url.hash.slice(1));
    if (!target) return;
    e.preventDefault();
    closeMenu();
    scrollToEl(target);
    history.replaceState(null, "", url.hash);
  });
  // arrivée avec un hash depuis une autre page
  if (location.hash) {
    const t = document.getElementById(location.hash.slice(1));
    if (t) setTimeout(() => { window.scrollTo(0, t.getBoundingClientRect().top + window.scrollY); }, 60);
  }

  /* ---------- Menu ---------- */
  const burger = $("[data-burger]");
  const menuImg = $(".menu__visual img");
  function closeMenu() { body.classList.remove("menu-open"); lenis && lenis.start(); }
  burger && burger.addEventListener("click", () => {
    const open = body.classList.toggle("menu-open");
    if (lenis) open ? lenis.stop() : lenis.start();
  });
  $$(".menu__links a").forEach((a) => {
    a.addEventListener("mouseenter", () => {
      if (!menuImg || !a.dataset.img) return;
      menuImg.classList.remove("is-on");
      setTimeout(() => { menuImg.src = a.dataset.img; menuImg.classList.add("is-on"); }, 200);
    });
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

  /* ---------- Header ---------- */
  const header = $("[data-header]");
  let lastY = 0;
  const onHeader = (y) => {
    if (!header) return;
    const threshold = header.hasAttribute("data-ink") ? 40 : window.innerHeight * 0.85;
    header.classList.toggle("is-solid", y > threshold);
    header.classList.toggle("is-hidden", y > lastY && y > 300 && !body.classList.contains("menu-open"));
    lastY = y;
  };

  /* ---------- Split des mots (manifeste) ---------- */
  $$("[data-words]").forEach((el) => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(" ");
  });

  /* ---------- Reveal ---------- */
  const revealEls = $$("[data-reveal], .split-line");
  let io = null;
  if ("IntersectionObserver" in window && !reduce) {
    io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
  }
  function checkReveals() {
    revealEls.forEach((el) => (io ? io.observe(el) : el.classList.add("in")));
  }
  // les éléments d'un même parent apparaissent en cascade
  const stagger = new Map();
  revealEls.forEach((el) => {
    const p = el.parentElement;
    const i = stagger.get(p) || 0;
    if (!el.closest(".hero")) el.style.transitionDelay = `${Math.min(i, 5) * 0.09}s`;
    stagger.set(p, i + 1);
  });

  /* ---------- Compteurs ---------- */
  $$("[data-counter]").forEach((el) => {
    const end = +el.dataset.counter, suf = el.dataset.suffix || "";
    const run = () => {
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / 1800), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
        el.textContent = v + suf;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (reduce || !("IntersectionObserver" in window)) { el.textContent = end + suf; return; }
    const o = new IntersectionObserver(([en]) => { if (en.isIntersecting) { run(); o.disconnect(); } }, { threshold: 0.5 });
    o.observe(el);
  });

  /* ---------- Scroll horizontal ---------- */
  const hs = $("[data-hscroll]");
  const track = $("[data-htrack]");
  const hprog = $("[data-hprogress]");
  let hDist = 0;
  const sizeH = () => {
    if (!hs || !track) return;
    hDist = Math.max(0, track.scrollWidth - window.innerWidth);
    hs.style.height = `${hDist + window.innerHeight}px`;
  };
  const onH = () => {
    if (!hs || !track) return;
    const r = hs.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / (hDist || 1)));
    track.style.transform = `translate3d(${-p * hDist}px,0,0)`;
    if (hprog) hprog.style.transform = `scaleX(${p})`;
  };

  /* ---------- Parallaxe ---------- */
  const pars = $$("[data-speed]");
  const onPar = () => {
    if (reduce || window.innerWidth <= 820) { pars.forEach((el) => (el.style.transform = "")); return; }
    const vh = window.innerHeight;
    pars.forEach((el) => {
      const r = (el.closest(".img-reveal") || el.parentElement).getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const d = (r.top + r.height / 2 - vh / 2) * +el.dataset.speed;
      const s = el.closest(".has-parallax") ? " scale(1.12)" : "";
      el.style.transform = `translate3d(0,${d}px,0)${s}`;
    });
  };

  /* ---------- Hero zoom ---------- */
  const heroMedia = $("[data-hero-media]");
  const onHero = (y) => {
    if (!heroMedia || reduce) return;
    const vh = window.innerHeight;
    if (y > vh) return;
    heroMedia.style.transform = `translate3d(0,${y * 0.35}px,0)`;
    heroMedia.style.opacity = 1 - (y / vh) * 0.6;
  };

  /* ---------- Mots du manifeste ---------- */
  const wordsBlocks = $$("[data-words]");
  const onWords = () => {
    const vh = window.innerHeight;
    wordsBlocks.forEach((b) => {
      const r = b.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      const ws = b.children, n = Math.floor(p * ws.length * 1.05);
      for (let i = 0; i < ws.length; i++) ws[i].classList.toggle("on", i < n);
    });
  };

  /* ---------- Marquee piloté par le scroll ---------- */
  const mq = $("[data-marquee]");
  let mqX = 0, vel = 0, prevY = window.scrollY;
  const mqLoop = () => {
    if (mq) {
      const half = mq.scrollWidth / 2;
      mqX -= 0.6 + Math.min(12, Math.abs(vel) * 0.25);
      if (-mqX >= half) mqX += half;
      mq.style.transform = `translate3d(${mqX}px,0,0)`;
    }
    vel *= 0.9;
    requestAnimationFrame(mqLoop);
  };
  if (!reduce) requestAnimationFrame(mqLoop);

  /* ---------- Boucle de scroll ---------- */
  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    vel = y - prevY; prevY = y;
    onHeader(y);
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      onHero(y); onH(); onPar(); onWords();
      ticking = false;
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => { sizeH(); onScroll(); });
  window.addEventListener("load", () => { sizeH(); onScroll(); });
  sizeH(); onScroll();

  /* ---------- Curseur ---------- */
  if (finePointer && !reduce) {
    const dot = $(".cursor"), lab = $(".cursor__label");
    let mx = innerWidth / 2, my = innerHeight / 2, lx = mx, ly = my;
    window.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate3d(${mx}px,${my}px,0)`; });
    const loop = () => {
      lx += (mx - lx) * 0.16; ly += (my - ly) * 0.16;
      lab.style.left = lx + "px"; lab.style.top = ly + "px";
      requestAnimationFrame(loop);
    };
    loop();
    $$("[data-cursor]").forEach((el) => {
      el.addEventListener("mouseenter", () => body.classList.add("cursor-view"));
      el.addEventListener("mouseleave", () => body.classList.remove("cursor-view"));
    });
  } else {
    $$("[data-cursor]").forEach((el) => (el.style.cursor = "pointer"));
  }

  /* ---------- Lightbox ---------- */
  const lb = $("[data-lightbox]");
  if (lb) {
    const tiles = $$("[data-gallery] .tile img");
    const lbImg = $("img", lb), lbCount = $("[data-lb-count]", lb);
    let idx = 0;
    const show = (i) => {
      idx = (i + tiles.length) % tiles.length;
      lbImg.style.opacity = 0;
      setTimeout(() => {
        lbImg.src = tiles[idx].src; lbImg.alt = tiles[idx].alt;
        lbImg.onload = () => (lbImg.style.opacity = 1);
      }, 180);
      lbCount.textContent = `${String(idx + 1).padStart(2, "0")} / ${String(tiles.length).padStart(2, "0")}`;
    };
    const open = (i) => { show(i); lb.classList.add("is-open"); lb.setAttribute("aria-hidden", "false"); lenis && lenis.stop(); body.classList.remove("cursor-view"); };
    const close = () => { lb.classList.remove("is-open"); lb.setAttribute("aria-hidden", "true"); lenis && lenis.start(); };
    tiles.forEach((t, i) => t.closest(".tile").addEventListener("click", () => open(i)));
    $("[data-lb-close]", lb).addEventListener("click", close);
    $("[data-lb-prev]", lb).addEventListener("click", () => show(idx - 1));
    $("[data-lb-next]", lb).addEventListener("click", () => show(idx + 1));
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") show(idx + 1);
      if (e.key === "ArrowLeft") show(idx - 1);
    });
  }

  /* ---------- Formulaire de contact (mailto) ---------- */
  const form = $("[data-form]");
  if (form) {
    const params = new URLSearchParams(location.search);
    const msg = $("#f-msg"), offer = $("#f-offer");
    if (params.get("tirage") && msg) msg.value = `Bonjour Max, j'aimerais un tirage : ${params.get("tirage")}.\n\n`;
    if (params.get("collection") && offer) offer.value = params.get("collection");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const d = new FormData(form);
      const to = ($("[data-email]") || {}).textContent || "";
      const subject = `Mariage — ${d.get("names") || ""}${d.get("date") ? " — " + d.get("date") : ""}`;
      const lines = [
        `Prénoms : ${d.get("names") || ""}`,
        `E-mail : ${d.get("email") || ""}`,
        `Date : ${d.get("date") || ""}`,
        `Lieu : ${d.get("place") || ""}`,
        `Invités : ${d.get("guests") || ""}`,
        `Collection : ${d.get("offer") || ""}`,
        "",
        d.get("message") || "",
      ];
      location.href = `mailto:${to.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
    });
  }

  /* ---------- Caisse américaine : inclinaison au survol ---------- */
  const mock = $("[data-mock]"), ca = $("[data-ca]");
  if (mock && ca && !reduce) {
    mock.addEventListener("mousemove", (e) => {
      const r = mock.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      ca.style.setProperty("--ry", `${14 - x * 14}deg`);
      ca.style.setProperty("--rx", `${y * -5}deg`);
    });
    mock.addEventListener("mouseleave", () => { ca.style.removeProperty("--ry"); ca.style.removeProperty("--rx"); });
  }

  /* ---------- FAQ ---------- */
  $$("[data-faq] .qa").forEach((q) => {
    const btn = $(".qa__s", q);
    btn.addEventListener("click", () => {
      const open = q.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open);
    });
  });

  /* ---------- Année ---------- */
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
