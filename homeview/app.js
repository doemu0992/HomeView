"use strict";
const DEBUG = /(^|[#&])debug=1/.test(location.hash);
const dbg = msg => {
  if (!DEBUG) return;
  let b = document.getElementById("dbg");
  if (!b) { b = document.createElement("pre"); b.id = "dbg"; b.style.cssText = "position:fixed;left:0;top:0;max-width:100%;max-height:60%;overflow:auto;margin:0;padding:8px 12px;background:rgba(0,0,0,.75);color:#9f9;font:11px/1.35 monospace;z-index:100;white-space:pre-wrap;pointer-events:none"; document.body.append(b); }
  b.textContent += msg + "\n";
};
/* Fehler sichtbar machen, statt einen leeren Bildschirm zu zeigen */
(function () {
  const show = msg => {
    let b = document.getElementById("fatal");
    if (!b) { b = document.createElement("pre"); b.id = "fatal"; b.style.cssText = "position:fixed;left:0;right:0;bottom:0;max-height:45%;overflow:auto;margin:0;padding:12px 16px;background:#b3261e;color:#fff;font:12px/1.4 monospace;z-index:99;white-space:pre-wrap"; document.body.append(b); }
    b.textContent += msg + "\n";
  };
  window.addEventListener("error", e => show("Fehler: " + e.message + (e.lineno ? " (Zeile " + e.lineno + ")" : "")));
  window.addEventListener("unhandledrejection", e => show("Fehler: " + (e.reason && e.reason.message || e.reason)));
})();
/* HomeView – Home-Assistant-Frontend im Stil eines Apple-Home-Displays.
   Kein Build-Schritt: spricht direkt die WebSocket-API von Home Assistant.
   Tippen schaltet, langes Drücken (oder „···“) öffnet alle Funktionen des Geräts. */

const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, "0");
const STORE = "homeview.conn";
const HOME = "__home", OTHER = "__other";

/* ---------- Icons (Linien, 24er Raster) ---------- */
const ICONS = {
  light: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z"/>',
  switch: '<path d="M12 3v8M6.3 6.8a8 8 0 1 0 11.4 0"/>',
  fan: '<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-7 4-7 2.5 0 2.5 3 0 5l-3 2.5M14 12c4 0 7 1 7 4 0 2.5-3 2.5-5 0l-2.5-3M12 14c0 4-1 7-4 7-2.5 0-2.5-3 0-5l3-2.5M10 12c-4 0-7-1-7-4 0-2.5 3-2.5 5 0l2.5 3"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  cover: '<path d="M4 4h16M5 4v16M19 4v16M8 8h8M8 12h8M8 16h8"/>',
  scene: '<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z"/>',
  media: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  power: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  thermo: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z"/>',
  drop: '<path d="M12 3s6 6.2 6 10.5a6 6 0 0 1-12 0C6 9.200 12 3 12 3Z"/>',
  vacuum: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/><path d="M12 4v2.5"/>',
  door: '<path d="M6 21V4h12v17M4 21h16"/><circle cx="14.500" cy="13" r=".8"/>',
  motion: '<circle cx="12" cy="12" r="2"/><path d="M7.800 7.800a6 6 0 0 0 0 8.400M16.200 7.800a6 6 0 0 1 0 8.400M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/>',
  gauge: '<path d="M4 17a8 8 0 1 1 16 0M12 17l4-5"/>',
  sliders: '<path d="M5 4v6M5 14v6M12 4v2M12 10v10M19 4v10M19 18v2M3 10h4M10 6h4M17 14h4"/>',
  button: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  shield: '<path d="M12 3 5 6v5c0 5 3 8.500 7 10 4-1.500 7-5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
  camera: '<path d="M3 7h3l1.500-2h9L18 7h3v12H3Z"/><circle cx="12" cy="13" r="3.500"/>',
  floorlamp: '<path d="M8 3h8l2 6H6l2-6Z"/><path d="M12 9v12M8 21h8"/>',
  pendant: '<path d="M12 2v5"/><path d="M4 17a8 8 0 0 1 16 0Z"/><path d="M10 20.500h4"/>',
  ceiling: '<path d="M3 4h18M12 4v3"/><path d="M4 11h16a8 7 0 0 1-16 0Z"/><path d="M8 20l-1 2M12 20v2M16 20l1 2"/>',
  spot: '<rect x="8" y="3" width="8" height="5" rx="1"/><path d="M7 11l-3 9M12 11v9M17 11l3 9"/>',
  wall: '<path d="M3 4v16M3 12h5"/><path d="M8 12a6 6 0 0 1 12 0Z"/><path d="M14 15v2"/>',
  strip: '<rect x="2" y="11" width="20" height="5" rx="2.500"/><path d="M6 8V6M12 8V5M18 8V6"/><circle cx="7" cy="13.500" r=".7"/><circle cx="12" cy="13.500" r=".7"/><circle cx="17" cy="13.500" r=".7"/>',
  lights: '<path d="M2 5c4 6 8 6 10 0 2 6 6 6 10 0"/><circle cx="6" cy="12" r="1.700"/><circle cx="12" cy="13" r="1.700"/><circle cx="18" cy="12" r="1.700"/><path d="M6 9.300v1M12 10.300v1M18 9.300v1"/>',
  candle: '<rect x="8" y="10" width="8" height="11" rx="1"/><path d="M12 10V8"/><path d="M12 2.500c2.200 2 2.200 4 0 5.500-2.200-1.500-2.200-3.500 0-5.500Z"/>',
  lantern: '<path d="M9 3h6M12 3v2"/><path d="M7 7h10l1 11H6L7 7Z"/><path d="M5 18h14v3H5z"/><path d="M10 11v4M14 11v4"/>',
  chandelier: '<path d="M12 2v4"/><path d="M12 6c-5 0-8 3-8 7M12 6c5 0 8 3 8 7M12 6v14"/><path d="M4 13v3M20 13v3M12 13v3"/>',
  flood: '<rect x="4" y="5" width="10" height="9" rx="2"/><path d="M9 14v4M6 18h6M17 6l4-2M17 10h4M17 14l4 2"/>',
  lamp: '<path d="M8 3h8l3 9H5l3-9Z"/><path d="M12 12v8M9 20h6"/>',
  bed: '<path d="M3 18V8M3 14h18v4M21 14v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11" r="1.5"/>',
  sofa: '<path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3v-5Z"/><path d="M6 18v2M18 18v2"/>',
  tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
  speaker: '<rect x="6" y="3" width="12" height="18" rx="3"/><circle cx="12" cy="14" r="3"/><circle cx="12" cy="7" r=".8"/>',
  plug: '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0V8ZM12 17v4"/>',
  heater: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 6v12M12 6v12M16 6v12"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M9 4.5l3 2 3-2M9 19.5l3-2 3 2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>',
  window: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M12 3v18M4 12h16"/>',
  garage: '<path d="M3 21V9l9-6 9 6v12M7 21v-7h10v7M7 17h10"/>',
  car: '<path d="M5 16V11l2-5h10l2 5v5M3 16h18M7 16v3M17 16v3"/><circle cx="8" cy="13" r=".8"/><circle cx="16" cy="13" r=".8"/>',
  plant: '<path d="M12 21v-9M12 12c0-4-3-6-7-6 0 4 3 6 7 6ZM12 14c0-3 2-5 6-5 0 3-2 5-6 5Z"/>',
  coffee: '<path d="M5 8h11v6a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8ZM16 10h2a2 2 0 0 1 0 4h-2M8 3v2M12 3v2"/>',
  washer: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M7 6.500h2"/>',
  fridge: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M6 10h12M9 6v1.500M9 13v3"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2ZM10 21h4"/>',
  wifi: '<path d="M2.500 9a14 14 0 0 1 19 0M5.500 12.500a9.500 9.500 0 0 1 13 0M8.500 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r=".8"/>',
  flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9Z"/>',
  home: '<path d="M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6"/>',
  star: '<path d="M12 3l2.700 5.600 6.100.9-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100L3.200 9.500l6.100-.9Z"/>',
  heart: '<path d="M12 20s-8-5-8-11a4.500 4.500 0 0 1 8-2.500A4.500 4.500 0 0 1 20 9c0 6-8 11-8 11Z"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
};
const icon = k => `<svg class="ic" data-icon="${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;

/* Symbol nach Name: „Stehlampe“ → Stehlampe, „Strip“ → LED-Streifen usw. (nur für Licht, Schalter) */
const AUTO_ICONS = [[/steh/i, "floorlamp"], [/strip|led-?band|lichtband|streifen/i, "strip"], [/h[äa]nge|pendel/i, "pendant"], [/decke|plafon/i, "ceiling"],
  [/spot|strahler/i, "spot"], [/wand(lampe|leuchte|licht)?\b/i, "wall"], [/kerze/i, "candle"], [/laterne|au(ß|ss)en(licht|leuchte)/i, "lantern"],
  [/kronleuchter/i, "chandelier"], [/lichterkette|girlande/i, "lights"], [/flutlicht|fluter/i, "flood"], [/tisch|schreibtisch/i, "lamp"]];
const autoIconKey = (name, domain) => {
  if (!["light", "switch", "input_boolean"].includes(domain)) return null;
  const m = AUTO_ICONS.find(([re]) => re.test(name));
  return m ? m[1] : null;
};

/* ---------- Texte ---------- */
const WEATHER = {
  "clear-night": "Klar", cloudy: "Bewölkt", exceptional: "Außergewöhnlich", fog: "Nebel", hail: "Hagel",
  lightning: "Gewitter", "lightning-rainy": "Gewitter mit Regen", partlycloudy: "Leicht bewölkt", pouring: "Starkregen",
  rainy: "Regen", snowy: "Schnee", "snowy-rainy": "Schneeregen", sunny: "Sonnig", windy: "Windig", "windy-variant": "Windig",
};
const HVAC_ACTION = { heating: "Heizt", cooling: "Kühlt", idle: "Bereit", off: "Aus", drying: "Entfeuchtet", fan: "Lüftet" };
const HVAC_MODE = { off: "Aus", heat: "Heizen", cool: "Kühlen", heat_cool: "Auto", auto: "Automatik", dry: "Trocknen", fan_only: "Lüften" };
const PRESET = { none: "Aus", eco: "Eco", away: "Abwesend", home: "Zuhause", comfort: "Komfort", sleep: "Schlafen", boost: "Boost", activity: "Aktiv" };
const VAC = { cleaning: "Saugt", docked: "In Station", returning: "Fährt zurück", idle: "Bereit", paused: "Pausiert", error: "Fehler" };
const ALARM = { disarmed: "Deaktiviert", armed_home: "Scharf · Zuhause", armed_away: "Scharf · Abwesend", armed_night: "Scharf · Nacht",
  armed_vacation: "Scharf · Urlaub", armed_custom_bypass: "Scharf · Benutzerdefiniert", pending: "Wird ausgelöst …", arming: "Schaltet scharf …",
  disarming: "Schaltet ab …", triggered: "ALARM" };
const CAM = { idle: "Live-Bild", recording: "Nimmt auf", streaming: "Streamt", off: "Aus" };
let haBase = "";
const camUrl = s => {
  const p = s.attributes.entity_picture || "";
  if (!p || p.startsWith("data:") || /^https?:/.test(p)) return p;
  return haBase + p + (p.includes("?") ? "&" : "?") + "_=" + Date.now();
};
const camStream = s => s.attributes.access_token && haBase
  ? `${haBase}/api/camera_proxy_stream/${s.entity_id}?token=${s.attributes.access_token}` : camUrl(s);
const fmt = (n, d = 1) => Number(n).toLocaleString("de-DE", { maximumFractionDigits: d });
const label = (map, k) => map[k] || (String(k).charAt(0).toUpperCase() + String(k).slice(1).replace(/_/g, " "));
const feat = (a, bit) => a.supported_features == null || (a.supported_features & bit) !== 0;

/* ---------- Farbe ---------- */
function rgbToHs([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [Math.round(((h * 60) + 360) % 360), Math.round(mx ? (d / mx) * 100 : 0)];
}
function hsToRgb([h, s]) {
  s /= 100; const f = n => { const k = (n + h / 60) % 6; return Math.round(255 * (1 - s * Math.max(0, Math.min(k, 4 - k, 1)))); };
  return [f(5), f(3), f(1)];
}

/* ---------- Zustand ---------- */
let conn = null;                    // { call(domain, service, data, entity_id), close() }
const states = new Map();           // entity_id -> state object
let areas = [];
const entityArea = new Map();
let room = HOME;
const tiles = new Map();            // entity_id -> { el, update(state) }
let sheetCtx = null;                // { id, update(state) }

const domainOf = id => id.split(".")[0];
/* Der Name entscheidet: „Lüfter“/„Ventilator“ im Namen = Lüfter, auch wenn Home Assistant das Gerät als Licht führt */
const FAN_RE = /l[uü]e?fter|ventilator/i;
const isFanLike = s => domainOf(s.entity_id) === "fan" || FAN_RE.test(nameOf(s));
const nameOf = s => {
  const o = layout.__cfg && layout.__cfg.ent && layout.__cfg.ent[s.entity_id];
  return (o && o.name) || s.attributes.friendly_name || s.entity_id;
};

function pushState(s) {
  states.set(s.entity_id, s);
  tiles.get(s.entity_id)?.update(s);
  scheduleChips();
  if (sheetCtx && sheetCtx.id === s.entity_id) sheetCtx.update(s);
}

/* ---------- Home-Assistant-Verbindung ---------- */
function connectHA(baseUrl, token, handlers) {
  const wsUrl = baseUrl.replace(/\/+$/, "").replace(/^http/, "ws") + "/api/websocket";
  let ws, id = 0, closed = false, retry = 0;
  const pending = new Map();
  const send = msg => ws.send(JSON.stringify(msg));
  const request = msg => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); send({ ...msg, id: i }); });

  function open() {
    ws = new WebSocket(wsUrl);
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.type === "auth_required") return send({ type: "auth", access_token: token });
      if (m.type === "auth_invalid") { closed = true; handlers.onAuthError(); return; }
      if (m.type === "auth_ok") { retry = 0; handlers.onReady(api); return; }
      if (m.type === "result") {
        const p = pending.get(m.id); pending.delete(m.id);
        if (p) m.success ? p.res(m.result) : p.rej(m.error);
      } else if (m.type === "event") handlers.onEvent(m.event);
    };
    ws.onopen = () => handlers.onStatus(true);
    ws.onclose = () => {
      pending.forEach(p => p.rej({ message: "closed" })); pending.clear();
      if (closed) return;
      handlers.onStatus(false);
      setTimeout(open, Math.min(30000, 1000 * 2 ** retry++));
    };
    ws.onerror = () => ws.close();
  }
  const api = {
    request,
    call: (domain, service, data = {}, entity_id) =>
      request({ type: "call_service", domain, service, service_data: data, ...(entity_id ? { target: { entity_id } } : {}) }).then(() => true, () => false),
    subscribe: () => request({ type: "subscribe_events", event_type: "state_changed" }),
    close: () => { closed = true; ws && ws.close(); },
  };
  open();
  return api;
}

async function loadRegistry(api) {
  const soft = p => p.catch(() => []);
  const [st, ar, dev, ent] = await Promise.all([
    api.request({ type: "get_states" }),
    soft(api.request({ type: "config/area_registry/list" })),
    soft(api.request({ type: "config/device_registry/list" })),
    soft(api.request({ type: "config/entity_registry/list" })),
  ]);
  states.clear(); st.forEach(s => states.set(s.entity_id, s));
  const devArea = new Map(dev.map(d => [d.id, d.area_id]));
  entityArea.clear();
  ent.forEach(e => {
    if (e.hidden_by || e.disabled_by || e.entity_category) states.delete(e.entity_id);
    const a = e.area_id || devArea.get(e.device_id);
    if (a) entityArea.set(e.entity_id, a);
  });
  areas = ar.map(a => ({ area_id: a.area_id, name: a.name }));
}

/* ---------- Bedienelemente für das Detailfenster ---------- */
function h(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function ctl(parent, text) {
  const w = h("div", "ctl"), row = h("div", "ctl-row"), v = h("span", "ctl-v");
  row.append(h("span", "", text), v); w.append(row); parent.append(w);
  return { w, v };
}
function slider(parent, { label: text, min, max, step = 1, fmt: f = x => x, grad, on }) {
  const { w, v } = ctl(parent, text);
  const inp = document.createElement("input");
  inp.type = "range"; inp.min = min; inp.max = max; inp.step = step; inp.setAttribute("aria-label", text);
  if (grad) inp.style.setProperty("--grad", grad);
  let touched = 0, t;
  const show = () => { v.textContent = f(Number(inp.value)); };
  inp.addEventListener("input", () => { touched = Date.now(); show(); clearTimeout(t); t = setTimeout(() => on(Number(inp.value)), 120); });
  w.append(inp);
  return { w, inp, set(x) { if (x == null || Date.now() - touched < 1200) return; inp.value = x; show(); } };
}
function seg(parent, { label: text, options, on }) {
  const { w } = ctl(parent, text), box = h("div", "seg");
  const btns = options.map(([val, txt]) => {
    const b = h("button", "", txt); b.type = "button"; b.addEventListener("click", () => on(val)); box.append(b); return [val, b];
  });
  w.append(box);
  return { w, set(cur) { btns.forEach(([val, b]) => b.setAttribute("aria-pressed", String(val === cur))); } };
}
function actions(parent, items) {
  const box = h("div", "actions");
  items.forEach(([txt, fn]) => { const b = h("button", "", txt); b.type = "button"; b.addEventListener("click", fn); box.append(b); });
  parent.append(box);
}
const onOff = (parent, text, on) => seg(parent, { label: text, options: [[true, "An"], [false, "Aus"]], on });

/* ---------- Detailfenster pro Gerätetyp ---------- */
const DETAIL = {
  light(id, body, call) {
    const a0 = states.get(id).attributes, modes = a0.supported_color_modes || [];
    const has = m => modes.includes(m);
    const dim = modes.some(m => m !== "onoff");
    const color = ["hs", "xy", "rgb", "rgbw", "rgbww"].some(has);
    const power = onOff(body, "Licht", v => call(v ? "turn_on" : "turn_off", {}));
    const br = dim && slider(body, { label: "Helligkeit", min: 1, max: 100, fmt: x => x + " %", on: v => call("turn_on", { brightness_pct: v }) });
    const lo = a0.min_color_temp_kelvin || 2000, hi = a0.max_color_temp_kelvin || 6500;
    const ct = has("color_temp") && slider(body, { label: "Farbtemperatur", min: lo, max: hi, step: 50, fmt: x => x + " K",
      grad: "linear-gradient(90deg,#ffa43c,#fff3e0,#bcd7ff)", on: v => call("turn_on", { color_temp_kelvin: v }) });
    let hue, sat;
    if (color) {
      const push = () => call("turn_on", { hs_color: [Number(hue.inp.value), Number(sat.inp.value)] });
      hue = slider(body, { label: "Farbton", min: 0, max: 360, fmt: x => x + "°", on: push,
        grad: "linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" });
      sat = slider(body, { label: "Sättigung", min: 0, max: 100, fmt: x => x + " %", on: push });
      const box = h("div", "swatches");
      [[0, 100], [25, 100], [50, 100], [120, 100], [185, 100], [220, 100], [280, 100], [330, 100], [0, 0]].forEach(hs => {
        const b = h("button"); b.type = "button"; b.setAttribute("aria-label", `Farbe ${hs[0]}°`);
        b.style.background = hs[1] ? `hsl(${hs[0]} 100% 50%)` : "#fff";
        b.addEventListener("click", () => call("turn_on", { hs_color: hs })); box.append(b);
      });
      body.append(box);
    }
    const fx = (a0.effect_list || []).length ? seg(body, { label: "Effekt", options: a0.effect_list.map(e => [e, e]), on: v => call("turn_on", { effect: v }) }) : null;
    return s => {
      const a = s.attributes, on = s.state === "on";
      power.set(on);
      br && br.set(a.brightness != null ? Math.round(a.brightness / 2.55) : null);
      ct && ct.set(a.color_temp_kelvin);
      if (color) {
        const hs = a.hs_color || (a.rgb_color ? rgbToHs(a.rgb_color) : null);
        if (hs) { hue.set(hs[0]); sat.set(hs[1]); sat.inp.style.setProperty("--grad", `linear-gradient(90deg,#fff,hsl(${hs[0]} 100% 50%))`); }
        else sat.inp.style.setProperty("--grad", "linear-gradient(90deg,#fff,#f00)");
      }
      fx && fx.set(a.effect);
    };
  },

  climate(id, body, call) {
    const a0 = states.get(id).attributes;
    const range = a0.temperature == null && a0.target_temp_low != null;
    const cfg = { min: a0.min_temp ?? 7, max: a0.max_temp ?? 35, step: a0.target_temp_step || 0.5, fmt: x => fmt(x) + "°" };
    const mode = (a0.hvac_modes || []).length ? seg(body, { label: "Betriebsart", options: a0.hvac_modes.map(m => [m, label(HVAC_MODE, m)]), on: v => call("set_hvac_mode", { hvac_mode: v }) }) : null;
    let t, lowS, highS;
    if (range) {
      const push = () => call("set_temperature", { target_temp_low: Number(lowS.inp.value), target_temp_high: Number(highS.inp.value) });
      lowS = slider(body, { ...cfg, label: "Untere Temperatur", on: push });
      highS = slider(body, { ...cfg, label: "Obere Temperatur", on: push });
    } else t = slider(body, { ...cfg, label: "Zieltemperatur", on: v => call("set_temperature", { temperature: v }) });
    const pre = (a0.preset_modes || []).length ? seg(body, { label: "Programm", options: a0.preset_modes.map(m => [m, label(PRESET, m)]), on: v => call("set_preset_mode", { preset_mode: v }) }) : null;
    const fan = (a0.fan_modes || []).length ? seg(body, { label: "Lüfter", options: a0.fan_modes.map(m => [m, label({ auto: "Auto", low: "Niedrig", medium: "Mittel", high: "Hoch" }, m)]), on: v => call("set_fan_mode", { fan_mode: v }) }) : null;
    const sw = (a0.swing_modes || []).length ? seg(body, { label: "Schwenken", options: a0.swing_modes.map(m => [m, label({ off: "Aus", on: "An", vertical: "Vertikal", horizontal: "Horizontal", both: "Beides" }, m)]), on: v => call("set_swing_mode", { swing_mode: v }) }) : null;
    return s => {
      const a = s.attributes;
      mode && mode.set(s.state);
      if (range) { lowS.set(a.target_temp_low); highS.set(a.target_temp_high); } else t.set(a.temperature);
      pre && pre.set(a.preset_mode); fan && fan.set(a.fan_mode); sw && sw.set(a.swing_mode);
    };
  },

  cover(id, body, call) {
    const a0 = states.get(id).attributes;
    const btn = [];
    if (feat(a0, 1)) btn.push(["Öffnen", () => call("open_cover", {})]);
    if (feat(a0, 8)) btn.push(["Stopp", () => call("stop_cover", {})]);
    if (feat(a0, 2)) btn.push(["Schließen", () => call("close_cover", {})]);
    actions(body, btn);
    const pos = a0.current_position != null && feat(a0, 4) ? slider(body, { label: "Position", min: 0, max: 100, fmt: x => x + " % offen", on: v => call("set_cover_position", { position: v }) }) : null;
    const tilt = a0.current_tilt_position != null && feat(a0, 128) ? slider(body, { label: "Neigung", min: 0, max: 100, fmt: x => x + " %", on: v => call("set_cover_tilt_position", { tilt_position: v }) }) : null;
    return s => { pos && pos.set(s.attributes.current_position); tilt && tilt.set(s.attributes.current_tilt_position); };
  },

  fan(id, body, call) {
    const a0 = states.get(id).attributes;
    const power = onOff(body, "Ventilator", v => call(v ? "turn_on" : "turn_off", {}));
    const sp = feat(a0, 1) && a0.percentage != null ? slider(body, { label: "Geschwindigkeit", min: 0, max: 100, step: a0.percentage_step || 1, fmt: x => x + " %", on: v => call("set_percentage", { percentage: v }) }) : null;
    const osc = a0.oscillating != null ? onOff(body, "Schwenken", v => call("oscillate", { oscillating: v })) : null;
    const dir = a0.direction != null ? seg(body, { label: "Richtung", options: [["forward", "Vorwärts"], ["reverse", "Rückwärts"]], on: v => call("set_direction", { direction: v }) }) : null;
    const pre = (a0.preset_modes || []).length ? seg(body, { label: "Programm", options: a0.preset_modes.map(m => [m, label({}, m)]), on: v => call("set_preset_mode", { preset_mode: v }) }) : null;
    return s => {
      const a = s.attributes;
      power.set(s.state === "on"); sp && sp.set(a.percentage); osc && osc.set(!!a.oscillating); dir && dir.set(a.direction); pre && pre.set(a.preset_mode);
    };
  },

  media_player(id, body, call) {
    const a0 = states.get(id).attributes;
    const pwr = feat(a0, 128) && feat(a0, 256) && a0.supported_features != null ? onOff(body, "Gerät", v => call(v ? "turn_on" : "turn_off", {})) : null;
    const tr = [];
    if (feat(a0, 16)) tr.push(["Zurück", () => call("media_previous_track", {})]);
    tr.push(["Wiedergabe / Pause", () => call("media_play_pause", {})]);
    if (feat(a0, 32)) tr.push(["Weiter", () => call("media_next_track", {})]);
    actions(body, tr);
    const vol = a0.volume_level != null && feat(a0, 4) ? slider(body, { label: "Lautstärke", min: 0, max: 100, fmt: x => x + " %", on: v => call("volume_set", { volume_level: v / 100 }) }) : null;
    const mute = a0.is_volume_muted != null && feat(a0, 8) ? onOff(body, "Stumm", v => call("volume_mute", { is_volume_muted: v })) : null;
    const src = (a0.source_list || []).length ? seg(body, { label: "Quelle", options: a0.source_list.map(x => [x, x]), on: v => call("select_source", { source: v }) }) : null;
    const shuf = a0.shuffle != null ? onOff(body, "Zufällig", v => call("shuffle_set", { shuffle: v })) : null;
    return s => {
      const a = s.attributes;
      pwr && pwr.set(s.state !== "off"); vol && vol.set(a.volume_level != null ? Math.round(a.volume_level * 100) : null);
      mute && mute.set(!!a.is_volume_muted); src && src.set(a.source); shuf && shuf.set(!!a.shuffle);
    };
  },

  lock(id, body, call) {
    const a0 = states.get(id).attributes, items = [["Verriegeln", () => call("lock", {})], ["Entriegeln", () => call("unlock", {})]];
    if ((a0.supported_features & 1) === 1) items.push(["Tür öffnen", () => call("open", {})]);
    actions(body, items);
    return () => {};
  },

  humidifier(id, body, call) {
    const a0 = states.get(id).attributes;
    const power = onOff(body, "Luftbefeuchter", v => call(v ? "turn_on" : "turn_off", {}));
    const hum = slider(body, { label: "Zielfeuchte", min: a0.min_humidity ?? 20, max: a0.max_humidity ?? 80, fmt: x => x + " %", on: v => call("set_humidity", { humidity: v }) });
    const mode = (a0.available_modes || []).length ? seg(body, { label: "Modus", options: a0.available_modes.map(m => [m, label({}, m)]), on: v => call("set_mode", { mode: v }) }) : null;
    return s => { power.set(s.state === "on"); hum.set(s.attributes.humidity); mode && mode.set(s.attributes.mode); };
  },

  vacuum(id, body, call) {
    const a0 = states.get(id).attributes;
    actions(body, [["Start", () => call("start", {})], ["Pause", () => call("pause", {})], ["Zur Station", () => call("return_to_base", {})], ["Suchen", () => call("locate", {})]]);
    const sp = (a0.fan_speed_list || []).length ? seg(body, { label: "Saugstärke", options: a0.fan_speed_list.map(m => [m, label({}, m)]), on: v => call("set_fan_speed", { fan_speed: v }) }) : null;
    const info = h("div", "info"); body.append(info);
    return s => { sp && sp.set(s.attributes.fan_speed); info.textContent = s.attributes.battery_level != null ? `Akku ${s.attributes.battery_level} %` : ""; };
  },

  alarm_control_panel(id, body, call) {
    const a0 = states.get(id).attributes;
    const code = a0.code_format != null;
    let pin = "";
    const status = h("div", "info big");
    const err = h("div", "info err");
    body.append(status);
    let dots, field;
    const draw = () => { if (dots) dots.textContent = pin ? "●".repeat(pin.length) : "Code eingeben"; };
    if (code && a0.code_format === "number") {
      dots = h("div", "pin"); body.append(dots);
      const pad = h("div", "keypad");
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].forEach(k => {
        const b = h("button", "", k); b.type = "button"; b.setAttribute("aria-label", k === "C" ? "Eingabe löschen" : k === "⌫" ? "Letzte Ziffer löschen" : k);
        b.addEventListener("click", () => { pin = k === "C" ? "" : k === "⌫" ? pin.slice(0, -1) : (pin + k).slice(0, 12); err.textContent = ""; draw(); });
        pad.append(b);
      });
      body.append(pad); draw();
    } else if (code) {
      field = document.createElement("input"); field.type = "password"; field.placeholder = "Code"; field.className = "textin";
      field.setAttribute("aria-label", "Code"); field.addEventListener("input", () => { pin = field.value; err.textContent = ""; });
      body.append(field);
    }
    const run = svc => async () => {
      const ok = await call(svc, code ? { code: pin } : {});
      if (ok) { pin = ""; if (field) field.value = ""; draw(); err.textContent = ""; } else err.textContent = code ? "Code falsch oder Aktion nicht möglich." : "Aktion nicht möglich.";
    };
    const items = [["Deaktivieren", run("alarm_disarm")]];
    if (feat(a0, 1)) items.push(["Zuhause scharf", run("alarm_arm_home")]);
    if (feat(a0, 2)) items.push(["Abwesend scharf", run("alarm_arm_away")]);
    if (feat(a0, 4)) items.push(["Nacht scharf", run("alarm_arm_night")]);
    if ((a0.supported_features & 32) === 32) items.push(["Urlaub scharf", run("alarm_arm_vacation")]);
    actions(body, items); body.append(err);
    return s => { status.textContent = ALARM[s.state] || s.state; };
  },

  camera(id, body, call) {
    const a0 = states.get(id).attributes;
    const img = document.createElement("img");
    img.className = "camview"; img.alt = "Kamerabild";
    body.append(img);
    const pwr = (a0.supported_features & 1) === 1 ? onOff(body, "Kamera", v => call(v ? "turn_on" : "turn_off", {})) : null;
    const info = h("div", "info"); body.append(info);
    let started = false;
    const upd = s => {
      if (!started) { started = true; img.src = camStream(s); }
      pwr && pwr.set(s.state !== "off");
      info.textContent = CAM[s.state] || s.state;
    };
    upd.cleanup = () => { img.removeAttribute("src"); };
    return upd;
  },

  number(id, body, call) { return numberDetail(id, body, call); },
  input_number(id, body, call) { return numberDetail(id, body, call); },
  select(id, body, call) { return selectDetail(id, body, call); },
  input_select(id, body, call) { return selectDetail(id, body, call); },
};
function numberDetail(id, body, call) {
  const a0 = states.get(id).attributes, u = a0.unit_of_measurement ? " " + a0.unit_of_measurement : "";
  const sl = slider(body, { label: nameOf(states.get(id)), min: a0.min ?? 0, max: a0.max ?? 100, step: a0.step || 1, fmt: x => fmt(x) + u, on: v => call("set_value", { value: v }) });
  return s => sl.set(parseFloat(s.state));
}
function selectDetail(id, body, call) {
  const a0 = states.get(id).attributes;
  const sg = seg(body, { label: "Auswahl", options: (a0.options || []).map(o => [o, o]), on: v => call("select_option", { option: v }) });
  return s => sg.set(s.state);
}

