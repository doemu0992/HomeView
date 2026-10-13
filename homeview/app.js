"use strict";
/* HomeView – Home-Assistant-Frontend im Stil eines Apple-Home-Displays.
   Kein Build-Schritt: spricht direkt die WebSocket-API von Home Assistant. */

const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, "0");
const STORE = "homeview.conn";
const HOME = "__home";

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
};
const icon = k => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;

/* ---------- Texte ---------- */
const WEATHER = {
  "clear-night": "Klar", cloudy: "Bewölkt", exceptional: "Außergewöhnlich", fog: "Nebel", hail: "Hagel",
  lightning: "Gewitter", "lightning-rainy": "Gewitter mit Regen", partlycloudy: "Leicht bewölkt", pouring: "Starkregen",
  rainy: "Regen", snowy: "Schnee", "snowy-rainy": "Schneeregen", sunny: "Sonnig", windy: "Windig", "windy-variant": "Windig",
};
const HVAC = { heating: "Heizt", cooling: "Kühlt", idle: "Bereit", off: "Aus", drying: "Entfeuchtet", fan: "Lüftet" };
const fmt = (n, d = 1) => Number(n).toLocaleString("de-DE", { maximumFractionDigits: d });

/* ---------- Zustand ---------- */
let conn = null;                    // { call(domain, service, data, target), close() }
const states = new Map();           // entity_id -> state object
let areas = [];                     // [{area_id, name}]
const entityArea = new Map();       // entity_id -> area_id
let room = HOME;
const tiles = new Map();            // entity_id -> { el, update(state) }

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
      request({ type: "call_service", domain, service, service_data: data, ...(entity_id ? { target: { entity_id } } : {}) }).catch(() => {}),
    subscribe: () => request({ type: "subscribe_events", event_type: "state_changed" }),
    close: () => { closed = true; ws && ws.close(); },
  };
  open();
  return api;
}

async function loadRegistry(api) {
  const [st, ar, dev, ent] = await Promise.all([
    api.request({ type: "get_states" }),
    api.request({ type: "config/area_registry/list" }),
    api.request({ type: "config/device_registry/list" }),
    api.request({ type: "config/entity_registry/list" }),
  ]);
  states.clear(); st.forEach(s => states.set(s.entity_id, s));
  const devArea = new Map(dev.map(d => [d.id, d.area_id]));
  entityArea.clear();
  const hidden = new Set();
  ent.forEach(e => {
    if (e.hidden_by || e.disabled_by || e.entity_category) hidden.add(e.entity_id);
    const a = e.area_id || devArea.get(e.device_id);
    if (a) entityArea.set(e.entity_id, a);
  });
  hidden.forEach(id => states.delete(id));
  areas = ar.map(a => ({ area_id: a.area_id, name: a.name }));
}

/* ---------- Kachel-Fabrik ---------- */
const nameOf = s => s.attributes.friendly_name || s.entity_id;
const domainOf = id => id.split(".")[0];

function tileShell(cls, html) {
  const el = document.createElement(cls.btn === false ? "div" : "button");
  if (cls.btn !== false) el.type = "button";
  el.className = "tile " + (cls.cls || "");
  el.innerHTML = html;
  return el;
}
function basic(s, iconKey, cls = "") {
  const el = tileShell({ cls }, `${icon(iconKey)}<div><div class="name"></div><div class="state"></div></div>`);
  return el;
}
function setText(el, sel, t) { const n = el.querySelector(sel); if (n.textContent !== t) n.textContent = t; }
function applyCommon(el, s, on, stateText) {
  el.classList.toggle("on", !!on);
  el.classList.toggle("unavailable", s.state === "unavailable");
  setText(el, ".name", nameOf(s));
  setText(el, ".state", s.state === "unavailable" ? "Nicht erreichbar" : stateText);
  if (el.tagName === "BUTTON") el.setAttribute("aria-pressed", String(!!on));
}

