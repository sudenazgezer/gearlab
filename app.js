/* GearLab: gears, converter, badges & confetti. No frameworks. */
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ================= Gears ================= */

  // Build an SVG path for a gear centred on (0,0). Gears sharing the same
  // module (m) have the same tooth pitch, so they mesh.
  function gearPath(teeth, m, holes = []) {
    const r = (m * teeth) / 2;
    const ro = r + 0.85 * m;     // tip radius
    const ri = r - 1.25 * m;     // root radius
    const p = (2 * Math.PI) / teeth;
    const pt = (rad, a) => `${(rad * Math.cos(a)).toFixed(2)} ${(rad * Math.sin(a)).toFixed(2)}`;

    let d = "";
    for (let i = 0; i < teeth; i++) {
      const c = i * p;
      d += (i === 0 ? "M" : "L") + pt(ri, c - 0.5 * p);
      d += "L" + pt(ri, c - 0.28 * p);
      d += "L" + pt(ro, c - 0.15 * p);
      d += "L" + pt(ro, c + 0.15 * p);
      d += "L" + pt(ri, c + 0.28 * p);
    }
    d += "Z";

    // Holes are extra circular sub-paths; fill-rule: evenodd cuts them out.
    for (const [hx, hy, hr] of holes) {
      d += `M${hx + hr} ${hy}A${hr} ${hr} 0 1 0 ${hx - hr} ${hy}A${hr} ${hr} 0 1 0 ${hx + hr} ${hy}Z`;
    }
    return d;
  }

  function ringHoles(count, dist, radius) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.PI / count;
      out.push([dist * Math.cos(a), dist * Math.sin(a), radius]);
    }
    return out;
  }

  const MODULE = 10;
  // Gear A drives B, B drives C. Each gear has a centre, tooth count and the
  // direction (radians) to the gear it is driven by.
  const gearA = { el: $("#gearA"), x: 170, y: 190, teeth: 20 };
  const gearB = { el: $("#gearB"), teeth: 12, from: gearA, dir: -Math.PI / 6 };
  const gearC = { el: $("#gearC"), teeth: 8, from: gearB, dir: Math.PI / 6 };
  const gears = [gearA, gearB, gearC];

  for (const g of gears) {
    g.pitch = (2 * Math.PI) / g.teeth;
    if (g.from) {
      const dist = (MODULE * (g.teeth + g.from.teeth)) / 2;
      g.x = g.from.x + dist * Math.cos(g.dir);
      g.y = g.from.y + dist * Math.sin(g.dir);
    }
  }

  gearA.el.firstElementChild.setAttribute("d", gearPath(20, MODULE, [[0, 0, 18], ...ringHoles(6, 56, 17)]));
  gearB.el.firstElementChild.setAttribute("d", gearPath(12, MODULE, [[0, 0, 13], ...ringHoles(4, 32, 10)]));
  gearC.el.firstElementChild.setAttribute("d", gearPath(8, MODULE, [[0, 0, 11]]));
  $("#logoGearPath").setAttribute("d", gearPath(10, 6, [[0, 0, 10]]));

  // Angle of a driven gear so its teeth sit in the driver's gaps.
  // Derived from: tooth phase of driver + tooth phase of driven = 1/2 (mod 1)
  // along the line between the centres.
  function drivenAngle(g) {
    const d = g.from;
    return g.dir + Math.PI - g.pitch * (0.5 - (g.dir - d.angle) / d.pitch);
  }

  const BASE_SPEED = reducedMotion ? 0.06 : 0.35; // rad/s for gear A
  const BOOST = 4.5;
  let speedMult = 1;
  let targetMult = 1;
  gearA.angle = 0;
  let lastT = performance.now();

  function renderGears() {
    for (const g of gears) {
      if (g.from) g.angle = drivenAngle(g);
      g.el.setAttribute("transform", `translate(${g.x.toFixed(2)} ${g.y.toFixed(2)}) rotate(${(g.angle * 180 / Math.PI).toFixed(3)})`);
    }
  }

  function tick(now) {
    const dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    speedMult += (targetMult - speedMult) * (1 - Math.exp(-dt * 3));
    gearA.angle = (gearA.angle + BASE_SPEED * speedMult * dt) % (Math.PI * 2);
    renderGears();
    requestAnimationFrame(tick);
  }
  renderGears();
  requestAnimationFrame(tick);

  const gearSvg = $("#gears");
  const boostOn = () => { targetMult = reducedMotion ? 2 : BOOST; };
  const boostOff = () => { targetMult = 1; };
  gearSvg.addEventListener("pointerenter", boostOn);
  gearSvg.addEventListener("pointerleave", boostOff);
  gearSvg.addEventListener("pointerdown", boostOn);
  gearSvg.addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") boostOff(); });
  gearSvg.addEventListener("pointercancel", boostOff);

  /* ================= Unit data ================= */
  // Linear units: factor converts 1 unit into the category's SI base unit.
  const CATEGORIES = {
    length: {
      units: [
        ["um", "µm", "Micrometer", 1e-6],
        ["mm", "mm", "Millimeter", 1e-3],
        ["cm", "cm", "Centimeter", 1e-2],
        ["m", "m", "Meter", 1],
        ["km", "km", "Kilometer", 1e3],
        ["in", "in", "Inch", 0.0254],
        ["ft", "ft", "Foot", 0.3048],
        ["yd", "yd", "Yard", 0.9144],
        ["mi", "mi", "Mile", 1609.344],
      ],
      defaults: ["m", "ft"],
    },
    mass: {
      units: [
        ["mg", "mg", "Milligram", 1e-6],
        ["g", "g", "Gram", 1e-3],
        ["kg", "kg", "Kilogram", 1],
        ["t", "t", "Tonne", 1e3],
        ["oz", "oz", "Ounce", 0.028349523125],
        ["lb", "lb", "Pound", 0.45359237],
        ["slug", "slug", "Slug", 14.5939029372],
      ],
      defaults: ["kg", "lb"],
    },
    force: {
      units: [
        ["N", "N", "Newton", 1],
        ["kN", "kN", "Kilonewton", 1e3],
        ["MN", "MN", "Meganewton", 1e6],
        ["dyn", "dyn", "Dyne", 1e-5],
        ["lbf", "lbf", "Pound-force", 4.4482216152605],
        ["kgf", "kgf", "Kilogram-force", 9.80665],
      ],
      defaults: ["N", "lbf"],
    },
    pressure: {
      units: [
        ["Pa", "Pa", "Pascal", 1],
        ["kPa", "kPa", "Kilopascal", 1e3],
        ["MPa", "MPa", "Megapascal", 1e6],
        ["bar", "bar", "Bar", 1e5],
        ["atm", "atm", "Atmosphere", 101325],
        ["psi", "psi", "Pound / sq inch", 6894.757293168],
        ["ksi", "ksi", "Kilopound / sq inch", 6894757.293168],
        ["mmHg", "mmHg", "Millimeter of mercury", 133.322387415],
      ],
      defaults: ["bar", "psi"],
    },
    energy: {
      units: [
        ["J", "J", "Joule", 1],
        ["kJ", "kJ", "Kilojoule", 1e3],
        ["MJ", "MJ", "Megajoule", 1e6],
        ["Wh", "Wh", "Watt-hour", 3600],
        ["kWh", "kWh", "Kilowatt-hour", 3.6e6],
        ["cal", "cal", "Calorie", 4.184],
        ["kcal", "kcal", "Kilocalorie", 4184],
        ["BTU", "BTU", "British thermal unit", 1055.05585262],
        ["ftlbf", "ft·lbf", "Foot-pound", 1.3558179483314],
        ["eV", "eV", "Electronvolt", 1.602176634e-19],
      ],
      defaults: ["kJ", "BTU"],
    },
    temperature: {
      // Base unit is °C; temperature scales have offsets, so use functions.
      units: [
        ["C", "°C", "Celsius", { to: (v) => v, from: (c) => c }],
        ["F", "°F", "Fahrenheit", { to: (v) => (v - 32) * 5 / 9, from: (c) => c * 9 / 5 + 32 }],
        ["K", "K", "Kelvin", { to: (v) => v - 273.15, from: (c) => c + 273.15 }],
        ["R", "°R", "Rankine", { to: (v) => (v - 491.67) * 5 / 9, from: (c) => (c + 273.15) * 9 / 5 }],
      ],
      defaults: ["C", "F"],
    },
  };

  for (const cat of Object.values(CATEGORIES)) {
    cat.byId = {};
    cat.units = cat.units.map(([id, sym, name, f]) => {
      const u = typeof f === "number"
        ? { id, sym, name, to: (v) => v * f, from: (b) => b / f }
        : { id, sym, name, to: f.to, from: f.from };
      cat.byId[id] = u;
      return u;
    });
  }

  /* ================= Formatting & parsing ================= */
  const SUP = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };

  function fmt(n) {
    if (!Number.isFinite(n)) return "–";
    if (n === 0) return "0";
    const a = Math.abs(n);
    if (a >= 1e9 || a < 1e-4) {
      const [mant, exp] = n.toExponential(4).split("e");
      const e = exp.replace("+", "").split("").map((ch) => SUP[ch]).join("");
      return `${parseFloat(mant)} × 10${e}`;
    }
    return parseFloat(n.toPrecision(7)).toLocaleString("en-US", { maximumFractionDigits: 6 });
  }

  const NUM_RE = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i;
  function parseNum(str) {
    const s = str.trim().replace(/[\s_]/g, "").replace(",", ".");
    return NUM_RE.test(s) ? Number(s) : NaN;
  }

  /* ================= Converter ================= */
  const tabs = [...document.querySelectorAll(".tab")];
  const indicator = $(".tab-indicator");
  const input = $("#fromValue");
  const fromSel = $("#fromUnit");
  const toSel = $("#toUnit");
  const resultEl = $("#result");
  const resultLabel = $(".result-label");
  const hintEl = $("#inputHint");
  const chipsEl = $("#allUnits");

  let currentCat = "length";
  let lastCalcKey = null;

  function fillSelects(catKey) {
    const cat = CATEGORIES[catKey];
    const opts = cat.units.map((u) => `<option value="${u.id}">${u.name} (${u.sym})</option>`).join("");
    fromSel.innerHTML = opts;
    toSel.innerHTML = opts;
    [fromSel.value, toSel.value] = cat.defaults;
  }

  function moveIndicator() {
    const active = tabs.find((t) => t.getAttribute("aria-selected") === "true");
    if (!active) return;
    indicator.style.width = `${active.offsetWidth}px`;
    indicator.style.transform = `translateX(${active.offsetLeft}px)`;
  }

  function selectTab(tab, focus = false) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    if (focus) tab.focus();
    tab.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
    currentCat = tab.dataset.cat;
    fillSelects(currentCat);
    moveIndicator();
    convert(false); // switching tabs isn't a calculation
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", (e) => {
      let next = null;
      if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
      else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === "Home") next = tabs[0];
      else if (e.key === "End") next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); selectTab(next, true); }
    });
  });

  function popResult() {
    resultEl.classList.remove("pop");
    void resultEl.offsetWidth;
    resultEl.classList.add("pop");
  }

  // Recompute everything. countIt=false for programmatic updates.
  function convert(countIt = true) {
    const cat = CATEGORIES[currentCat];
    const from = cat.byId[fromSel.value];
    const to = cat.byId[toSel.value];
    const raw = input.value;
    const v = parseNum(raw);

    let error = "";
    if (raw.trim() === "") error = "Type a number to get started ✍️";
    else if (Number.isNaN(v)) error = "Hmm, that doesn't look like a number 🤔";

    const base = error ? NaN : from.to(v);
    if (!error && currentCat === "temperature" && base < -273.15) {
      error = "Colder than absolute zero? Physics says no 🥶";
    }

    input.classList.toggle("invalid", Boolean(error) && raw.trim() !== "");
    hintEl.textContent = error;

    if (error) {
      resultLabel.textContent = "Result";
      resultEl.textContent = "–";
      renderChips(NaN, cat, to);
      return;
    }

    const out = to.from(base);
    resultLabel.textContent = `${fmt(v)} ${from.sym} =`;
    resultEl.textContent = `${fmt(out)} ${to.sym}`;
    popResult();
    renderChips(base, cat, to);

    const key = `${currentCat}|${from.id}|${to.id}|${v}`;
    if (countIt && key !== lastCalcKey) registerCalc();
    lastCalcKey = key;
  }

  function renderChips(base, cat, to) {
    chipsEl.innerHTML = cat.units.map((u) => `
      <button type="button" class="chip${u === to ? " active" : ""}" data-unit="${u.id}" title="Convert to ${u.name}">
        <span class="chip-unit">${u.name} (${u.sym})</span>
        <span class="chip-val">${Number.isNaN(base) ? "–" : fmt(u.from(base))}</span>
      </button>`).join("");
  }

  chipsEl.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    toSel.value = chip.dataset.unit;
    convert();
  });

  input.addEventListener("input", () => convert());
  fromSel.addEventListener("change", () => convert());
  toSel.addEventListener("change", () => convert());
  $("#swapBtn").addEventListener("click", () => {
    [fromSel.value, toSel.value] = [toSel.value, fromSel.value];
    convert();
  });

  /* ================= Progress & badges ================= */
  const BADGES = [
    { id: "apprentice", at: 1, emoji: "🔧", name: "Apprentice", text: "Your first calculation. Every great machine starts with one bolt." },
    { id: "technician", at: 10, emoji: "⚙️", name: "Technician", text: "10 calculations! Your gears are officially meshing." },
    { id: "chief", at: 25, emoji: "🏆", name: "Chief Engineer", text: "25 calculations. The whole workshop answers to you now." },
  ];
  const STORE_KEY = "gearlab.progress";

  function loadProgress() {
    try {
      const data = JSON.parse(localStorage.getItem(STORE_KEY));
      if (data && Number.isFinite(data.count) && Array.isArray(data.badges)) return data;
    } catch (_) { /* storage unavailable */ }
    return { count: 0, badges: [] };
  }
  function saveProgress() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); } catch (_) { /* ignore */ }
  }

  let progress = loadProgress();
  const countEl = $("#calcCount");

  function renderProgress(justEarned) {
    countEl.textContent = progress.count;
    document.querySelectorAll(".shelf-badge").forEach((el) => {
      const earned = progress.badges.includes(el.dataset.badge);
      el.classList.toggle("earned", earned);
      el.classList.toggle("just-earned", el.dataset.badge === justEarned);
    });
  }

  function registerCalc() {
    progress.count += 1;
    const badge = BADGES.find((b) => progress.count >= b.at && !progress.badges.includes(b.id));
    if (badge) {
      progress.badges.push(badge.id);
      celebrate(badge);
    }
    saveProgress();
    renderProgress(badge && badge.id);
  }

  /* ================= Badge modal ================= */
  const modal = $("#badgeModal");
  const closeBtn = $("#badgeClose");
  let lastFocus = null;

  function celebrate(badge) {
    const r = resultEl.getBoundingClientRect();
    confetti(r.left + r.width / 2, r.top + r.height / 2);
    $("#badgeEmoji").textContent = badge.emoji;
    $("#badgeTitle").textContent = badge.name;
    $("#badgeText").textContent = badge.text;
    lastFocus = document.activeElement;
    modal.hidden = false;
    // Defer focus slightly so the user's current keystroke doesn't land in the modal.
    setTimeout(() => closeBtn.focus({ preventScroll: true }), 50);
  }

  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (modal.hidden) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "Tab") { e.preventDefault(); closeBtn.focus(); } // single control: trap focus
  });

  /* ================= Confetti ================= */
  const canvas = $("#confetti");
  const ctx = canvas.getContext("2d");
  const COLORS = ["#ff7a1a", "#14b8a6", "#ffc93c", "#1f2937", "#ff9d4d"];
  let particles = [];
  let confettiRunning = false;

  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function confetti(x, y) {
    if (reducedMotion) return;
    sizeCanvas();
    for (let i = 0; i < 130; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 4 + Math.random() * 9;
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 6,
        w: 6 + Math.random() * 7,
        h: 4 + Math.random() * 5,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        life: 1,
        round: Math.random() < 0.3,
      });
    }
    if (!confettiRunning) { confettiRunning = true; requestAnimationFrame(drawConfetti); }
  }

  function drawConfetti() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of particles) {
      p.vy += 0.3;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 0.009;
      ctx.save();
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.h / 1.4, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    particles = particles.filter((p) => p.life > 0 && p.y < innerHeight + 40);
    if (particles.length) requestAnimationFrame(drawConfetti);
    else { confettiRunning = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  /* ================= Toast ================= */
  const toastEl = $("#toast");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
  }

  /* ================= Buttons ================= */
  // Bounce every button on click (re-triggerable).
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".btn, .tab, .chip");
    if (!b || reducedMotion) return;
    b.classList.remove("bounce");
    void b.offsetWidth;
    b.classList.add("bounce");
  });
  document.addEventListener("animationend", (e) => {
    if (e.animationName === "bounce") e.target.classList.remove("bounce");
  });

  $("#studentCta").addEventListener("click", () => {
    $("#converter").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
    setTimeout(() => input.focus({ preventScroll: true }), 500);
  });
  $("#proCta").addEventListener("click", () => toast("🚀 Pro is coming soon, you're on the list!"));

  $("#resetBtn").addEventListener("click", () => {
    progress = { count: 0, badges: [] };
    lastCalcKey = null;
    try { localStorage.removeItem(STORE_KEY); } catch (_) { /* ignore */ }
    renderProgress();
    toast("🔄 Progress reset. Fresh start, engineer!");
  });

  /* ================= Init ================= */
  window.addEventListener("resize", moveIndicator);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveIndicator);

  fillSelects(currentCat);
  moveIndicator();
  convert(false);
  renderProgress();
})();