function openSheet(id) {
  const s = states.get(id), d = DETAIL[domainOf(id)];
  if (!s || !d) return;
  const body = $("sheetBody"); body.replaceChildren();
  $("sheetTitle").textContent = nameOf(s);
  const domain = domainOf(id);
  $("sheet").dataset.kind = domain;
  const upd = d(id, body, (service, data) => conn.call(domain, service, data, id));
  sheetCtx = { id, update: upd }; upd(s);
  actions(body, [["Name und Symbol ändern", () => openEntityPanel(id)]]);
  $("sheet").hidden = false; $("sheetClose").focus();
}
function closeSheet() { sheetCtx?.update.cleanup?.(); $("sheet").hidden = true; sheetCtx = null; $("sheetBody").replaceChildren(); }
$("sheetClose").addEventListener("click", closeSheet);
$("sheetBg").addEventListener("click", closeSheet);
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("sheet").hidden) closeSheet(); });

/* ---------- Kachel-Fabrik ---------- */
function tileShell(cls, html, btn = true) {
  const el = document.createElement(btn ? "button" : "div");
  if (btn) el.type = "button";
  el.className = "tile " + cls;
  el.innerHTML = html;
  return el;
}
const basic = (iconKey, cls = "") => tileShell(cls, `${icon(iconKey)}<div><div class="name"></div><div class="state"></div></div>`);
function setText(el, sel, t) { const n = el.querySelector(sel); if (n.textContent !== t) n.textContent = t; }
function applyCommon(el, s, on, stateText) {
  el.classList.toggle("on", !!on);
  el.classList.toggle("unavailable", s.state === "unavailable");
  setText(el, ".name", nameOf(s));
  setText(el, ".state", s.state === "unavailable" ? "Nicht erreichbar" : stateText);
  if (el.tagName === "BUTTON") el.setAttribute("aria-pressed", String(!!on));
}