function press(el, onTap, onHold) {
  let timer = null, held = false;
  el.addEventListener("pointerdown", () => {
    held = false;
    if (onHold) timer = setTimeout(() => { held = true; onHold(); }, 500);
  });
  const cancel = () => clearTimeout(timer);
  el.addEventListener("pointerup", cancel);
  el.addEventListener("pointerleave", cancel);
  el.addEventListener("pointercancel", cancel);
  el.addEventListener("click", () => { if (!held) onTap(); });
  if (onHold) el.addEventListener("contextmenu", e => e.preventDefault());
}

const BUILDERS = {
  light(id, s) {
    const el = basic(s, "light");
    const dimmable = () => {
      const m = states.get(id)?.attributes.supported_color_modes || [];
      return m.length && !(m.length === 1 && m[0] === "onoff");
    };
    press(el, () => conn.call("light", "toggle", {}, id), () => dimmable() && openSheet(id));
    return { el, update(s) {
      const on = s.state === "on";
      const pct = on && s.attributes.brightness != null ? Math.round(s.attributes.brightness / 2.55) : null;
      applyCommon(el, s, on, on ? (pct != null ? `An · ${pct} %` : "An") : "Aus");
    }};
  },
  switch(id, s) {
    const el = basic(s, "switch");
    press(el, () => conn.call("switch", "toggle", {}, id));
    return { el, update(s) { const on = s.state === "on"; applyCommon(el, s, on, on ? "An" : "Aus"); } };
  },
  input_boolean(id, s) {
    const el = basic(s, "switch");
    press(el, () => conn.call("input_boolean", "toggle", {}, id));
    return { el, update(s) { const on = s.state === "on"; applyCommon(el, s, on, on ? "An" : "Aus"); } };
  },
  fan(id, s) {
    const el = basic(s, "fan");
    press(el, () => conn.call("fan", "toggle", {}, id));
    return { el, update(s) {
      const on = s.state === "on", p = s.attributes.percentage;
      applyCommon(el, s, on, on ? (p ? `Läuft · ${p} %` : "Läuft") : "Aus");
    }};
  },
  lock(id, s) {
    const el = basic(s, "lock");
    press(el, () => conn.call("lock", states.get(id).state === "locked" ? "unlock" : "lock", {}, id));
    return { el, update(s) {
      const T = { locked: "Verriegelt", unlocked: "Offen", locking: "Verriegelt …", unlocking: "Öffnet …", jammed: "Klemmt", open: "Offen" };
      applyCommon(el, s, s.state === "locked", T[s.state] || s.state);
    }};
  },
  cover(id, s) {
    const el = basic(s, "cover");
    press(el, () => conn.call("cover", "toggle", {}, id));
    return { el, update(s) {
      const pos = s.attributes.current_position;
      const T = { open: "Offen", closed: "Geschlossen", opening: "Öffnet …", closing: "Schließt …" };
      applyCommon(el, s, s.state === "open" || s.state === "opening", (T[s.state] || s.state) + (pos != null && s.state === "open" ? ` · ${pos} %` : ""));
    }};
  },
  scene(id, s) {
    const el = basic(s, "scene", "wide");
    let t;
    press(el, () => {
      conn.call("scene", "turn_on", {}, id);
      el.classList.add("on"); el.setAttribute("aria-pressed", "true"); setText(el, ".state", "Aktiv");
      clearTimeout(t); t = setTimeout(() => tiles.get(id)?.update(states.get(id)), 1600);
    });
    return { el, update(s) { applyCommon(el, s, false, "Tippen zum Starten"); } };
  },
  climate(id, s) {
    const el = tileShell({ cls: "climate tall", btn: false }, `
      <div class="name"></div>
      <div class="dial"><svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="7" stroke-linecap="round" stroke-dasharray="198 264"/>
        <circle class="arc" cx="50" cy="50" r="42" fill="none" stroke="#ffb340" stroke-width="7" stroke-linecap="round" stroke-dasharray="0 264"/>
      </svg><div class="val"></div></div>
      <div class="stepper"><button type="button" data-d="-1" aria-label="Kälter">−</button><button type="button" data-d="1" aria-label="Wärmer">+</button></div>
      <div class="state"></div>`);
    let target = null, timer;
    const a = () => states.get(id).attributes;
    el.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
      const at = a(), step = at.target_temp_step || (at.temperature_unit === "°F" ? 1 : 0.5);
      if (target == null) target = at.temperature ?? at.current_temperature ?? 20;
      target = Math.min(at.max_temp ?? 35, Math.max(at.min_temp ?? 7, target + step * Number(b.dataset.d)));
      draw(at, target);
      clearTimeout(timer);
      timer = setTimeout(() => { conn.call("climate", "set_temperature", { temperature: target }, id); target = null; }, 700);
    }));
    function draw(at, t) {
      const lo = at.min_temp ?? 7, hi = at.max_temp ?? 35;
      const f = t == null ? 0 : Math.min(1, Math.max(0, (t - lo) / (hi - lo)));
      el.querySelector(".arc").setAttribute("stroke-dasharray", `${198 * f} 264`);
      el.querySelector(".val").textContent = t == null ? "–" : fmt(t) + "°";
    }
    return { el, update(s) {
      const at = s.attributes, off = s.state === "off";
      el.classList.toggle("unavailable", s.state === "unavailable");
      setText(el, ".name", nameOf(s));
      if (target == null) draw(at, off ? null : at.temperature ?? at.current_temperature);
      const act = HVAC[at.hvac_action] || HVAC[s.state] || s.state;
      const cur = at.current_temperature != null ? ` · Jetzt ${fmt(at.current_temperature)}°` : "";
      setText(el, ".state", (off ? "Aus" : act) + cur);
    }};
  },
  media_player(id, s) {
    const el = tileShell({ cls: "media wide" }, `<div class="cover"></div><div><div class="name"></div><div class="state"></div><div class="bars"><i></i><i></i><i></i><i></i></div></div>`);
    press(el, () => conn.call("media_player", "media_play_pause", {}, id));
    return { el, update(s) {
      const playing = s.state === "playing", at = s.attributes;
      const room = at.friendly_name || id;
      const cover = el.querySelector(".cover");
      cover.style.backgroundImage = at.entity_picture ? `url("${at.entity_picture}")` : "";
      applyCommon(el, s, false, "");
      el.classList.toggle("on", playing);
      setText(el, ".name", playing || s.state === "paused" ? (at.media_title || room) : room);
      setText(el, ".state", s.state === "unavailable" ? "Nicht erreichbar" : playing ? (at.media_artist || room) : s.state === "paused" ? "Pausiert" : s.state === "off" ? "Aus" : "Bereit");
    }};
  },
  sensor(id, s) {
    const el = tileShell({ cls: "metric wide", btn: false }, `<div class="name"></div><div class="big"></div>`);
    return { el, update(s) {
      el.classList.toggle("unavailable", s.state === "unavailable");
      setText(el, ".name", nameOf(s));
      const v = parseFloat(s.state), unit = s.attributes.unit_of_measurement || "";
      const big = el.querySelector(".big");
      big.innerHTML = "";
      big.append(isNaN(v) ? s.state : fmt(v));
      const sm = document.createElement("small"); sm.textContent = unit; big.append(sm);
    }};
  },
};
BUILDERS.sensor.accept = s => s.attributes.device_class === "power" || s.attributes.device_class === "energy";
const ORDER = ["scene", "climate", "light", "switch", "input_boolean", "fan", "cover", "lock", "media_player", "sensor"];