/* Tippen = Hauptaktion, langes Drücken / „···“ / Umschalt+Enter = alle Funktionen */
function press(el, id, onTap) {
  const hasDetail = !!DETAIL[domainOf(id)];
  let timer = null, held = false;
  if (hasDetail) {
    const more = h("span", "more", "···"); more.setAttribute("aria-hidden", "true"); el.append(more);
    el.addEventListener("pointerdown", () => { if (editing) return; held = false; timer = setTimeout(() => { held = true; openSheet(id); }, 500); });
    ["pointerup", "pointerleave", "pointercancel"].forEach(ev => el.addEventListener(ev, () => clearTimeout(timer)));
    el.addEventListener("contextmenu", e => { e.preventDefault(); });
    el.addEventListener("keydown", e => { if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); openSheet(id); } });
  }
  el.addEventListener("click", e => {
    if (editing) return;
    if (hasDetail && e.target.closest(".more")) return openSheet(id);
    if (held) { held = false; return; }
    onTap && onTap();
  });
}

const BUILDERS = {
  light(id) {
    const el = basic("light");
    press(el, id, () => conn.call("light", "toggle", {}, id));
    return { el, update(s) {
      const a = s.attributes, on = s.state === "on";
      const pct = on && a.brightness != null ? Math.round(a.brightness / 2.55) : null;
      const rgb = on && a.rgb_color && a.color_mode && a.color_mode !== "color_temp" ? a.rgb_color : null;
      rgb ? el.style.setProperty("--tint", `rgb(${rgb.join(",")})`) : el.style.removeProperty("--tint");
      applyCommon(el, s, on, on ? (pct != null ? `An · ${pct} %` : "An") : "Aus");
    }};
  },
  switch(id) { return toggleTile(id, "switch"); },
  input_boolean(id) { return toggleTile(id, "switch"); },
  fan(id) {
    const el = basic("fan");
    press(el, id, () => conn.call("fan", "toggle", {}, id));
    return { el, update(s) {
      const on = s.state === "on", p = s.attributes.percentage;
      applyCommon(el, s, on, on ? (p ? `Läuft · ${p} %` : "Läuft") : "Aus");
    }};
  },
  humidifier(id) {
    const el = basic("drop");
    press(el, id, () => conn.call("humidifier", "toggle", {}, id));
    return { el, update(s) {
      const on = s.state === "on";
      applyCommon(el, s, on, on ? `Ziel ${s.attributes.humidity ?? "–"} %` : "Aus");
    }};
  },
  lock(id) {
    const el = basic("lock");
    press(el, id, () => conn.call("lock", states.get(id).state === "locked" ? "unlock" : "lock", {}, id));
    return { el, update(s) {
      const T = { locked: "Verriegelt", unlocked: "Offen", locking: "Verriegelt …", unlocking: "Öffnet …", jammed: "Klemmt", open: "Offen" };
      applyCommon(el, s, s.state === "locked", T[s.state] || s.state);
    }};
  },
  cover(id) {
    const el = basic("cover");
    press(el, id, () => conn.call("cover", "toggle", {}, id));
    return { el, update(s) {
      const pos = s.attributes.current_position;
      const T = { open: "Offen", closed: "Geschlossen", opening: "Öffnet …", closing: "Schließt …" };
      applyCommon(el, s, s.state === "open" || s.state === "opening", (T[s.state] || s.state) + (pos != null && pos > 0 && pos < 100 ? ` · ${pos} %` : ""));
    }};
  },
  scene(id) {
    const el = basic("scene", "wide");
    let t;
    press(el, id, () => {
      conn.call("scene", "turn_on", {}, id);
      el.classList.add("on"); el.setAttribute("aria-pressed", "true"); setText(el, ".state", "Aktiv");
      clearTimeout(t); t = setTimeout(() => tiles.get(id)?.update(states.get(id)), 1600);
    });
    return { el, update(s) { applyCommon(el, s, false, "Tippen zum Starten"); } };
  },
  button(id) {
    const el = basic("button");
    press(el, id, () => conn.call("button", "press", {}, id));
    return { el, update(s) { applyCommon(el, s, false, "Tippen zum Auslösen"); } };
  },
  input_button(id) {
    const el = basic("button");
    press(el, id, () => conn.call("input_button", "press", {}, id));
    return { el, update(s) { applyCommon(el, s, false, "Tippen zum Auslösen"); } };
  },
  number(id) { return valueTile(id, "sliders"); },
  input_number(id) { return valueTile(id, "sliders"); },
  select(id) { return valueTile(id, "list"); },
  input_select(id) { return valueTile(id, "list"); },
  vacuum(id) {
    const el = basic("vacuum");
    press(el, id, () => conn.call("vacuum", states.get(id).state === "cleaning" ? "return_to_base" : "start", {}, id));
    return { el, update(s) {
      const b = s.attributes.battery_level;
      applyCommon(el, s, s.state === "cleaning", (VAC[s.state] || s.state) + (b != null ? ` · ${b} %` : ""));
    }};
  },
  alarm_control_panel(id) {
    const el = basic("shield");
    press(el, id, () => openSheet(id));
    return { el, update(s) {
      const armed = s.state.startsWith("armed"), trig = s.state === "triggered";
      applyCommon(el, s, armed, ALARM[s.state] || s.state);
      el.classList.toggle("alert", trig);
    }};
  },
  camera(id) {
    const el = tileShell("camera wide", `<img alt=""><div class="scrim"></div><div class="lbl"><div class="name"></div><div class="state"></div></div>`);
    const img = el.querySelector("img");
    img.addEventListener("error", () => { img.style.visibility = "hidden"; });
    img.addEventListener("load", () => { img.style.visibility = ""; });
    press(el, id, () => openSheet(id));
    let shown = null;
    const load = s => { const u = camUrl(s); if (u) img.src = u; };
    return { el, refresh() { const s = states.get(id); if (s && s.state !== "unavailable" && s.state !== "off") load(s); },
      update(s) {
        if (shown !== s.attributes.entity_picture) { shown = s.attributes.entity_picture; load(s); }
        applyCommon(el, s, false, CAM[s.state] || s.state);
        el.classList.toggle("live", s.state === "streaming" || s.state === "recording");
      }};
  },
  climate(id) {
    const el = tileShell("climate tall", `
      <div class="name"></div>
      <div class="dial"><svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="7" stroke-linecap="round" stroke-dasharray="198 264"/>
        <circle class="arc" cx="50" cy="50" r="42" fill="none" stroke="#ffb340" stroke-width="7" stroke-linecap="round" stroke-dasharray="0 264"/>
      </svg><div class="val"></div></div>
      <div class="stepper"><button type="button" data-d="-1" aria-label="Kälter">−</button><button type="button" data-d="1" aria-label="Wärmer">+</button></div>
      <div class="state"></div>`, false);
    const more = h("span", "more", "···"); more.setAttribute("aria-hidden", "true"); el.append(more);
    more.addEventListener("click", () => openSheet(id));
    el.querySelector(".dial").addEventListener("click", () => openSheet(id));
    let pend = null, timer;
    const a = () => states.get(id).attributes;
    el.querySelectorAll(".stepper button").forEach(b => b.addEventListener("click", () => {
      const at = a(), step = at.target_temp_step || (at.temperature_unit === "°F" ? 1 : 0.5), d = Number(b.dataset.d) * step;
      const cl = x => Math.min(at.max_temp ?? 35, Math.max(at.min_temp ?? 7, x));
      if (!pend) pend = at.temperature != null ? { t: at.temperature } : at.target_temp_low != null ? { lo: at.target_temp_low, hi: at.target_temp_high } : { t: at.current_temperature ?? 20 };
      if ("t" in pend) pend.t = cl(pend.t + d); else { pend.lo = cl(pend.lo + d); pend.hi = cl(pend.hi + d); }
      draw(at, pend);
      clearTimeout(timer);
      timer = setTimeout(() => {
        conn.call("climate", "set_temperature", "t" in pend ? { temperature: pend.t } : { target_temp_low: pend.lo, target_temp_high: pend.hi }, id);
        pend = null;
      }, 700);
    }));
    function draw(at, p) {
      const lo = at.min_temp ?? 7, hi = at.max_temp ?? 35;
      const t = !p ? null : "t" in p ? p.t : p.hi;
      const f = t == null ? 0 : Math.min(1, Math.max(0, (t - lo) / (hi - lo)));
      el.querySelector(".arc").setAttribute("stroke-dasharray", `${198 * f} 264`);
      const v = el.querySelector(".val");
      v.textContent = !p ? "–" : "t" in p ? fmt(p.t) + "°" : `${fmt(p.lo, 0)}–${fmt(p.hi, 0)}°`;
      v.style.fontSize = p && !("t" in p) ? "1.5rem" : "";
    }
    return { el, update(s) {
      const at = s.attributes, off = s.state === "off";
      el.classList.toggle("unavailable", s.state === "unavailable");
      setText(el, ".name", nameOf(s));
      if (!pend) draw(at, off ? null : at.temperature != null ? { t: at.temperature } : at.target_temp_low != null ? { lo: at.target_temp_low, hi: at.target_temp_high } : at.current_temperature != null ? { t: at.current_temperature } : null);
      el.classList.toggle("heating", at.hvac_action === "heating"); el.classList.toggle("cooling", at.hvac_action === "cooling");
      const act = HVAC_ACTION[at.hvac_action] || HVAC_MODE[s.state] || s.state;
      const cur = at.current_temperature != null ? ` · Jetzt ${fmt(at.current_temperature)}°` : "";
      setText(el, ".state", (off ? "Aus" : act) + cur);
    }};
  },
  media_player(id) {
    const el = tileShell("media wide", `<div class="cover"></div><div><div class="name"></div><div class="state"></div><div class="bars"><i></i><i></i><i></i><i></i></div></div>`);
    press(el, id, () => conn.call("media_player", "media_play_pause", {}, id));
    return { el, update(s) {
      const playing = s.state === "playing", paused = s.state === "paused", at = s.attributes, room = at.friendly_name || id;
      el.querySelector(".cover").style.backgroundImage = at.entity_picture ? `url("${at.entity_picture}")` : "";
      applyCommon(el, s, false, "");
      el.classList.toggle("on", playing);
      setText(el, ".name", playing || paused ? (at.media_title || room) : room);
      setText(el, ".state", s.state === "unavailable" ? "Nicht erreichbar" : playing ? (at.media_artist || room) : paused ? "Pausiert" : s.state === "off" ? "Aus" : "Bereit");
    }};
  },
  sensor(id, s0) {
    const power = ["power", "energy"].includes(s0.attributes.device_class);
    const el = tileShell("metric" + (power ? " wide" : ""), `<div class="name"></div><div class="big"></div>`, false);
    return { el, update(s) {
      el.classList.toggle("unavailable", s.state === "unavailable");
      setText(el, ".name", nameOf(s));
      const v = parseFloat(s.state), unit = s.attributes.unit_of_measurement || "";
      const big = el.querySelector(".big"); big.replaceChildren(isNaN(v) ? s.state : fmt(v));
      big.append(h("small", "", unit));
    }};
  },
  binary_sensor(id, s0) {
    const dc = s0.attributes.device_class;
    const kind = { door: ["door", "Offen", "Geschlossen"], window: ["door", "Offen", "Geschlossen"], opening: ["door", "Offen", "Geschlossen"], garage_door: ["door", "Offen", "Geschlossen"],
      motion: ["motion", "Bewegung", "Ruhig"], occupancy: ["motion", "Belegt", "Frei"], presence: ["motion", "Anwesend", "Abwesend"],
      moisture: ["drop", "Feucht", "Trocken"], smoke: ["motion", "Alarm", "OK"], gas: ["motion", "Alarm", "OK"] }[dc] || ["gauge", "An", "Aus"];
    const el = basic(kind[0]); el.disabled = false; el.style.cursor = "default";
    return { el, update(s) { const on = s.state === "on"; applyCommon(el, s, on, on ? kind[1] : kind[2]); } };
  },
};
function toggleTile(id, iconKey) {
  const el = basic(iconKey), dom = domainOf(id);
  press(el, id, () => conn.call(dom, "toggle", {}, id));
  return { el, update(s) { const on = s.state === "on"; applyCommon(el, s, on, on ? "An" : "Aus"); } };
}
function valueTile(id, iconKey) {
  const el = basic(iconKey);
  press(el, id, () => openSheet(id));
  return { el, update(s) {
    const u = s.attributes.unit_of_measurement;
    const v = parseFloat(s.state);
    applyCommon(el, s, false, DETAIL_SELECT(s) ? s.state : (isNaN(v) ? s.state : fmt(v)) + (u ? " " + u : ""));
  }};
}
const DETAIL_SELECT = s => ["select", "input_select"].includes(domainOf(s.entity_id));

/* Was auf „Zuhause“ erscheint: Steuerbares und Wichtiges. Der Rest nur im Raum bzw. unter „Weitere“. */
const ORDER = ["alarm_control_panel", "scene", "camera", "climate", "light", "switch", "input_boolean", "fan", "humidifier", "cover", "lock", "vacuum", "media_player", "button", "input_button", "number", "input_number", "select", "input_select", "binary_sensor", "sensor"];
const HOME_DOMAINS = new Set(["alarm_control_panel", "camera", "scene", "climate", "light", "switch", "input_boolean", "fan", "humidifier", "cover", "lock", "vacuum", "media_player"]);
const supported = s => !!BUILDERS[domainOf(s.entity_id)];
const showOnHome = s => HOME_DOMAINS.has(domainOf(s.entity_id)) || (domainOf(s.entity_id) === "sensor" && ["power", "energy"].includes(s.attributes.device_class));

/* ---------- Räume & Gerätezuordnung ---------- */
const cfgOf = () => {
  const c = layout.__cfg = layout.__cfg || {};
  c.show = c.show || []; c.ent = c.ent || {}; c.order = c.order || []; c.names = c.names || {}; c.hidden = c.hidden || []; c.custom = c.custom || []; c.add = c.add || {}; c.remove = c.remove || {};
  return c;
};
const rankOf = s => ORDER.indexOf(domainOf(s.entity_id));
const byDefault = (a, b) => rankOf(a) - rankOf(b) || nameOf(a).localeCompare(nameOf(b), "de");
const isCustomRoom = id => id.startsWith("c_");
function baseMembers(rid) {
  const sup = [...states.values()].filter(supported);
  let list;
  if (rid === HOME) list = sup.filter(showOnHome);
  else if (rid === OTHER) {
    const assigned = new Set(Object.values(cfgOf().add).flat());
    list = sup.filter(s => !entityArea.has(s.entity_id) && !showOnHome(s) && !assigned.has(s.entity_id));
  } else if (isCustomRoom(rid)) list = [];
  else list = sup.filter(s => entityArea.get(s.entity_id) === rid);
  list.sort(byDefault);
  return list.slice(0, rid === HOME ? 40 : 300).map(s => s.entity_id);
}
function roomMembers(rid) {
  const c = cfgOf();
  const set = new Set(baseMembers(rid));
  (c.add[rid] || []).forEach(id => set.add(id));
  (c.remove[rid] || []).forEach(id => set.delete(id));
  return [...set].filter(id => states.has(id) && supported(states.get(id))).sort((x, y) => byDefault(states.get(x), states.get(y)));
}
function toggleMember(rid, id) {
  const c = cfgOf(), base = new Set(baseMembers(rid));
  const add = (c.add[rid] = c.add[rid] || []), rem = (c.remove[rid] = c.remove[rid] || []);
  if (roomMembers(rid).includes(id)) {
    if (base.has(id) && !rem.includes(id)) rem.push(id);
    const i = add.indexOf(id); if (i >= 0) add.splice(i, 1);
  } else {
    const i = rem.indexOf(id); if (i >= 0) rem.splice(i, 1);
    if (!base.has(id) && !add.includes(id)) add.push(id);
  }
  saveLayout();
}
function roomListAll() {
  const c = cfgOf();
  const list = [{ id: HOME, name: "Zuhause" }, ...areas.map(a => ({ id: a.area_id, name: a.name })), ...c.custom.map(x => ({ id: x.id, name: x.name })), { id: OTHER, name: "Weitere" }];
  list.forEach(r => { if (c.names[r.id]) r.name = c.names[r.id]; });
  const pos = new Map(c.order.map((id, i) => [id, i]));
  return list.map((r, i) => [r, i]).sort((x, y) => (pos.has(x[0].id) ? pos.get(x[0].id) : 1e6 + x[1]) - (pos.has(y[0].id) ? pos.get(y[0].id) : 1e6 + y[1])).map(x => x[0]);
}
function roomVisible(r) {
  const c = cfgOf();
  if (r.id === HOME) return true;
  if (c.hidden.includes(r.id)) return false;
  if (isCustomRoom(r.id)) return true;
  if (r.id === OTHER) return baseMembers(OTHER).length > 0;
  return roomMembers(r.id).length > 0 || c.show.includes(r.id);
}
const roomList = () => roomListAll().filter(roomVisible);
function roomName(id) {
  return cfgOf().names[id] || (id === HOME ? "Zuhause" : id === OTHER ? "Weitere" : cfgOf().custom.find(x => x.id === id)?.name || areas.find(a => a.area_id === id)?.name || id);
}

function visibleIds() {
  let ids = roomMembers(room);
  const lay = layout[room];
  if (lay) {
    const pos = new Map(lay.order.map((id, i) => [id, i]));
    ids = ids.map((id, i) => [id, i]).sort((x, y) => (pos.has(x[0]) ? pos.get(x[0]) : 1e6 + x[1]) - (pos.has(y[0]) ? pos.get(y[0]) : 1e6 + y[1])).map(x => x[0]);
    if (!editing) ids = ids.filter(id => !lay.hidden.includes(id));
  }
  return ids;
}

/* ---------- Layout: Reihenfolge, Größe, Ausblenden (pro Raum, lokal gespeichert) ---------- */
const LAYOUT_KEY = "homeview.layout";
let layout = {};
try { layout = JSON.parse(localStorage.getItem(LAYOUT_KEY)) || {}; } catch {}
let remoteSave = null;   // speichert das Layout zusätzlich im Home-Assistant-Benutzerprofil
const saveLayout = () => { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch {} remoteSave && remoteSave(); };
const roomLayout = () => (layout[room] = layout[room] || { order: [], size: {}, hidden: [] });
const SIZES = ["1x1", "2x1", "2x2", "1x2"];
function defaultSize(id) {
  const s = states.get(id), d = domainOf(id);
  if (["scene", "camera", "media_player"].includes(d)) return "2x1";
  if (d === "climate") return "1x2";
  if (d === "sensor" && ["power", "energy"].includes(s.attributes.device_class)) return "2x1";
  return "1x1";
}
const sizeOf = id => layout[room]?.size[id] || defaultSize(id);
function applySize(el, size) {
  const [c, r] = size.split("x");
  el.style.gridColumn = "span " + c; el.style.gridRow = "span " + r; el.dataset.size = size;
}

let editing = false;
function setEditing(v) {
  editing = v; $("app").classList.toggle("editing", v);
  closeSheet(); renderRooms(); renderGrid(); scheduleFit();
}
function applyIcon(id, t) {
  const o = cfgOf().ent[id] || {};
  const svg = t.el.querySelector(".ic");
  if (!svg) return;
  if (svg._def == null) { svg._def = svg.innerHTML; svg._defKey = svg.dataset.icon; }
  const st = states.get(id);
  const k = o.icon && ICONS[o.icon] ? o.icon : (st && FAN_RE.test(nameOf(st)) && domainOf(id) !== "fan" ? "fan" : (st && autoIconKey(nameOf(st), domainOf(id))));
  svg.innerHTML = k ? ICONS[k] : svg._def;
  svg.dataset.icon = k || svg._defKey;
  t.el.classList.toggle("noanim", o.anim === false);
}
function decorate(id, t) {
  applyIcon(id, t);
  applySize(t.el, sizeOf(id));
  t.el.dataset.id = id;
  const hidden = !!layout[room]?.hidden.includes(id);
  t.el.classList.toggle("is-hidden", editing && hidden);
  if (editing) {
    if (!t.ctrl) {
      t.ctrl = h("div", "edit-ctrl"); const ed = h("span", "ec-edit", "✎"); ed.setAttribute("aria-label", "Name und Symbol ändern");
      t.ctrl.append(h("span", "ec-hide"), ed, h("span", "ec-size"));
    }
    t.ctrl.querySelector(".ec-hide").textContent = hidden ? "+" : "−";
    t.ctrl.querySelector(".ec-hide").setAttribute("aria-label", hidden ? "Einblenden" : "Ausblenden");
    t.ctrl.querySelector(".ec-size").textContent = sizeOf(id).replace("x", "×");
    t.el.append(t.ctrl);
  } else t.ctrl?.remove();
}

/* ---------- Darstellung ---------- */
let rafGrid = 0;
function renderGrid() {
  scheduleChips();
  cancelAnimationFrame(rafGrid);
  rafGrid = requestAnimationFrame(() => {
    const els = visibleIds().map(id => {
      const s = states.get(id);
      let t = tiles.get(id);
      if (!t) { t = BUILDERS[domainOf(id)](id, s); tiles.set(id, t); }
      t.update(s); decorate(id, t);
      return t.el;
    });
    $("grid").replaceChildren(...els);
    scheduleFit();
    dbg("Kacheln gezeichnet: " + els.length + " (Raum " + room + ")");
    if (!els.length && !editing) { const n = document.createElement("div"); n.className = "empty"; n.textContent = "Keine Geräte gefunden (Entitäten: " + states.size + "). Prüfe unter „Anordnen → Geräte“ die Zuordnung."; $("grid").append(n); }
  });
}