function supported(s) {
  const d = domainOf(s.entity_id);
  if (!BUILDERS[d]) return false;
  return d !== "sensor" || BUILDERS.sensor.accept(s);
}

/* ---------- Darstellung ---------- */
function visibleIds() {
  let ids = [...states.values()].filter(supported).map(s => s.entity_id);
  if (room !== HOME) ids = ids.filter(id => entityArea.get(id) === room);
  const rank = id => ORDER.indexOf(domainOf(id));
  const cap = room === HOME ? 40 : 200;
  ids.sort((a, b) => rank(a) - rank(b) || nameOf(states.get(a)).localeCompare(nameOf(states.get(b)), "de"));
  return ids.slice(0, cap);
}

let rafGrid = 0;
function renderGrid() {
  cancelAnimationFrame(rafGrid);
  rafGrid = requestAnimationFrame(() => {
    const els = visibleIds().map(id => {
      const s = states.get(id);
      let t = tiles.get(id);
      if (!t) { t = BUILDERS[domainOf(id)](id, s); tiles.set(id, t); }
      t.update(s);
      return t.el;
    });
    $("grid").replaceChildren(...els);
  });
}

function renderRooms() {
  const withDevices = areas.filter(a => [...entityArea].some(([id, ar]) => ar === a.area_id && states.has(id) && supported(states.get(id))));
  const items = [{ area_id: HOME, name: "Zuhause" }, ...withDevices];
  if (!items.some(i => i.area_id === room)) room = HOME;
  $("rooms").replaceChildren(...items.map(i => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = i.name;
    if (i.area_id === room) b.setAttribute("aria-current", "true");
    b.addEventListener("click", () => { room = i.area_id; $("grid").scrollTop = 0; renderRooms(); renderGrid(); });
    return b;
  }));
}