/* Ziehen zum Umsortieren, Tippen auf Symbole zum Ändern der Größe */
(function setupDrag() {
  const grid = $("grid");
  let drag = null, lastSwap = 0;
  const flip = fn => {
    const kids = [...grid.children].filter(k => k !== drag.el);
    const before = new Map(kids.map(k => [k, k.getBoundingClientRect()]));
    fn();
    kids.forEach(k => {
      const a = before.get(k), b = k.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (!dx && !dy) return;
      k.style.transition = "none"; k.style.transform = `translate(${dx}px,${dy}px)`;
      requestAnimationFrame(() => { k.style.transition = "transform .25s ease"; k.style.transform = ""; });
    });
  };
  function frame() {
    if (!drag || !drag.moved) return;
    const d = drag, g = grid.getBoundingClientRect();
    if (d.y < g.top + 40) grid.scrollTop -= 10; else if (d.y > g.bottom - 40) grid.scrollTop += 10;
    d.el.style.transform = "none";
    const base = d.el.getBoundingClientRect();
    d.el.style.transform = `translate(${d.x - d.gx - base.left}px,${d.y - d.gy - base.top}px) scale(1.05)`;
    const under = document.elementFromPoint(d.x, d.y)?.closest(".tile");
    if (under && under !== d.el && under.parentNode === grid && performance.now() - lastSwap > 180) {
      const kids = [...grid.children];
      lastSwap = performance.now();
      flip(() => (kids.indexOf(d.el) < kids.indexOf(under) ? under.after(d.el) : under.before(d.el)));
    }
    requestAnimationFrame(frame);
  }
  grid.addEventListener("pointerdown", e => {
    if (!editing) return;
    const el = e.target.closest(".tile"); if (!el) return;
    const r = el.getBoundingClientRect();
    drag = { el, id: el.dataset.id, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, gx: e.clientX - r.left, gy: e.clientY - r.top, moved: false, pid: e.pointerId };
    try { grid.setPointerCapture(e.pointerId); } catch {}
  });
  grid.addEventListener("pointermove", e => {
    if (!drag || e.pointerId !== drag.pid) return;
    drag.x = e.clientX; drag.y = e.clientY;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 8) {
      drag.moved = true; drag.el.classList.add("dragging"); requestAnimationFrame(frame);
    }
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.pid) return;
    const d = drag; drag = null;
    if (d.moved) {
      d.el.classList.remove("dragging"); d.el.style.transform = "";
      roomLayout().order = [...grid.children].map(k => k.dataset.id); saveLayout();
      return;
    }
    if (e.type === "pointercancel") return;
    const t = tiles.get(d.id); if (!t || !t.ctrl) return;
    const hit = n => { const r = n.getBoundingClientRect(); return e.clientX >= r.left - 6 && e.clientX <= r.right + 6 && e.clientY >= r.top - 6 && e.clientY <= r.bottom + 6; };
    const lay = roomLayout();
    if (hit(t.ctrl.querySelector(".ec-size"))) {
      lay.size[d.id] = SIZES[(SIZES.indexOf(sizeOf(d.id)) + 1) % SIZES.length];
      if (!lay.order.length) lay.order = [...grid.children].map(k => k.dataset.id);
      saveLayout(); decorate(d.id, t);
    } else if (hit(t.ctrl.querySelector(".ec-edit"))) {
      openEntityPanel(d.id);
    } else if (hit(t.ctrl.querySelector(".ec-hide"))) {
      const i = lay.hidden.indexOf(d.id);
      i < 0 ? lay.hidden.push(d.id) : lay.hidden.splice(i, 1);
      if (!lay.order.length) lay.order = [...grid.children].map(k => k.dataset.id);
      saveLayout(); decorate(d.id, t);
    }
  };
  grid.addEventListener("pointerup", end);
  grid.addEventListener("pointercancel", e => { if (drag?.moved) drag.el.classList.remove("dragging"), (drag.el.style.transform = ""); end(e); });
  grid.addEventListener("contextmenu", e => { if (editing) e.preventDefault(); });
  // Langes Drücken auf freie Fläche oder Kopfzeile startet das Anordnen
  let t0;
  const arm = e => { if (editing || kiosk || (e.target !== grid && !e.target.closest("header"))) return; t0 = setTimeout(() => setEditing(true), 700); };
  [grid, document.querySelector("header")].forEach(n => { n.addEventListener("pointerdown", arm); ["pointerup", "pointerleave", "pointercancel", "pointermove"].forEach(ev => n.addEventListener(ev, () => clearTimeout(t0))); });
})();

function renderRooms() {
  const items = roomList();
  if (!items.some(i => i.id === room)) room = HOME;
  const pills = items.map(i => {
    const b = h("button", "", i.name); b.type = "button";
    if (i.id === room) b.setAttribute("aria-current", "true");
    b.addEventListener("click", () => { room = i.id; $("grid").scrollTop = 0; renderRooms(); renderGrid(); });
    return b;
  });
  if (editing) {
    const add = h("button", "room-add", "+ Raum"); add.type = "button"; add.addEventListener("click", addRoom);
    pills.push(add);
  }
  $("rooms").replaceChildren(...pills);
  $("rooms").querySelector("[aria-current]")?.scrollIntoView({ inline: "nearest", block: "nearest" });

  const mk = (txt, fn, cls = "") => { const b = h("button", "edit-btn " + cls, txt); b.type = "button"; b.addEventListener("click", fn); return b; };
  const bar = [];
  if (editing) {
    bar.push(mk(chipsOn() ? "Chips: An" : "Chips: Aus", () => { const c = cfgOf(); c.chips = !chipsOn(); saveLayout(); renderChips(); renderRooms(); }, "ghost"));
    bar.push(mk("Räume", openRoomManager, "ghost"));
    if (room !== OTHER) bar.push(mk("Geräte", openDevicePicker, "ghost"));
    bar.push(mk("Zurücksetzen", () => { delete layout[room]; saveLayout(); tiles.forEach(t => { t.el.style.gridColumn = t.el.style.gridRow = ""; }); renderGrid(); }, "ghost"));
  }
  bar.push(mk(editing ? "Fertig" : "Anordnen", () => setEditing(!editing)));
  $("editBar").replaceChildren(...bar);
}

/* ---------- Fenster: Name, Symbol und Animation eines Geräts ---------- */
function openEntityPanel(id) {
  const s = states.get(id); if (!s) return;
  const c = cfgOf(), get = () => (c.ent[id] = c.ent[id] || {});
  const refresh = () => { const t = tiles.get(id); if (t) { applyIcon(id, t); t.update(states.get(id)); } scheduleChips(); saveLayout(); };
  openPanel("Name und Symbol", body => {
    const w = h("div", "ctl"), row = h("div", "ctl-row"); row.append(h("span", "", "Name")); w.append(row);
    const inp = document.createElement("input"); inp.type = "text"; inp.className = "textin"; inp.id = "entName"; inp.maxLength = 40;
    inp.value = (c.ent[id] && c.ent[id].name) || ""; inp.placeholder = s.attributes.friendly_name || id;
    inp.setAttribute("aria-label", "Gerätename");
    inp.addEventListener("input", () => { const v = inp.value.trim(); const o = get(); v ? (o.name = v) : delete o.name; refresh(); });
    w.append(inp); body.append(w, h("div", "info", "Original: " + (s.attributes.friendly_name || id)));
    const t0 = tiles.get(id);
    if (t0 && t0.el.querySelector(".ic")) {
      const iw = h("div", "ctl"), ir = h("div", "ctl-row"); ir.append(h("span", "", "Symbol")); iw.append(ir);
      const origKey = t0.el.querySelector(".ic")._defKey || t0.el.querySelector(".ic").dataset.icon;
      const defKey = (FAN_RE.test(nameOf(s)) && domainOf(id) !== "fan" ? "fan" : autoIconKey(nameOf(s), domainOf(id))) || origKey;
      const GROUPS = [["Licht", ["light", "lamp", "floorlamp", "pendant", "ceiling", "spot", "wall", "strip", "lights", "candle", "lantern", "chandelier", "flood", "sun"]],
        ["Schalter und Strom", ["switch", "power", "plug", "button", "sliders"]], ["Klima", ["fan", "heater", "snow", "flame", "thermo", "drop", "gauge"]],
        ["Wohnen", ["sofa", "bed", "tv", "speaker", "media", "coffee", "washer", "fridge", "vacuum", "plant"]],
        ["Sicherheit und Haus", ["lock", "door", "window", "garage", "cover", "shield", "camera", "motion", "bell", "home", "car"]], ["Sonstiges", ["scene", "wifi", "star", "heart", "list"]]];
      const listed = new Set(GROUPS.flatMap(g => g[1])); const rest = Object.keys(ICONS).filter(k => !listed.has(k));
      if (rest.length) GROUPS.push(["Weitere", rest]);
      const btns = [];
      const mkBtn = (k, std) => {
        const b = h("button"); b.type = "button"; b.innerHTML = icon(k); b.setAttribute("aria-label", std ? "Automatisches Symbol (nach Name)" : k);
        b.addEventListener("click", () => { const o = get(); k === defKey ? delete o.icon : (o.icon = k); refresh(); mark(); });
        btns.push([k, b]); return b;
      };
      const grid = h("div", "icon-grid"); grid.append(mkBtn(defKey, true));
      const gw = h("div", "icon-groups"); gw.append(grid);
      GROUPS.forEach(([title, keys]) => {
        const g = h("div", "icon-grid"); keys.filter(k => ICONS[k]).forEach(k => g.append(mkBtn(k, false)));
        gw.append(h("div", "icon-group-title", title), g);
      });
      const mark = () => { const cur = (c.ent[id] && c.ent[id].icon) || defKey; btns.forEach(([k, b]) => b.setAttribute("aria-pressed", String(k === cur))); };
      mark(); iw.append(gw); body.append(iw);
      const an = seg(body, { label: "Animation", options: [[true, "An"], [false, "Aus"]], on: v => { const o = get(); v ? delete o.anim : (o.anim = false); refresh(); an.set(v); } });
      an.set(!(c.ent[id] && c.ent[id].anim === false));
      body.append(h("div", "info", "Animierte Symbole bewegen sich, solange das Gerät an ist (zum Beispiel dreht sich der Ventilator)."));
    }
    const rs = h("button", "", "Auf Standard zurücksetzen"); rs.type = "button";
    rs.addEventListener("click", () => { delete c.ent[id]; refresh(); openEntityPanel(id); });
    const box = h("div", "actions"); box.append(rs); body.append(box);
  });
}

/* ---------- Raumverwaltung: alle Räume an einer Stelle ---------- */
function openRoomManager() {
  openPanel("Räume verwalten", body => {
    const c = cfgOf();
    const addRow = h("div", "rm-add");
    const ni = document.createElement("input"); ni.type = "text"; ni.id = "roomNew"; ni.className = "textin"; ni.placeholder = "Neuer Raum, zum Beispiel Büro"; ni.maxLength = 30; ni.setAttribute("aria-label", "Name des neuen Raums");
    const nb = h("button", "primary", "Hinzufügen"); nb.type = "button";
    const create = () => {
      const v = ni.value.trim(); if (!v) { ni.focus(); return; }
      c.custom.push({ id: "c_" + Date.now().toString(36), name: v }); ni.value = ""; saveLayout(); renderRooms(); draw();
    };
    nb.addEventListener("click", create); ni.addEventListener("keydown", e => { if (e.key === "Enter") create(); });
    addRow.append(ni, nb);
    const list = h("div", "rm-list");
    body.append(addRow, list, h("div", "info", "Ausgeblendete Räume bleiben erhalten und lassen sich hier jederzeit wieder einblenden. Leere Räume aus Home Assistant erscheinen erst, wenn du sie einblendest."));
    function draw() {
      const all = roomListAll();
      list.replaceChildren(...all.map((r, idx) => {
        const row = h("div", "rm-row"), vis = roomVisible(r), n = r.id === OTHER ? baseMembers(OTHER).length : roomMembers(r.id).length;
        const eye = h("button", "rm-eye", vis ? "Sichtbar" : "Aus"); eye.type = "button"; eye.setAttribute("aria-pressed", String(vis));
        eye.setAttribute("aria-label", (vis ? "Ausblenden: " : "Einblenden: ") + r.name);
        if (r.id === HOME) { eye.disabled = true; }
        eye.addEventListener("click", () => {
          if (vis) { if (!c.hidden.includes(r.id)) c.hidden.push(r.id); c.show = c.show.filter(x => x !== r.id); if (room === r.id) room = HOME; }
          else { c.hidden = c.hidden.filter(x => x !== r.id); if (!isCustomRoom(r.id) && !n && !c.show.includes(r.id)) c.show.push(r.id); }
          saveLayout(); renderRooms(); renderGrid(); draw();
        });
        const name = document.createElement("input"); name.type = "text"; name.className = "textin rm-name"; name.value = r.name; name.defaultValue = r.name; name.maxLength = 30; name.setAttribute("aria-label", "Raumname");
        if (r.id === OTHER) name.disabled = true;
        name.addEventListener("input", () => {
          const v = name.value.trim();
          if (isCustomRoom(r.id)) { const x = c.custom.find(y => y.id === r.id); if (x) x.name = v || "Raum"; }
          const orig = isCustomRoom(r.id) ? null : (r.id === HOME ? "Zuhause" : areas.find(a => a.area_id === r.id)?.name);
          (v && v !== orig) ? (c.names[r.id] = v) : delete c.names[r.id];
          saveLayout(); renderRooms();
        });
        const cnt = h("span", "rm-count", n + (n === 1 ? " Gerät" : " Geräte"));
        const mv = d => { const ids = all.map(x => x.id), j = idx + d; if (j < 0 || j >= ids.length) return; [ids[idx], ids[j]] = [ids[j], ids[idx]]; c.order = ids; saveLayout(); renderRooms(); draw(); };
        const up = h("button", "rm-mv", "↑"); up.type = "button"; up.setAttribute("aria-label", "Nach oben"); up.disabled = idx === 0; up.addEventListener("click", () => mv(-1));
        const dn = h("button", "rm-mv", "↓"); dn.type = "button"; dn.setAttribute("aria-label", "Nach unten"); dn.disabled = idx === all.length - 1; dn.addEventListener("click", () => mv(1));
        row.append(eye, name, cnt, up, dn);
        if (isCustomRoom(r.id)) {
          const del = h("button", "rm-del", "Löschen"); del.type = "button";
          del.addEventListener("click", () => {
            if (del.dataset.sure !== "1") { del.dataset.sure = "1"; del.textContent = "Sicher?"; return; }
            c.custom = c.custom.filter(x => x.id !== r.id); delete layout[r.id]; delete c.add[r.id]; delete c.remove[r.id]; delete c.names[r.id];
            c.hidden = c.hidden.filter(x => x !== r.id); c.order = c.order.filter(x => x !== r.id); if (room === r.id) room = HOME;
            saveLayout(); renderRooms(); renderGrid(); draw();
          });
          row.append(del);
        }
        return row;
      }));
    }
    draw();
  });
}

/* ---------- Fenster: Raum bearbeiten, Geräte wählen ---------- */
function openPanel(title, build) {
  sheetCtx?.update.cleanup?.(); sheetCtx = null;
  const body = $("sheetBody"); body.replaceChildren();
  $("sheetTitle").textContent = title; $("sheet").dataset.kind = "panel";
  build(body);
  $("sheet").hidden = false;
  (body.querySelector("input") || $("sheetClose")).focus();
}
function addRoom() {
  const c = cfgOf(), id = "c_" + Date.now().toString(36);
  c.custom.push({ id, name: "Neuer Raum" });
  room = id; saveLayout(); renderRooms(); renderGrid(); openRoomPanel(true);
}
function openRoomPanel(fresh) {
  const rid = room, c = cfgOf();
  openPanel("Raum bearbeiten", body => {
    const w = h("div", "ctl"), row = h("div", "ctl-row"); row.append(h("span", "", "Name")); w.append(row);
    const inp = document.createElement("input"); inp.type = "text"; inp.className = "textin"; inp.id = "roomName"; inp.value = roomName(rid); inp.maxLength = 30;
    inp.setAttribute("aria-label", "Raumname");
    if (rid === OTHER) inp.disabled = true;
    inp.addEventListener("input", () => {
      const v = inp.value.trim();
      if (isCustomRoom(rid)) { const r = c.custom.find(x => x.id === rid); if (r) r.name = v || "Raum"; }
      v ? (c.names[rid] = v) : delete c.names[rid];
      saveLayout(); renderRooms();
    });
    w.append(inp); body.append(w);
    if (fresh) setTimeout(() => inp.select(), 0);

    const acts = [];
    if (rid !== OTHER) acts.push(["Geräte auswählen", () => openDevicePicker()]);
    acts.push(["← Nach vorn", () => moveRoom(-1)], ["Nach hinten →", () => moveRoom(1)]);
    actions(body, acts);

    const danger = [];
    if (rid !== HOME && rid !== OTHER) {
      const label0 = isCustomRoom(rid) ? "Raum löschen" : "Raum ausblenden";
      const b = h("button", "danger", label0); b.type = "button";
      b.addEventListener("click", () => {
        if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Wirklich? Nochmal tippen"; return; }
        if (isCustomRoom(rid)) c.custom = c.custom.filter(x => x.id !== rid); else { c.hidden.push(rid); c.show = c.show.filter(x => x !== rid); }
        delete layout[rid]; delete c.add[rid]; delete c.remove[rid]; delete c.names[rid]; c.order = c.order.filter(x => x !== rid);
        room = HOME; saveLayout(); closeSheet(); renderRooms(); renderGrid();
      });
      danger.push(b);
    }
    const reset = h("button", "", "Raum zurücksetzen"); reset.type = "button";
    reset.addEventListener("click", () => { delete layout[rid]; delete c.add[rid]; delete c.remove[rid]; delete c.names[rid]; saveLayout(); closeSheet(); renderRooms(); renderGrid(); });
    danger.push(reset);
    const box = h("div", "actions"); box.append(...danger); body.append(box);

    if (c.hidden.length) {
      const hw = h("div", "ctl"), hr = h("div", "ctl-row"); hr.append(h("span", "", "Ausgeblendete Räume")); hw.append(hr);
      const bx = h("div", "seg");
      c.hidden.forEach(id => {
        const b = h("button", "", "+ " + (c.names[id] || areas.find(a => a.area_id === id)?.name || id)); b.type = "button";
        b.addEventListener("click", () => { c.hidden = c.hidden.filter(x => x !== id); saveLayout(); renderRooms(); closeSheet(); });
        bx.append(b);
      });
      hw.append(bx); body.append(hw);
    }
  });
}
function moveRoom(dir) {
  const c = cfgOf(), ids = roomList().map(r => r.id), i = ids.indexOf(room), j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  c.order = ids; saveLayout(); renderRooms();
}
const DOMAIN_DE = { alarm_control_panel: "Alarmanlagen", scene: "Szenen", camera: "Kameras", climate: "Heizung & Klima", light: "Lichter", switch: "Schalter", input_boolean: "Schalter (Helfer)", fan: "Ventilatoren", humidifier: "Luftbefeuchter",
  cover: "Rollos & Tore", lock: "Schlösser", vacuum: "Staubsauger", media_player: "Mediaplayer", button: "Buttons", input_button: "Buttons", number: "Zahlenfelder", input_number: "Zahlenfelder", select: "Auswahlfelder", input_select: "Auswahlfelder",
  binary_sensor: "Binärsensoren", sensor: "Sensoren" };
function openDevicePicker() {
  const rid = room;
  openPanel("Geräte · " + roomName(rid), body => {
    const q = document.createElement("input"); q.type = "search"; q.className = "textin"; q.id = "pickSearch"; q.placeholder = "Geräte suchen"; q.setAttribute("aria-label", "Geräte suchen");
    const list = h("div", "picklist"); body.append(q, list);
    const draw = () => {
      const term = q.value.trim().toLowerCase(), sel = new Set(roomMembers(rid));
      const all = [...states.values()].filter(supported).filter(s => !term || nameOf(s).toLowerCase().includes(term) || s.entity_id.toLowerCase().includes(term)).sort(byDefault);
      const out = []; let last = "";
      all.forEach(s => {
        const g = DOMAIN_DE[domainOf(s.entity_id)] || domainOf(s.entity_id);
        if (g !== last) { out.push(h("div", "pick-group", g)); last = g; }
        const b = h("button", "pick-row"); b.type = "button"; b.setAttribute("aria-pressed", String(sel.has(s.entity_id)));
        b.append(h("span", "pick-check", "✓"), h("span", "pick-name", nameOf(s)), h("span", "pick-id", s.entity_id));
        b.addEventListener("click", () => {
          toggleMember(rid, s.entity_id);
          b.setAttribute("aria-pressed", String(roomMembers(rid).includes(s.entity_id)));
          renderRooms(); renderGrid();
        });
        out.push(b);
      });
      list.replaceChildren(...(out.length ? out : [h("div", "info", "Keine Geräte gefunden.")]));
    };
    q.addEventListener("input", draw); draw();
  });
}

/* ---------- Wetter: animierte Symbole ---------- */
let demoMode = false;
const WSTAR = (x, y, d) => `<circle class="w-star" cx="${x}" cy="${y}" r="1.4" style="animation-delay:${d}s"/>`;
const CLOUD = (cls = "", tr = "translate(2 4)") => `<g transform="${tr}"><path class="w-cloud ${cls}" d="M18 46A8 8 0 0 1 18 30A12 12 0 0 1 42 30A8 8 0 0 1 42 46Z"/></g>`;
const SUN = (cx, cy, r0, r1, rc) => `<g class="w-sun"><g class="w-rays" style="transform-origin:${cx}px ${cy}px">${[...Array(8)].map((_, i) => { const a = i * Math.PI / 4; return `<line x1="${(cx + Math.cos(a) * r0).toFixed(1)}" y1="${(cy + Math.sin(a) * r0).toFixed(1)}" x2="${(cx + Math.cos(a) * r1).toFixed(1)}" y2="${(cy + Math.sin(a) * r1).toFixed(1)}"/>`; }).join("")}</g><circle class="w-core" cx="${cx}" cy="${cy}" r="${rc}"/></g>`;
const MOON = tr => `<g transform="${tr}"><path class="w-moon" d="M36 8A22 22 0 1 0 56 40A17 17 0 0 1 36 8Z"/></g>`;
const DROPS = (n, dur) => [...Array(n)].map((_, i) => { const x = 20 + (i + 0.5) * (26 / n) + (i % 2) * 2; return `<line class="w-drop" x1="${x.toFixed(1)}" y1="48" x2="${(x - 2).toFixed(1)}" y2="54" style="animation-duration:${dur}s;animation-delay:${(i * dur / n).toFixed(2)}s"/>`; }).join("");
const FLAKES = (n, dur) => [...Array(n)].map((_, i) => `<circle class="w-flake" cx="${(21 + (i + 0.5) * (26 / n)).toFixed(1)}" cy="48" r="1.9" style="animation-duration:${dur}s;animation-delay:${(i * dur / n).toFixed(2)}s"/>`).join("");
const HAILS = n => [...Array(n)].map((_, i) => `<circle class="w-hail" cx="${(21 + (i + 0.5) * (26 / n)).toFixed(1)}" cy="48" r="2.2" style="animation-delay:${(i * 0.18).toFixed(2)}s"/>`).join("");
const BOLT = '<path class="w-bolt" d="M35 36l-7 11h5l-3 9 10-13h-6l4-7Z"/>';
function weatherIcon(state, night) {
  let inner;
  switch (state) {
    case "sunny": inner = night ? MOON("translate(0 0)") + WSTAR(50, 14, 0) + WSTAR(12, 20, .8) + WSTAR(20, 8, 1.5) : SUN(32, 32, 14, 22, 9); break;
    case "clear-night": inner = MOON("translate(0 0)") + WSTAR(50, 14, 0) + WSTAR(12, 20, .8) + WSTAR(20, 8, 1.5); break;
    case "partlycloudy": inner = (night ? MOON("translate(-8 -6) scale(.72)") : SUN(24, 24, 10, 15, 7)) + CLOUD("", "translate(8 8)"); break;
    case "cloudy": inner = CLOUD("w-back", "translate(-6 -2) scale(.85)") + CLOUD("", "translate(6 8)"); break;
    case "fog": inner = CLOUD("w-light", "translate(2 -4)") + [48, 54, 60].map((y, i) => `<line class="w-fog" x1="14" y1="${y}" x2="50" y2="${y}" style="animation-delay:${i * .6}s"/>`).join(""); break;
    case "rainy": inner = CLOUD("w-dark", "translate(2 0)") + DROPS(3, 1.1); break;
    case "pouring": inner = CLOUD("w-dark", "translate(2 0)") + DROPS(6, .7); break;
    case "snowy": inner = CLOUD("w-dark", "translate(2 0)") + FLAKES(4, 2.6); break;
    case "snowy-rainy": inner = CLOUD("w-dark", "translate(2 0)") + DROPS(2, 1.1) + FLAKES(2, 2.6); break;
    case "hail": inner = CLOUD("w-dark", "translate(2 0)") + HAILS(4); break;
    case "lightning": inner = CLOUD("w-storm", "translate(2 -2)") + BOLT; break;
    case "lightning-rainy": inner = CLOUD("w-storm", "translate(2 -4)") + BOLT + DROPS(2, .9); break;
    case "windy": case "windy-variant": inner = [[22, 0], [32, .4], [42, .8]].map(([y, d]) => `<path class="w-wind" d="M10 ${y}h30a6 6 0 1 0-6-6" style="animation-delay:${d}s"/>`).join(""); break;
    case "exceptional": inner = '<path class="w-warn" d="M32 8L58 54H6Z"/><path class="w-warn-i" d="M32 24v14M32 44v1"/>'; break;
    default: inner = CLOUD("", "translate(2 6)");
  }
  return `<svg class="wi" viewBox="0 0 64 64" aria-hidden="true">${inner}</svg>`;
}
const isNight = () => {
  const sun = states.get("sun.sun");
  if (sun) return sun.state === "below_horizon";
  const h = new Date().getHours(); return h >= 21 || h < 6;
};
function weatherEntity() {
  const c = cfgOf();
  return (c.weather && states.get(c.weather)) || [...states.values()].find(s => domainOf(s.entity_id) === "weather");
}

function renderHeader() {
  const d = new Date();
  $("time").textContent = pad(d.getHours()) + ":" + pad(d.getMinutes());
  $("date").textContent = d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  const w = weatherEntity();
  const c = [...states.values()].find(s => domainOf(s.entity_id) === "climate" && s.attributes.current_temperature != null);
  if (!w) { $("wx").innerHTML = c ? `<div class="wx-txt"><span>Innen ${fmt(c.attributes.current_temperature)}°</span></div>` : ""; return; }
  const t = w.attributes.temperature;
  const second = [nameOf(w), c ? `Innen ${fmt(c.attributes.current_temperature)}°` : ""].filter(Boolean).join(" · ");
  $("wx").innerHTML = `<button type="button" class="wx-btn" aria-label="Wetter-Details">${weatherIcon(w.state, isNight())}<div class="wx-txt"><b>${t != null ? fmt(t, 0) + "°" : ""}</b><span>${WEATHER[w.state] || w.state}</span><span>${second}</span></div></button>`;
}
$("wx").addEventListener("click", e => { if (e.target.closest(".wx-btn")) openWeatherPanel(); });

function openWeatherPanel() {
  openPanel("Wetter", body => {
    const w = weatherEntity();
    if (!w) { body.append(h("div", "info", "Es gibt keine Wetter-Integration in Home Assistant. Füge zum Beispiel „Met.no“ oder „MeteoSwiss“ mit dem gewünschten Ort hinzu.")); return; }
    const a = w.attributes, big = h("div", "wbig");
    big.innerHTML = weatherIcon(w.state, isNight()) + `<div><div class="wtemp">${a.temperature != null ? fmt(a.temperature, 0) + "°" : "–"}</div><div class="info">${WEATHER[w.state] || w.state} · ${nameOf(w)}</div></div>`;
    body.append(big);
    const rows = [["Luftfeuchte", a.humidity != null && a.humidity + " %"], ["Wind", a.wind_speed != null && fmt(a.wind_speed, 0) + " " + (a.wind_speed_unit || "km/h")],
      ["Böen", a.wind_gust_speed != null && fmt(a.wind_gust_speed, 0) + " " + (a.wind_speed_unit || "km/h")], ["Luftdruck", a.pressure != null && fmt(a.pressure, 0) + " " + (a.pressure_unit || "hPa")],
      ["Gefühlt", a.apparent_temperature != null && fmt(a.apparent_temperature, 0) + "°"], ["Sichtweite", a.visibility != null && fmt(a.visibility, 0) + " " + (a.visibility_unit || "km")]].filter(r => r[1]);
    if (rows.length) { const g = h("div", "wgrid"); rows.forEach(([k, v]) => { const c = h("div", "wcell"); c.append(h("span", "", k), h("b", "", v)); g.append(c); }); body.append(g); }
    const all = [...states.values()].filter(s => domainOf(s.entity_id) === "weather");
    if (all.length > 1) seg(body, { label: "Wetterquelle", options: all.map(s => [s.entity_id, nameOf(s)]), on: v => { cfgOf().weather = v; saveLayout(); renderHeader(); openWeatherPanel(); } }).set(w.entity_id);
    const nw = h("div", "ctl"), nr = h("div", "ctl-row"); nr.append(h("span", "", "Ortsname anzeigen als")); nw.append(nr);
    const inp = document.createElement("input"); inp.type = "text"; inp.className = "textin"; inp.id = "wxName"; inp.maxLength = 40; inp.placeholder = w.attributes.friendly_name || w.entity_id;
    const ent = cfgOf().ent[w.entity_id]; inp.value = (ent && ent.name) || "";
    inp.addEventListener("input", () => { const o = (cfgOf().ent[w.entity_id] = cfgOf().ent[w.entity_id] || {}); const v = inp.value.trim(); v ? (o.name = v) : delete o.name; saveLayout(); renderHeader(); });
    nw.append(inp); body.append(nw);
    if (demoMode) {
      const conds = [["sunny", "Sonnig"], ["partlycloudy", "Leicht bewölkt"], ["cloudy", "Bewölkt"], ["rainy", "Regen"], ["pouring", "Starkregen"], ["snowy", "Schnee"], ["snowy-rainy", "Schneeregen"], ["hail", "Hagel"], ["lightning", "Gewitter"], ["lightning-rainy", "Gewitter + Regen"], ["fog", "Nebel"], ["windy", "Windig"], ["clear-night", "Klare Nacht"], ["exceptional", "Warnung"]];
      const sg = seg(body, { label: "Mockup: Wetterlage ausprobieren", options: conds, on: v => { pushState({ ...w, state: v }); renderHeader(); big.firstChild.outerHTML = weatherIcon(v, v === "clear-night" || isNight()); sg.set(v); big.querySelector(".info").textContent = (WEATHER[v] || v) + " · " + nameOf(w); } });
      sg.set(w.state);
    }
  });
}
setInterval(() => $("app").hidden || renderHeader(), 15000);