function renderHeader() {
  const d = new Date();
  $("time").textContent = pad(d.getHours()) + ":" + pad(d.getMinutes());
  $("date").textContent = d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  const w = [...states.values()].find(s => domainOf(s.entity_id) === "weather");
  const c = [...states.values()].find(s => domainOf(s.entity_id) === "climate" && s.attributes.current_temperature != null);
  const parts = [];
  if (w) {
    const t = w.attributes.temperature;
    parts.push(`<b>${t != null ? fmt(t, 0) + "°" : ""}</b>`, `<span>${WEATHER[w.state] || w.state}</span>`);
  }
  if (c) parts.push(`<span>Innen ${fmt(c.attributes.current_temperature)}°</span>`);
  $("wx").innerHTML = parts.join("");
}
setInterval(() => $("app").hidden || renderHeader(), 15000);

/* ---------- Helligkeit ---------- */
let sheetId = null;
function openSheet(id) {
  sheetId = id;
  const s = states.get(id), pct = Math.round((s.attributes.brightness || 255) / 2.55);
  $("sheetTitle").textContent = nameOf(s);
  $("sheetRange").value = pct; $("sheetVal").textContent = pct + " %";
  $("sheet").hidden = false; $("sheetRange").focus();
}
let sheetTimer;
$("sheetRange").addEventListener("input", e => {
  $("sheetVal").textContent = e.target.value + " %";
  clearTimeout(sheetTimer);
  sheetTimer = setTimeout(() => conn.call("light", "turn_on", { brightness_pct: Number(e.target.value) }, sheetId), 120);
});
const closeSheet = () => { $("sheet").hidden = true; sheetId = null; };
$("sheetClose").addEventListener("click", closeSheet);
$("sheetBg").addEventListener("click", closeSheet);
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("sheet").hidden) closeSheet(); });

/* ---------- Start ---------- */
function showApp() {
  $("setup").hidden = true; $("app").hidden = false;
  renderHeader(); renderRooms(); renderGrid();
  try { navigator.wakeLock?.request("screen").catch(() => {}); } catch {}
}

function startLive({ url, token }) {
  conn = connectHA(url, token, {
    onAuthError() { localStorage.removeItem(STORE); $("app").hidden = true; $("setup").hidden = false; $("err").textContent = "Token wurde abgelehnt. Bitte neu eingeben."; },
    onStatus(ok) { $("banner").hidden = ok; },
    async onReady(api) {
      try {
        await loadRegistry(api);
        await api.subscribe();
        $("banner").hidden = true;
        tiles.clear();
        showApp();
      } catch (e) { $("err").textContent = "Daten konnten nicht geladen werden."; }
    },
    onEvent(ev) {
      const { entity_id, new_state } = ev.data;
      if (new_state) {
        const known = states.has(entity_id);
        states.set(entity_id, new_state);
        if (!known) { renderRooms(); renderGrid(); return; }
        const t = tiles.get(entity_id);
        if (t) t.update(new_state);
        if (domainOf(entity_id) === "weather" || domainOf(entity_id) === "climate") renderHeader();
        if (domainOf(entity_id) === "light" || domainOf(entity_id) === "media_player") { /* Reihenfolge bleibt stabil */ }
      } else { states.delete(entity_id); tiles.delete(entity_id); renderGrid(); }
    },
  });
}