/* ---------- Chips: Übersicht pro Raum (Temperatur, Feuchte, Lichter, Fenster, …) ---------- */
/* Chips sind standardmäßig an. Aus: Adresse mit #chips=0 oder unter „Anordnen → Chips“. */
const chipsOn = () => {
  if (/(^|[#&])chips=0/.test(location.hash)) return false;
  return !(layout.__cfg && layout.__cfg.chips === false);
};
const OUTDOOR = /außen|garten|terrasse|balkon|outdoor/i;
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
let chipRaf = 0;
const scheduleChips = () => { cancelAnimationFrame(chipRaf); chipRaf = requestAnimationFrame(renderChips); };
function renderChips() {
  const box = $("chips");
  if (!chipsOn() || $("app").hidden) { box.hidden = true; box.replaceChildren(); return; }
  const members = roomMembers(room).map(id => states.get(id));
  const inRoom = id => room === HOME || entityArea.get(id) === room || members.some(m => m.entity_id === id);
  const pool = room === HOME ? [...states.values()] : [...new Map([...members, ...[...states.values()].filter(s => entityArea.get(s.entity_id) === room)].map(s => [s.entity_id, s])).values()];
  const dom = d => pool.filter(s => domainOf(s.entity_id) === d && s.state !== "unavailable");
  const areaName = id => areas.find(a => a.area_id === entityArea.get(id))?.name || "";
  const indoor = s => room !== HOME || !OUTDOOR.test(areaName(s.entity_id));
  const num = v => { const n = parseFloat(v); return isNaN(n) ? null : n; };
  const chips = [];
  const add = (kind, iconKey, text, { cls = "", on } = {}) => chips.push({ kind, iconKey, text, cls, on });

  const climates = dom("climate").filter(s => indoor(s) && s.attributes.current_temperature != null);
  const tSensors = dom("sensor").filter(s => s.attributes.device_class === "temperature" && indoor(s) && num(s.state) != null);
  const temps = [...climates.map(s => s.attributes.current_temperature), ...tSensors.map(s => num(s.state))];
  if (temps.length) add("temp", "thermo", fmt(avg(temps)) + "°", { on: climates[0] ? () => openSheet(climates[0].entity_id) : null });
  const hums = [...dom("sensor").filter(s => s.attributes.device_class === "humidity" && indoor(s) && num(s.state) != null).map(s => num(s.state)),
    ...climates.filter(s => s.attributes.current_humidity != null).map(s => s.attributes.current_humidity)];
  if (hums.length) add("hum", "drop", Math.round(avg(hums)) + " %");
  const heating = dom("climate").filter(s => s.attributes.hvac_action === "heating");
  if (heating.length) add("heat", "flame", "Heizt", { cls: "active" });

  const lights = dom("light").filter(s => !FAN_RE.test(nameOf(s))), lOn = lights.filter(s => s.state === "on");
  if (lights.length) add("lights", "light", lOn.length ? `${lOn.length} ${lOn.length === 1 ? "Licht" : "Lichter"} an` : "Lichter aus", {
    cls: lOn.length ? "active" : "",
    on: () => lights.forEach(s => conn.call("light", lOn.length ? "turn_off" : "turn_on", {}, s.entity_id)) });

  const fans = pool.filter(s => ["fan", "light", "switch", "input_boolean"].includes(domainOf(s.entity_id)) && s.state !== "unavailable" && isFanLike(s)), fOn = fans.filter(s => s.state === "on");
  if (fans.length) add("fans", "fan", fOn.length ? `${fOn.length} Lüfter an` : "Lüfter aus", {
    cls: fOn.length ? "active" : "",
    on: () => fans.forEach(s => conn.call(domainOf(s.entity_id), fOn.length ? "turn_off" : "turn_on", {}, s.entity_id)) });

  const openers = dom("binary_sensor").filter(s => ["door", "window", "opening", "garage_door"].includes(s.attributes.device_class) && s.state === "on");
  if (openers.length) add("open", "door", openers.length === 1 ? `${nameOf(openers[0])} offen` : `${openers.length} offen`, { cls: "warn" });
  const locks = dom("lock"), unlocked = locks.filter(s => s.state !== "locked");
  if (locks.length) add("lock", "lock", unlocked.length ? (unlocked.length === 1 ? `${nameOf(unlocked[0])} offen` : `${unlocked.length} Schlösser offen`) : "Verriegelt", { cls: unlocked.length ? "warn" : "" });
  const playing = dom("media_player").filter(s => s.state === "playing");
  if (playing.length) add("media", "media", playing.length === 1 ? (playing[0].attributes.media_title || "Spielt") : `${playing.length} spielen`, { cls: "active" });
  const alarm = dom("alarm_control_panel")[0];
  if (alarm && room === HOME) add("alarm", "shield", ALARM[alarm.state] || alarm.state, { cls: alarm.state === "triggered" ? "warn" : alarm.state.startsWith("armed") ? "active" : "", on: () => openSheet(alarm.entity_id) });
  const pw = room === HOME ? dom("sensor").find(s => s.attributes.device_class === "power" && num(s.state) != null) : null;
  if (pw) { const w = num(pw.state), kw = (pw.attributes.unit_of_measurement || "W") === "W"; add("power", "power", kw ? fmt(w / 1000) + " kW" : fmt(w) + " " + pw.attributes.unit_of_measurement); }

  box.hidden = !chips.length;
  scheduleFit();
  box.replaceChildren(...chips.map(c => {
    const el = document.createElement(c.on ? "button" : "div");
    if (c.on) { el.type = "button"; el.addEventListener("click", c.on); }
    el.className = "chip " + c.cls + (c.on ? "" : " static");
    el.dataset.kind = c.kind;
    el.innerHTML = icon(c.iconKey);
    el.append(h("span", "", c.text));
    return el;
  }));
}

/* ---------- Anpassung an die Bildschirmhöhe: mindestens zwei volle Kachelreihen ---------- */
let fitRaf = 0;
function fitLayout() {
  const root = document.documentElement, g = $("grid");
  if ($("app").hidden || !g.isConnected) return;
  const ok = f => {
    root.style.setProperty("--fit", f.toFixed(3));
    const rem = parseFloat(getComputedStyle(root).fontSize);
    return g.clientHeight >= rem * (9 * 2 + 1.1 + 2.4);   // zwei Reihen + Abstand + Innenabstand
  };
  if (ok(1)) return;
  let lo = 0.5, hi = 1;                                      // größte Skalierung suchen, bei der zwei Reihen passen
  for (let i = 0; i < 9; i++) { const mid = (lo + hi) / 2; ok(mid) ? (lo = mid) : (hi = mid); }
  root.style.setProperty("--fit", lo.toFixed(3));
}
const scheduleFit = () => { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fitLayout); };
window.addEventListener("resize", scheduleFit);
window.addEventListener("orientationchange", () => setTimeout(scheduleFit, 250));

/* ---------- Kiosk-Modus ---------- */
let kiosk = false, fsActive = false, toastTimer;
function toast(msg, ms = 5000) {
  const t = $("toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}
async function setKiosk(on, { fullscreen = true } = {}) {
  if (on === kiosk) return;
  kiosk = on; $("app").classList.toggle("kiosk", on);
  $("kioskBtn").setAttribute("aria-label", on ? "Kiosk-Modus beenden" : "Kiosk-Modus starten");
  if (on) {
    if (editing) setEditing(false);
    closeSheet();
    let fsOk = false;
    if (fullscreen && document.documentElement.requestFullscreen) {
      try { await document.documentElement.requestFullscreen(); fsOk = true; fsActive = true; } catch {}
    }
    toast(fsOk || !fullscreen ? "Kiosk aktiv · zum Beenden die Uhrzeit 2 Sekunden gedrückt halten"
      : "Kiosk aktiv, aber der Browser erlaubt hier kein Vollbild. Zum Beenden die Uhrzeit 2 Sekunden gedrückt halten.", 7000);
  } else {
    fsActive = false;
    if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch {} }
    $("toast").hidden = true;
  }
}
$("kioskBtn").addEventListener("click", () => setKiosk(true));
document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && kiosk && fsActive) setKiosk(false); });
document.addEventListener("visibilitychange", () => { if (!document.hidden && !$("app").hidden) { try { navigator.wakeLock?.request("screen").catch(() => {}); } catch {} } });
(function exitGesture() {
  let t; const el = $("time");
  el.addEventListener("pointerdown", () => { if (kiosk) t = setTimeout(() => setKiosk(false), 2000); });
  ["pointerup", "pointerleave", "pointercancel"].forEach(ev => el.addEventListener(ev, () => clearTimeout(t)));
})();

/* ---------- Start ---------- */
function showSetup(msg) {
  $("boot").hidden = true; $("app").hidden = true; $("setup").hidden = false;
  if (msg) $("err").textContent = msg;
}
function showApp() {
  $("boot").hidden = true; $("setup").hidden = true; $("app").hidden = false;
  [["Kopfzeile", renderHeader], ["Räume", renderRooms], ["Kacheln", renderGrid]].forEach(([n, f]) => { try { f(); dbg("OK " + n); } catch (e) { dbg("FEHLER " + n + ": " + (e && e.message)); window.dispatchEvent(new ErrorEvent("error", { message: n + ": " + (e && e.message) })); } });
  dbg("Fenster: " + window.innerWidth + "×" + window.innerHeight + ", Schrift-Faktor: " + (getComputedStyle(document.documentElement).getPropertyValue("--fit") || "1"));
  dbg("Entitäten: " + states.size + ", Räume: " + areas.length + ", Zuhause-Geräte: " + visibleIds().length);
  if (new URLSearchParams(location.hash.slice(1)).get("kiosk") === "1") setKiosk(true, { fullscreen: false });
  try { navigator.wakeLock?.request("screen").catch(() => {}); } catch {}
}

function handleStateEvent(ev) {
  const { entity_id, new_state } = ev.data;
  if (new_state) {
    const known = states.has(entity_id);
    pushState(new_state);
    if (!known) { renderRooms(); renderGrid(); return; }
    if (["weather", "climate"].includes(domainOf(entity_id))) renderHeader();
  } else { states.delete(entity_id); tiles.delete(entity_id); renderGrid(); renderChips(); }
}
async function enableRemoteLayout(request) {
  try {
    const r = await request({ type: "frontend/get_user_data", key: "homeview_layout" });
    if (r && r.value && typeof r.value === "object") layout = r.value;
  } catch {}
  let lt;
  remoteSave = () => { clearTimeout(lt); lt = setTimeout(() => request({ type: "frontend/set_user_data", key: "homeview_layout", value: layout }).catch(() => {}), 400); };
}

/* Läuft HomeView als iframe unter /local/ in Home Assistant, nutzt es die bestehende Anmeldung des Dashboards: kein Token nötig */
function parentHA() {
  try {
    if (window.parent === window) return null;
    const ha = window.parent.document.querySelector("home-assistant");
    return ha && ha.hass && ha.hass.callWS ? ha : null;
  } catch { return null; }
}
function loadFromHass(ha) {
  dbg("hass.states: " + Object.keys(ha.hass.states || {}).length + ", areas: " + Object.keys(ha.hass.areas || {}).length + ", entities: " + Object.keys(ha.hass.entities || {}).length);
  const H = ha.hass;
  states.clear(); entityArea.clear();
  const ents = H.entities || {}, devs = H.devices || {};
  Object.values(H.states).forEach(s => {
    const e = ents[s.entity_id];
    if (e && (e.hidden || e.entity_category)) return;
    states.set(s.entity_id, s);
    const a = e && (e.area_id || (e.device_id && devs[e.device_id]?.area_id));
    if (a) entityArea.set(s.entity_id, a);
  });
  areas = Object.values(H.areas || {}).map(a => ({ area_id: a.area_id, name: a.name }));
}
function parentConn() {
  try { const w = window.parent; if (w && w !== window && w.hassConnection && w.hassConnection.then) return w.hassConnection; } catch {}
  return null;
}
async function startViaConn(promise) {
  dbg("Modus: Anmeldung über hassConnection");
  const { conn: c } = await promise;
  const request = msg => c.sendMessagePromise(msg);
  conn = { close() {}, call: (domain, service, data = {}, id) =>
    request({ type: "call_service", domain, service, service_data: data, ...(id ? { target: { entity_id: id } } : {}) }).then(() => true, () => false) };
  await loadRegistry({ request });
  dbg("Geräte geladen: " + states.size);
  await enableRemoteLayout(request);
  tiles.clear(); closeSheet(); showApp();
  try { await c.subscribeEvents(handleStateEvent, "state_changed"); } catch {}
}
async function startParent(ha) {
  dbg("Modus: Anmeldung über Dashboard");
  const request = msg => ha.hass.callWS(msg);
  conn = { close() {}, call: (domain, service, data = {}, id) =>
    request({ type: "call_service", domain, service, service_data: data, ...(id ? { target: { entity_id: id } } : {}) }).then(() => true, () => false) };
  loadFromHass(ha);
  await enableRemoteLayout(request);
  dbg("Layout geladen: " + Object.keys(layout).join(","));
  tiles.clear(); closeSheet(); showApp();
  try { await ha.hass.connection.subscribeEvents(handleStateEvent, "state_changed"); } catch {}
  // Sicherheitsnetz: Zustände regelmäßig mit Home Assistant abgleichen (z. B. nach Verbindungsabbruch)
  setInterval(() => {
    const H = ha.hass; if (!H) return;
    Object.values(H.states).forEach(n => { const o = states.get(n.entity_id); if (o && o.last_updated !== n.last_updated) pushState(n); });
  }, 30000);
}

function startLive({ url, token }) {
  haBase = url.replace(/\/+$/, "");
  conn = connectHA(url, token, {
    onAuthError() { try { localStorage.removeItem(STORE); } catch {} showSetup("Token wurde abgelehnt. Bitte neu eingeben."); },
    onStatus(ok) { $("banner").hidden = ok; },
    async onReady(api) {
      try {
        await loadRegistry(api);
        await enableRemoteLayout(api.request);
        await api.subscribe();
        $("banner").hidden = true;
        tiles.clear(); closeSheet();
        showApp();
      } catch (e) { $("err").textContent = "Daten konnten nicht geladen werden."; }
    },
    onEvent: handleStateEvent,
  });
}