$("setupForm").addEventListener("submit", e => {
  e.preventDefault();
  $("err").textContent = "";
  const url = $("url").value.trim(), token = $("token").value.trim();
  localStorage.setItem(STORE, JSON.stringify({ url, token }));
  conn && conn.close();
  startLive({ url, token });
});

/* ---------- Demo ---------- */
function startDemo() {
  const S = (entity_id, state, attributes = {}) => ({ entity_id, state, attributes });
  const list = [
    S("weather.home", "partlycloudy", { temperature: 14, friendly_name: "Zuhause" }),
    S("scene.filmabend", "scening", { friendly_name: "Filmabend" }),
    S("scene.guten_morgen", "scening", { friendly_name: "Guten Morgen" }),
    S("climate.wohnzimmer", "heat", { friendly_name: "Wohnzimmer", temperature: 22, current_temperature: 21.5, min_temp: 16, max_temp: 28, target_temp_step: 0.5, hvac_action: "heating" }),
    S("light.stehlampe", "on", { friendly_name: "Stehlampe", brightness: 153, supported_color_modes: ["brightness"] }),
    S("light.decke", "on", { friendly_name: "Deckenlicht", brightness: 255, supported_color_modes: ["color_temp"] }),
    S("light.kueche", "off", { friendly_name: "Küchenlicht", brightness: 0, supported_color_modes: ["brightness"] }),
    S("light.bett", "off", { friendly_name: "Nachttisch", supported_color_modes: ["brightness"] }),
    S("lock.haustuer", "unlocked", { friendly_name: "Haustür" }),
    S("fan.ventilator", "off", { friendly_name: "Ventilator" }),
    S("cover.rollo", "closed", { friendly_name: "Rollo Terrasse", current_position: 0 }),
    S("switch.kaffee", "off", { friendly_name: "Kaffeemaschine" }),
    S("media_player.kueche", "playing", { friendly_name: "Küche", media_title: "Abendstimmung", media_artist: "Küche · HomePod" }),
    S("sensor.leistung", "1240", { friendly_name: "Energie jetzt", device_class: "power", unit_of_measurement: "W" }),
  ];
  list.forEach(s => states.set(s.entity_id, s));
  areas = [{ area_id: "wz", name: "Wohnzimmer" }, { area_id: "ku", name: "Küche" }, { area_id: "sz", name: "Schlafzimmer" }, { area_id: "au", name: "Außen" }];
  Object.entries({ "climate.wohnzimmer": "wz", "light.stehlampe": "wz", "light.decke": "wz", "fan.ventilator": "wz", "media_player.kueche": "ku",
    "light.kueche": "ku", "switch.kaffee": "ku", "light.bett": "sz", "lock.haustuer": "au", "cover.rollo": "au" }).forEach(([k, v]) => entityArea.set(k, v));

  const set = (id, state, extra = {}) => {
    const n = { ...states.get(id), state, attributes: { ...states.get(id).attributes, ...extra } };
    states.set(id, n); tiles.get(id)?.update(n);
  };
  conn = { close() {}, call(domain, service, data, id) {
    const s = states.get(id); if (!s) return;
    if (service === "toggle") set(id, s.state === "on" ? "off" : s.state === "open" ? "closed" : s.state === "closed" ? "open" : "on");
    else if (domain === "lock") set(id, service === "lock" ? "locked" : "unlocked");
    else if (service === "turn_on" && domain === "light") set(id, "on", { brightness: Math.round(data.brightness_pct * 2.55) });
    else if (service === "set_temperature") set(id, s.state, { temperature: data.temperature });
    else if (service === "media_play_pause") set(id, s.state === "playing" ? "paused" : "playing");
  }};
  showApp();
}
$("demoBtn").addEventListener("click", startDemo);

(function init() {
  const params = new URLSearchParams(location.search);
  if (params.has("demo")) return startDemo();
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORE)); } catch {}
  // Wird die Seite von Home Assistant selbst ausgeliefert (z. B. /local/homeview/), ist die Adresse bekannt.
  $("url").value = saved?.url || (location.protocol.startsWith("http") && location.port === "8123" ? location.origin : "");
  if (saved?.url && saved?.token) startLive(saved);
})();