$("setupForm").addEventListener("submit", e => {
  e.preventDefault();
  $("err").textContent = "";
  const url = $("url").value.trim(), token = $("token").value.trim();
  try { localStorage.setItem(STORE, JSON.stringify({ url, token })); } catch {}
  conn && conn.close();
  startLive({ url, token });
});

/* ---------- Kamerabilder aktualisieren ---------- */
setInterval(() => { if (!document.hidden) tiles.forEach(t => t.refresh && t.el.isConnected && t.refresh()); }, 10000);

/* ---------- Demo ---------- */
function demoFrame(label, hue) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue} 30% 35%)"/><stop offset="1" stop-color="hsl(${hue} 35% 12%)"/></linearGradient></defs><rect width="320" height="180" fill="url(#g)"/><path d="M0 130 L90 105 L190 118 L320 95 V180 H0Z" fill="hsl(${hue} 25% 18%)"/><rect x="215" y="62" width="46" height="68" rx="3" fill="hsl(${hue} 20% 24%)"/><rect x="224" y="72" width="28" height="30" fill="hsl(40 80% 70%)" opacity=".75"/><circle cx="70" cy="125" r="14" fill="hsl(${hue} 30% 22%)"/></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}
function startDemo() {
  demoMode = true;
  const S = (entity_id, state, attributes = {}) => ({ entity_id, state, attributes });
  const list = [
    S("weather.home", "partlycloudy", { temperature: 14, friendly_name: "Zuhause" }),
    S("weather.bellach", "rainy", { temperature: 11, friendly_name: "Bellach 4512", humidity: 78, wind_speed: 14, wind_speed_unit: "km/h", pressure: 1012, pressure_unit: "hPa", apparent_temperature: 9, wind_gust_speed: 26, visibility: 9 }),
    S("scene.filmabend", "scening", { friendly_name: "Filmabend" }),
    S("scene.guten_morgen", "scening", { friendly_name: "Guten Morgen" }),
    S("climate.wohnzimmer", "heat", { friendly_name: "Wohnzimmer", temperature: 22, current_temperature: 21.5, min_temp: 16, max_temp: 28, target_temp_step: 0.5, hvac_action: "heating",
      hvac_modes: ["off", "heat", "auto"], preset_modes: ["none", "eco", "comfort", "away"], preset_mode: "comfort", fan_modes: ["auto", "low", "medium", "high"], fan_mode: "auto" }),
    S("light.stehlampe", "on", { friendly_name: "Stehlampe (RGB)", brightness: 153, supported_color_modes: ["hs", "color_temp"], color_mode: "hs", hs_color: [25, 85], rgb_color: [255, 150, 38],
      color_temp_kelvin: 2700, min_color_temp_kelvin: 2000, max_color_temp_kelvin: 6500, effect_list: ["Kerze", "Regenbogen", "Puls"], effect: null }),
    S("light.decke", "on", { friendly_name: "Deckenlicht", brightness: 255, supported_color_modes: ["color_temp"], color_mode: "color_temp", color_temp_kelvin: 3200, min_color_temp_kelvin: 2200, max_color_temp_kelvin: 6000 }),
    S("light.kueche", "off", { friendly_name: "Küchenlicht", supported_color_modes: ["brightness"] }),
    S("light.luefter_bad", "on", { friendly_name: "Lüfter Bad", brightness: 128, supported_color_modes: ["brightness"] }),
    S("light.bett", "off", { friendly_name: "Nachttisch", supported_color_modes: ["onoff"] }),
    S("lock.haustuer", "unlocked", { friendly_name: "Haustür", supported_features: 1 }),
    S("fan.ventilator", "off", { friendly_name: "Ventilator", supported_features: 15, percentage: 40, percentage_step: 20, oscillating: false, direction: "forward", preset_modes: ["Natur", "Schlaf"], preset_mode: null }),
    S("cover.rollo", "open", { friendly_name: "Rollo Terrasse", current_position: 60, current_tilt_position: 30, supported_features: 255 }),
    S("switch.kaffee", "off", { friendly_name: "Kaffeemaschine" }),
    S("media_player.kueche", "playing", { friendly_name: "Küche", media_title: "Abendstimmung", media_artist: "Küche · HomePod", volume_level: 0.35, is_volume_muted: false,
      source_list: ["AirPlay", "Radio", "Bluetooth"], source: "AirPlay", shuffle: false, supported_features: 0xFFFF }),
    S("humidifier.schlafzimmer", "on", { friendly_name: "Luftbefeuchter", humidity: 50, min_humidity: 30, max_humidity: 70, available_modes: ["normal", "sleep", "boost"], mode: "normal" }),
    S("vacuum.robbi", "docked", { friendly_name: "Saugroboter", battery_level: 100, fan_speed_list: ["leise", "normal", "stark"], fan_speed: "normal" }),
    S("alarm_control_panel.haus", "disarmed", { friendly_name: "Alarmanlage", code_format: "number", code_arm_required: false, supported_features: 63 }),
    S("camera.eingang", "streaming", { friendly_name: "Eingang", supported_features: 3, entity_picture: demoFrame("Eingang", 205) }),
    S("camera.garten", "idle", { friendly_name: "Garten", supported_features: 3, entity_picture: demoFrame("Garten", 130) }),
    S("sensor.leistung", "1240", { friendly_name: "Energie jetzt", device_class: "power", unit_of_measurement: "W" }),
    S("sensor.temp_aussen", "13.4", { friendly_name: "Außentemperatur", device_class: "temperature", unit_of_measurement: "°C" }),
    S("sensor.temp_kueche", "22.3", { friendly_name: "Temperatur Küche", device_class: "temperature", unit_of_measurement: "°C" }),
    S("sensor.temp_schlaf", "19.2", { friendly_name: "Temperatur Schlafzimmer", device_class: "temperature", unit_of_measurement: "°C" }),
    S("sensor.feuchte_schlaf", "52", { friendly_name: "Luftfeuchte Schlafzimmer", device_class: "humidity", unit_of_measurement: "%" }),
    S("sensor.feuchte_wz", "46", { friendly_name: "Luftfeuchte", device_class: "humidity", unit_of_measurement: "%" }),
    S("binary_sensor.fenster_wz", "on", { friendly_name: "Fenster Wohnzimmer", device_class: "window" }),
    S("binary_sensor.bewegung_flur", "off", { friendly_name: "Bewegung Flur", device_class: "motion" }),
    S("input_number.nachtabsenkung", "17", { friendly_name: "Nachtabsenkung", min: 12, max: 21, step: 0.5, unit_of_measurement: "°C" }),
    S("input_select.hausmodus", "Zuhause", { friendly_name: "Hausmodus", options: ["Zuhause", "Abwesend", "Urlaub"] }),
    S("button.klingel_test", "unknown", { friendly_name: "Klingel testen" }),
  ];
  list.forEach(s => states.set(s.entity_id, s));
  areas = [{ area_id: "wz", name: "Wohnzimmer" }, { area_id: "ku", name: "Küche" }, { area_id: "sz", name: "Schlafzimmer" }, { area_id: "au", name: "Außen" }, { area_id: "bu", name: "Büro" }];
  Object.entries({ "climate.wohnzimmer": "wz", "light.stehlampe": "wz", "light.decke": "wz", "fan.ventilator": "wz", "sensor.feuchte_wz": "wz", "binary_sensor.fenster_wz": "wz",
    "media_player.kueche": "ku", "sensor.temp_kueche": "ku", "sensor.temp_schlaf": "sz", "sensor.feuchte_schlaf": "sz", "light.kueche": "ku", "switch.kaffee": "ku", "light.bett": "sz", "light.luefter_bad": "sz", "humidifier.schlafzimmer": "sz",
    "lock.haustuer": "au", "camera.eingang": "au", "camera.garten": "au", "alarm_control_panel.haus": "au", "cover.rollo": "au", "sensor.temp_aussen": "au" }).forEach(([k, v]) => entityArea.set(k, v));

  const set = (id, state, extra = {}) => { const o = states.get(id); pushState({ ...o, state, attributes: { ...o.attributes, ...extra } }); };
  const at = id => states.get(id).attributes, st = id => states.get(id).state;
  const SVC = {
    "light.toggle": id => set(id, st(id) === "on" ? "off" : "on", st(id) === "off" && !at(id).brightness ? { brightness: 255 } : {}),
    "light.turn_off": id => set(id, "off"),
    "light.turn_on": (id, d) => {
      const e = {};
      if (d.brightness_pct != null) e.brightness = Math.round(d.brightness_pct * 2.55);
      else if (!at(id).brightness) e.brightness = 255;
      if (d.hs_color) { e.hs_color = d.hs_color; e.rgb_color = hsToRgb(d.hs_color); e.color_mode = "hs"; }
      if (d.color_temp_kelvin) { e.color_temp_kelvin = d.color_temp_kelvin; e.color_mode = "color_temp"; }
      if (d.effect) e.effect = d.effect;
      set(id, "on", e);
    },
    "climate.set_hvac_mode": (id, d) => set(id, d.hvac_mode, { hvac_action: d.hvac_mode === "off" ? "off" : "heating" }),
    "climate.set_temperature": (id, d) => set(id, st(id), d),
    "climate.set_preset_mode": (id, d) => set(id, st(id), d),
    "climate.set_fan_mode": (id, d) => set(id, st(id), d),
    "cover.toggle": id => set(id, st(id) === "open" ? "closed" : "open", { current_position: st(id) === "open" ? 0 : 100 }),
    "cover.open_cover": id => set(id, "open", { current_position: 100 }),
    "cover.close_cover": id => set(id, "closed", { current_position: 0 }),
    "cover.stop_cover": id => set(id, st(id)),
    "cover.set_cover_position": (id, d) => set(id, d.position > 0 ? "open" : "closed", { current_position: d.position }),
    "cover.set_cover_tilt_position": (id, d) => set(id, st(id), { current_tilt_position: d.tilt_position }),
    "fan.toggle": id => set(id, st(id) === "on" ? "off" : "on"),
    "fan.turn_on": id => set(id, "on"), "fan.turn_off": id => set(id, "off"),
    "fan.set_percentage": (id, d) => set(id, d.percentage ? "on" : "off", d),
    "fan.oscillate": (id, d) => set(id, st(id), { oscillating: d.oscillating }),
    "fan.set_direction": (id, d) => set(id, st(id), d),
    "fan.set_preset_mode": (id, d) => set(id, "on", d),
    "lock.lock": id => set(id, "locked"), "lock.unlock": id => set(id, "unlocked"), "lock.open": id => set(id, "unlocked"),
    "switch.toggle": id => set(id, st(id) === "on" ? "off" : "on"),
    "humidifier.toggle": id => set(id, st(id) === "on" ? "off" : "on"),
    "humidifier.turn_on": id => set(id, "on"), "humidifier.turn_off": id => set(id, "off"),
    "humidifier.set_humidity": (id, d) => set(id, st(id), d), "humidifier.set_mode": (id, d) => set(id, st(id), d),
    "vacuum.start": id => set(id, "cleaning"), "vacuum.pause": id => set(id, "paused"), "vacuum.return_to_base": id => set(id, "docked"),
    "vacuum.locate": () => {}, "vacuum.set_fan_speed": (id, d) => set(id, st(id), d),
    "media_player.media_play_pause": id => set(id, st(id) === "playing" ? "paused" : "playing"),
    "media_player.volume_set": (id, d) => set(id, st(id), d), "media_player.volume_mute": (id, d) => set(id, st(id), d),
    "media_player.select_source": (id, d) => set(id, st(id), d), "media_player.shuffle_set": (id, d) => set(id, st(id), d),
    "media_player.turn_on": id => set(id, "idle"), "media_player.turn_off": id => set(id, "off"),
    "media_player.media_next_track": () => {}, "media_player.media_previous_track": () => {},
    "input_number.set_value": (id, d) => set(id, String(d.value)),
    "input_select.select_option": (id, d) => set(id, d.option),
    "button.press": () => {},
    "camera.turn_on": id => set(id, "idle"), "camera.turn_off": id => set(id, "off"),
    "alarm_control_panel.alarm_disarm": (id, d) => (d.code === "1234" ? set(id, "disarmed") : false),
    ...Object.fromEntries(["home", "away", "night", "vacation"].map(m => [`alarm_control_panel.alarm_arm_${m}`, id => {
      set(id, "arming"); setTimeout(() => set(id, "armed_" + m), 1500);
    }])),
  };
  conn = { close() {}, call(domain, service, data, id) { const r = (SVC[`${domain}.${service}`] || (() => {}))(id, data || {}); return Promise.resolve(r !== false); } };
  cfgOf().weather = cfgOf().weather || "weather.bellach";
  showApp();
}

(function init() {
  const isDemo = typeof DEMO_ONLY !== "undefined" || new URLSearchParams(location.search).has("demo");
  // Wenn nach 8 Sekunden nichts erscheint, Formular mit Hinweis zeigen statt leerem Bild
  if (!isDemo) setTimeout(() => { if ($("app").hidden && $("setup").hidden) showSetup("Keine Verbindung zu Home Assistant. Bitte Adresse und Token prüfen."); }, 8000);
  dbg("Start, Demo=" + isDemo + ", Hash=" + location.hash);
  const ph = parentHA();
  dbg("Dashboard gefunden: " + !!ph);
  if (ph && !isDemo) return startParent(ph).catch(e => showSetup("Anmeldung über das Dashboard fehlgeschlagen (" + (e && e.message || e) + "). Bitte Adresse und Token eingeben."));
  const pc = parentConn();
  dbg("hassConnection gefunden: " + !!pc);
  if (pc && !isDemo) return startViaConn(pc).catch(e => showSetup("Anmeldung über das Dashboard fehlgeschlagen (" + (e && e.message || e) + "). Bitte Adresse und Token eingeben."));
  if (typeof DEMO_ONLY !== "undefined" || new URLSearchParams(location.search).has("demo")) return startDemo();
  // Zugangsdaten aus der Adresse (#url=…&token=…), z. B. wenn HomeView als iframe eingebettet ist
  const hp = new URLSearchParams(location.hash.slice(1));
  if (hp.get("url") && hp.get("token")) return startLive({ url: hp.get("url"), token: hp.get("token") });
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORE)); } catch {}
  $("url").value = saved?.url || (location.protocol.startsWith("http") && location.port === "8123" ? location.origin : "");
  if (saved?.url && saved?.token) startLive(saved);
  else showSetup();
})();
$("demoBtn").addEventListener("click", startDemo);
