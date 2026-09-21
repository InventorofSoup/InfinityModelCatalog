const STATE_KEY = "infinityMasterTracker";
const CUSTOM_KEY = "infinityMasterTrackerCustom";
const SHOW_AVA_KEY = "infinityMasterTrackerShowAva";
const OVERRIDES_KEY = "infinityMasterTrackerOverrides";
const HIDE_MERC_KEY = "infinityMasterTrackerHideMercGuests";

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch (e) {
    return fallback;
  }
}
function loadBool(key, fallback) {
  const v = localStorage.getItem(key);
  return v === null ? fallback : v === "true";
}

let state = loadJson(STATE_KEY, {});
let customEntries = loadJson(CUSTOM_KEY, []);
let showAva = loadBool(SHOW_AVA_KEY, true);
let hideMercGuests = loadBool(HIDE_MERC_KEY, false);
let fieldOverrides = loadJson(OVERRIDES_KEY, {});
let DATA = [];

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}
function saveCustom() {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(customEntries));
}
function saveOverrides() {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(fieldOverrides));
}
function applyOverride(rec) {
  const ov = fieldOverrides[rec.id];
  return ov ? Object.assign({}, rec, ov, { edited: true }) : rec;
}
function rebuildData() {
  DATA = CATALOG_DATA.concat(customEntries).map(applyOverride);
}
rebuildData();

function getRowState(rec) {
  const s = state[rec.id];
  if (s) return s;
  return { have: rec.have, qty: rec.qty, painted: rec.painted };
}

function setRowState(rec, patch) {
  const cur = getRowState(rec);
  state[rec.id] = Object.assign({}, cur, patch);
  saveState();
}

function statusClass(status) {
  if (!status) return "";
  if (status.startsWith("Current")) return "status-current";
  if (status.startsWith("Limited")) return "status-limited";
  return "status-oop";
}

function factionList() {
  return Array.from(new Set(DATA.flatMap(r => r.tabs))).sort();
}
function statusList() {
  return Array.from(new Set(DATA.map(r => r.status).filter(Boolean))).sort();
}

function unitKeyOf(rec) {
  return (rec.unit || "").trim().toLowerCase();
}

function buildUnitGroups() {
  const map = new Map();
  DATA.forEach(rec => {
    const key = unitKeyOf(rec);
    if (!key) return;
    if (!map.has(key)) map.set(key, { key, name: rec.unit.trim(), models: [] });
    map.get(key).models.push(rec);
  });
  return map;
}

const filters = { search: "", faction: "all", status: "all", owned: "all" };

const controlsEl = document.querySelector(".controls");
const unitListView = document.getElementById("unitListView");
const unitDetailView = document.getElementById("unitDetailView");
const unitGridEl = document.getElementById("unitGrid");
const modelListEl = document.getElementById("modelList");
const unitTitleEl = document.getElementById("unitTitle");
const unitProgressEl = document.getElementById("unitProgress");
const progressEl = document.getElementById("progress");
const factionChipsEl = document.getElementById("factionChips");
const statusChipsEl = document.getElementById("statusChips");
const ownedChipsEl = document.getElementById("ownedChips");
const searchEl = document.getElementById("search");
const backBtn = document.getElementById("backBtn");

let currentDetailKey = null;

function buildChips(container, values, key, allLabel) {
  container.innerHTML = "";
  const all = document.createElement("button");
  all.className = "chip active";
  all.textContent = allLabel;
  all.dataset.value = "all";
  container.appendChild(all);
  values.forEach(v => {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = v;
    b.dataset.value = v;
    container.appendChild(b);
  });
}

function refreshChips() {
  buildChips(factionChipsEl, factionList(), "faction", "All factions");
  buildChips(statusChipsEl, statusList(), "status", "All statuses");
}

factionChipsEl.addEventListener("click", e => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  [...factionChipsEl.querySelectorAll(".chip")].forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
  filters.faction = btn.dataset.value;
  renderUnitList();
});
statusChipsEl.addEventListener("click", e => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  [...statusChipsEl.querySelectorAll(".chip")].forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
  filters.status = btn.dataset.value;
  renderUnitList();
});
ownedChipsEl.addEventListener("click", e => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  [...ownedChipsEl.querySelectorAll(".chip")].forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
  filters.owned = btn.dataset.owned;
  renderUnitList();
});

let searchDebounce;
searchEl.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    filters.search = searchEl.value.trim().toLowerCase();
    renderUnitList();
  }, 120);
});

function matchesNonFaction(rec) {
  const s = getRowState(rec);
  if (filters.status !== "all" && rec.status !== filters.status) return false;
  if (filters.owned === "owned" && !s.have) return false;
  if (filters.owned === "missing" && s.have) return false;
  if (filters.search) {
    const hay = `${rec.unit} ${rec.sculpt} ${rec.weapon} ${rec.notes}`.toLowerCase();
    if (!hay.includes(filters.search)) return false;
  }
  return true;
}

function matches(rec) {
  if (filters.faction !== "all" && !rec.tabs.includes(filters.faction)) return false;
  return matchesNonFaction(rec);
}

// A row is a "mercenary guest" appearance in `faction` if it's tagged both
// that faction and Mercenaries. A unit still counts as native to `faction`
// if ANY of its other rows carries that faction tag without Mercenaries.
function unitMatchesFilters(u) {
  if (!u.models.some(matchesNonFaction)) return false;
  if (filters.faction === "all") return true;
  const anyTagged = u.models.some(m => m.tabs.includes(filters.faction));
  if (!anyTagged) return false;
  if (!hideMercGuests || filters.faction === "Mercenaries") return true;
  return u.models.some(m => m.tabs.includes(filters.faction)
    && (!m.tabs.includes("Mercenaries") || (m.nativeTabs || []).includes(filters.faction)));
}

// ---------- routing ----------
function currentUnitKeyFromHash() {
  const m = location.hash.match(/^#unit\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function route() {
  const key = currentUnitKeyFromHash();
  if (key && buildUnitGroups().has(key)) {
    showUnitDetail(key);
  } else {
    location.hash = "";
    showUnitList();
  }
}
window.addEventListener("hashchange", route);
backBtn.addEventListener("click", () => { location.hash = ""; });

function showUnitList() {
  currentDetailKey = null;
  unitDetailView.classList.add("hidden");
  unitListView.classList.remove("hidden");
  controlsEl.classList.remove("hidden");
  renderUnitList();
}
function showUnitDetail(key) {
  currentDetailKey = key;
  unitListView.classList.add("hidden");
  unitDetailView.classList.remove("hidden");
  controlsEl.classList.add("hidden");
  renderUnitDetail(key);
}

// ---------- AVA ----------
function unitAvaInfo(group) {
  const avas = group.models.map(m => m.highestAva).filter(v => typeof v === "number" && v > 0);
  const highestAva = avas.length ? Math.max(...avas) : null;
  const totalQty = group.models.reduce((sum, m) => sum + (getRowState(m).qty || 0), 0);
  const over = highestAva != null && totalQty > highestAva;
  return { highestAva, totalQty, over, overBy: over ? totalQty - highestAva : 0 };
}

function avaLineHtml(ava) {
  if (!showAva || ava.highestAva == null) return "";
  return ava.over
    ? `<div class="ava-line over">AVA ${ava.highestAva} — over by ${ava.overBy}</div>`
    : `<div class="ava-line">AVA ${ava.highestAva}</div>`;
}

// ---------- unit list ----------
function unitCardHtml(u) {
  const total = u.models.length;
  const owned = u.models.filter(m => getRowState(m).have).length;
  const pct = total ? Math.round((owned / total) * 100) : 0;
  const rep = u.models.find(m => m.image && (m.status || "").startsWith("Current")) || u.models.find(m => m.image);
  const img = rep ? `<img src="${rep.image}" alt="${u.name}">` : `<div class="noimg">no photo</div>`;
  const factions = Array.from(new Set(u.models.flatMap(m => m.tabs))).slice(0, 4);
  const tags = factions.map(f => `<span class="tag">${f}</span>`).join("");
  const ava = unitAvaInfo(u);
  return `
    <div class="unit-card ${showAva && ava.over ? "over-ava" : ""}" data-key="${encodeURIComponent(u.key)}">
      <div class="thumb">${img}</div>
      <div class="unit-card-body">
        <div class="unit-card-name">${u.name}</div>
        <div class="tags">${tags}</div>
        <div class="unit-bar-track"><div class="unit-bar-fill" style="width:${pct}%"></div></div>
        <div class="unit-count">${owned} / ${total} owned</div>
        ${avaLineHtml(ava)}
      </div>
    </div>`;
}

function renderUnitList() {
  const groups = Array.from(buildUnitGroups().values())
    .filter(unitMatchesFilters)
    .sort((a, b) => a.name.localeCompare(b.name));
  unitGridEl.innerHTML = groups.length
    ? groups.map(unitCardHtml).join("")
    : `<div class="empty">No units match these filters.</div>`;
  updateGlobalProgress();
}

unitGridEl.addEventListener("click", e => {
  const card = e.target.closest(".unit-card");
  if (!card) return;
  location.hash = "#unit/" + card.dataset.key;
});

// ---------- unit detail ----------
function modelRowHtml(rec) {
  const s = getRowState(rec);
  const img = rec.image
    ? `<img src="${rec.image}" alt="${rec.unit}">`
    : `<div class="noimg">no photo</div>`;
  const tags = [
    rec.status ? `<span class="tag ${statusClass(rec.status)}">${rec.status.split(" / ")[0]}</span>` : "",
    ...rec.tabs.map(t => `<span class="tag">${t}</span>`),
    rec.custom ? `<span class="tag custom-badge">new</span>` : "",
    rec.edited ? `<span class="tag custom-badge">edited</span>` : "",
  ].join("");
  const hs = rec.hsPage ? `<a class="hslink" href="${rec.hsPage}" target="_blank" rel="noopener">Human Sphere &#8599;</a>` : "";
  const paintedOptions = ["Unpainted", "Primed", "Work in progress", "Painted"]
    .map(o => `<option value="${o}" ${s.painted === o ? "selected" : ""}>${o}</option>`).join("");
  const removeBtn = rec.custom ? `<button type="button" class="remove-btn" data-action="remove">remove</button>` : "";
  return `
    <div class="model-row ${s.have ? "owned" : ""}" data-id="${rec.id}">
      <div class="thumb" data-action="zoom">${img}</div>
      <div class="row-body">
        <div class="model-name">${rec.sculpt || rec.unit}</div>
        ${rec.sculptId ? `<div class="unit-name">${rec.sculptId}</div>` : ""}
        ${rec.weapon ? `<div class="weapon">${rec.weapon}</div>` : ""}
        <div class="tags">${tags}</div>
        ${hs}
        ${rec.notes ? `<div class="notes">${rec.notes}</div>` : ""}
        <div class="owned-row">
          <label><input type="checkbox" data-action="have" ${s.have ? "checked" : ""}> Have</label>
          <label>Qty <input type="number" min="0" data-action="qty" value="${s.qty}"></label>
          <select data-action="painted">${paintedOptions}</select>
        </div>
        <div class="row-actions">
          <button type="button" class="edit-btn" data-action="edit">edit details</button>
          ${removeBtn}
        </div>
      </div>
    </div>`;
}

function renderUnitDetail(key) {
  const group = buildUnitGroups().get(key);
  if (!group) { location.hash = ""; return; }
  unitTitleEl.textContent = group.name;
  const sorted = group.models.slice().sort((a, b) => (a.sculpt || "").localeCompare(b.sculpt || ""));
  modelListEl.innerHTML = sorted.map(modelRowHtml).join("");
  updateUnitProgress(group);
  updateGlobalProgress();
}

const unitHeaderEl = document.querySelector(".unit-header");

function updateUnitProgress(group) {
  const total = group.models.length;
  const owned = group.models.filter(m => getRowState(m).have).length;
  const ava = unitAvaInfo(group);
  unitProgressEl.innerHTML = `${owned} / ${total} sculpts owned · ${ava.totalQty} minis total`
    + (showAva && ava.highestAva != null ? ` &nbsp;·&nbsp; <span class="ava-line ${ava.over ? "over" : ""}">AVA ${ava.highestAva}${ava.over ? ` — over by ${ava.overBy}` : ""}</span>` : "");
  unitHeaderEl.classList.toggle("over-ava", showAva && ava.over);
}

modelListEl.addEventListener("click", e => {
  const row = e.target.closest(".model-row");
  if (!row) return;
  const rec = DATA.find(r => r.id === row.dataset.id);
  const action = e.target.dataset.action || e.target.closest("[data-action]")?.dataset.action;
  if (action === "zoom") {
    openLightbox(rec);
  } else if (action === "have") {
    setRowState(rec, { have: e.target.checked });
    row.classList.toggle("owned", e.target.checked);
    const group = buildUnitGroups().get(currentDetailKey);
    if (group) updateUnitProgress(group);
    updateGlobalProgress();
  } else if (action === "remove") {
    if (!confirm(`Remove "${rec.unit} — ${rec.sculpt}" from your custom additions?`)) return;
    customEntries = customEntries.filter(r => r.id !== rec.id);
    saveCustom();
    rebuildData();
    refreshChips();
    route();
  } else if (action === "edit") {
    openEditModal(rec);
  }
});

modelListEl.addEventListener("change", e => {
  const row = e.target.closest(".model-row");
  if (!row) return;
  const rec = DATA.find(r => r.id === row.dataset.id);
  const action = e.target.dataset.action;
  if (action === "qty") {
    setRowState(rec, { qty: parseFloat(e.target.value) || 0 });
    const group = buildUnitGroups().get(currentDetailKey);
    if (group) updateUnitProgress(group);
    updateGlobalProgress();
  } else if (action === "painted") {
    setRowState(rec, { painted: e.target.value });
  }
});

function updateGlobalProgress() {
  const totalOwned = DATA.filter(r => getRowState(r).have).length;
  const totalMinis = DATA.reduce((sum, r) => sum + (getRowState(r).qty || 0), 0);
  const unitCount = buildUnitGroups().size;
  progressEl.innerHTML = `<b>${totalOwned}</b> / ${DATA.length} sculpts owned &nbsp;·&nbsp; <b>${totalMinis}</b> minis total &nbsp;·&nbsp; ${unitCount} units`;
}

// ---------- lightbox ----------
const lightbox = document.getElementById("lightbox");
const lbImg = document.getElementById("lbImg");
const lbCaption = document.getElementById("lbCaption");
document.getElementById("lbClose").addEventListener("click", closeLightbox);
lightbox.addEventListener("click", e => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeLightbox(); closeAddModal(); } });

function openLightbox(rec) {
  if (!rec.image) return;
  lbImg.src = rec.image;
  lbImg.alt = rec.unit;
  const src = rec.imageProvenance
    ? `<a href="${rec.imageProvenance}" target="_blank" rel="noopener">source photo &#8599;</a>`
    : "";
  lbCaption.innerHTML = `${rec.unit} — ${rec.sculpt || ""} ${src}`;
  lightbox.classList.remove("hidden");
}
function closeLightbox() {
  lightbox.classList.add("hidden");
  lbImg.src = "";
}

// ---------- export / import ----------
const LAST_EXPORT_KEY = "infinityMasterTrackerLastExport";
const NOTE_DISMISSED_KEY = "infinityMasterTrackerNoteDismissed";
const PAINTED_VALUES = ["Unpainted", "Primed", "Work in progress", "Painted"];

// Everything the user has set, including rows still sitting on catalog defaults.
function effectiveState() {
  const out = {};
  DATA.forEach(r => {
    const s = getRowState(r);
    if (state[r.id] || (s.qty || 0) > 0 || s.have || (s.painted && s.painted !== "Unpainted")) {
      out[r.id] = { have: !!s.have, qty: s.qty || 0, painted: s.painted || "Unpainted" };
    }
  });
  return out;
}

function downloadFile(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  localStorage.setItem(LAST_EXPORT_KEY, String(Date.now()));
  updateBackupNote();
}

function stamp() { return new Date().toISOString().slice(0, 10); }

document.getElementById("exportBtn").addEventListener("click", () => {
  const payload = { app: "infinity-master-tracker", version: 2, state: effectiveState(), custom: customEntries, overrides: fieldOverrides };
  downloadFile(`infinity-tracker-progress-${stamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
});

function csvCell(v) {
  const t = String(v == null ? "" : v);
  return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
}

document.getElementById("exportCsvBtn").addEventListener("click", () => {
  const rows = [["id", "unit", "sculpt", "factions", "qty", "painted"]];
  DATA.forEach(r => {
    const s = getRowState(r);
    rows.push([r.id, r.unit, r.sculpt || "", (r.tabs || []).join("; "), s.qty || 0, s.painted || "Unpainted"]);
  });
  // BOM so Excel opens the UTF-8 unit names correctly
  downloadFile(`infinity-tracker-${stamp()}.csv`, "\ufeff" + rows.map(r => r.map(csvCell).join(",")).join("\r\n"), "text/csv");
});

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", inQ = false;
  text = text.replace(/^\ufeff/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQ = false;
      else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some(x => x !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some(x => x !== "")) rows.push(row);
  return rows;
}

// Imported text is later rendered as HTML, so keep it inert.
function cleanStr(v, max) {
  return typeof v === "string" ? v.replace(/[<>]/g, "").slice(0, max || 500) : v;
}
function safeUrl(v) { return typeof v === "string" && /^https?:\/\//i.test(v) ? v : ""; }
function safeImage(v) { return typeof v === "string" && (/^images\/[\w.\-]+$/.test(v) || /^data:image\/(png|jpe?g|webp|gif);base64,/.test(v)) ? v : ""; }
function cleanRecord(rec) {
  const out = {};
  Object.keys(rec || {}).forEach(k => {
    const v = rec[k];
    if (k === "image") out[k] = safeImage(v);
    else if (k === "hsPage" || k === "imageProvenance") out[k] = safeUrl(v);
    else if (Array.isArray(v)) out[k] = v.map(x => cleanStr(x, 100));
    else out[k] = cleanStr(v, 2000);
  });
  return out;
}
function cleanState(st) {
  const out = {};
  Object.keys(st || {}).forEach(id => {
    const s = st[id] || {};
    const qty = Math.max(0, parseFloat(s.qty) || 0);
    out[String(id).slice(0, 200)] = {
      have: !!s.have || qty > 0,
      qty,
      painted: PAINTED_VALUES.includes(s.painted) ? s.painted : "Unpainted",
    };
  });
  return out;
}

function applyImport(nextState, nextCustom, nextOverrides) {
  state = nextState;
  if (nextCustom) customEntries = nextCustom;
  if (nextOverrides) fieldOverrides = nextOverrides;
  saveState(); saveCustom(); saveOverrides();
  rebuildData(); refreshChips(); route();
}

function importCsv(text) {
  const rows = parseCsv(text);
  const head = (rows.shift() || []).map(h => h.trim().toLowerCase());
  const iId = head.indexOf("id"), iQty = head.indexOf("qty"), iPainted = head.indexOf("painted");
  if (iId < 0 || iQty < 0) throw new Error("CSV needs at least 'id' and 'qty' columns");
  const known = new Set(DATA.map(r => r.id));
  const next = {};
  let matched = 0;
  rows.forEach(r => {
    const id = (r[iId] || "").trim();
    if (!known.has(id)) return;
    matched++;
    const qty = Math.max(0, parseFloat(r[iQty]) || 0);
    const painted = iPainted >= 0 ? (r[iPainted] || "").trim() : "";
    next[id] = { have: qty > 0, qty, painted: PAINTED_VALUES.includes(painted) ? painted : "Unpainted" };
  });
  if (!matched) throw new Error("No rows in that CSV matched this catalog");
  // CSV only carries ownership; keep custom models and edits as they are.
  applyImport(next, null, null);
  return matched;
}

document.getElementById("importInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = String(reader.result);
      if (/\.csv$/i.test(file.name) || !/^\s*[\[{]/.test(text)) {
        const n = importCsv(text);
        alert(`Imported ${n} rows from CSV.`);
      } else {
        const payload = JSON.parse(text);
        if (payload && (payload.state || payload.custom || payload.overrides)) {
          const custom = (payload.custom || []).map(cleanRecord).map(c => Object.assign(c, { custom: true }));
          const ov = {};
          Object.keys(payload.overrides || {}).forEach(id => { ov[id] = cleanRecord(payload.overrides[id]); });
          applyImport(cleanState(payload.state), custom, ov);
        } else {
          applyImport(cleanState(payload), null, null); // oldest export format: bare state map
        }
        alert("Progress imported.");
      }
    } catch (err) {
      alert("Could not read that file: " + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

// ---------- backup reminder ----------
const backupNote = document.getElementById("backupNote");
function updateBackupNote() {
  const last = parseInt(localStorage.getItem(LAST_EXPORT_KEY) || "0", 10);
  const when = last ? new Date(last).toLocaleDateString() : "never";
  document.getElementById("backupNoteText").textContent =
    `Your progress is saved in this browser only — clearing site data or switching browsers erases it. Use Export progress to keep a backup file. Last export: ${when}.`;
  const dismissedAt = parseInt(localStorage.getItem(NOTE_DISMISSED_KEY) || "0", 10);
  const stale = !last || Date.now() - last > 30 * 864e5;
  backupNote.classList.toggle("hidden", !stale || (dismissedAt && Date.now() - dismissedAt < 7 * 864e5));
}
document.getElementById("backupNoteClose").addEventListener("click", () => {
  localStorage.setItem(NOTE_DISMISSED_KEY, String(Date.now()));
  updateBackupNote();
});
updateBackupNote();

// ---------- add-model modal ----------
const addModal = document.getElementById("addModal");
const addForm = document.getElementById("addForm");
const fFactions = document.getElementById("f-factions");

function openAddModal() {
  fFactions.innerHTML = "";
  const group = currentDetailKey ? buildUnitGroups().get(currentDetailKey) : null;
  const preselect = group ? new Set(group.models.flatMap(m => m.tabs)) : new Set();
  factionList().forEach(f => {
    const label = document.createElement("label");
    label.style.flexDirection = "row";
    label.style.alignItems = "center";
    label.style.gap = "5px";
    label.innerHTML = `<input type="checkbox" value="${f}" ${preselect.has(f) ? "checked" : ""}> ${f}`;
    fFactions.appendChild(label);
  });
  addForm.reset();
  document.getElementById("f-unit").value = group ? group.name : "";
  fFactions.querySelectorAll("input[type=checkbox]").forEach((cb, i) => { cb.checked = preselect.has(factionList()[i]); });
  addModal.classList.remove("hidden");
}
function closeAddModal() {
  addModal.classList.add("hidden");
}
document.getElementById("addBtn").addEventListener("click", openAddModal);
document.getElementById("addCancel").addEventListener("click", closeAddModal);
addModal.addEventListener("click", e => { if (e.target === addModal) closeAddModal(); });

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

addForm.addEventListener("submit", e => {
  e.preventDefault();
  const unit = document.getElementById("f-unit").value.trim();
  if (!unit) return;
  const checkedFactions = [...fFactions.querySelectorAll("input:checked")].map(c => c.value);
  const otherFactions = document.getElementById("f-faction-other").value
    .split(",").map(s => s.trim()).filter(Boolean);
  const imageFile = document.getElementById("f-image").files[0];

  readImageAsDataUrl(imageFile).then(dataUrl => {
    const id = "custom-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const rec = {
      id,
      custom: true,
      unit,
      sculpt: document.getElementById("f-sculpt").value.trim(),
      sculptId: "",
      weapon: document.getElementById("f-weapon").value.trim(),
      tabs: Array.from(new Set([...checkedFactions, ...otherFactions])),
      status: document.getElementById("f-status").value,
      notes: document.getElementById("f-notes").value.trim(),
      hsPage: document.getElementById("f-hspage").value.trim(),
      imageProvenance: "",
      image: dataUrl,
      have: false,
      qty: 0,
      painted: "Unpainted",
    };
    customEntries.push(rec);
    saveCustom();
    rebuildData();
    refreshChips();
    closeAddModal();
    location.hash = "#unit/" + encodeURIComponent(unitKeyOf(rec));
    route();
  });
});

// ---------- edit-model modal ----------
const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editForm");
const eFactions = document.getElementById("e-factions");
let editingId = null;

function openEditModal(rec) {
  editingId = rec.id;
  eFactions.innerHTML = "";
  const currentTabs = new Set(rec.tabs);
  const knownFactions = factionList();
  knownFactions.forEach(f => {
    const label = document.createElement("label");
    label.style.flexDirection = "row";
    label.style.alignItems = "center";
    label.style.gap = "5px";
    label.innerHTML = `<input type="checkbox" value="${f}" ${currentTabs.has(f) ? "checked" : ""}> ${f}`;
    eFactions.appendChild(label);
  });
  const extraTabs = rec.tabs.filter(t => !knownFactions.includes(t));
  document.getElementById("e-unit").value = rec.unit || "";
  document.getElementById("e-sculpt").value = rec.sculpt || "";
  document.getElementById("e-weapon").value = rec.weapon || "";
  document.getElementById("e-faction-other").value = extraTabs.join(", ");
  document.getElementById("e-status").value = rec.status || "Current / released";
  document.getElementById("e-notes").value = rec.notes || "";
  document.getElementById("e-hspage").value = rec.hsPage || "";
  document.getElementById("e-image").value = "";
  editModal.classList.remove("hidden");
}
function closeEditModal() {
  editModal.classList.add("hidden");
  editingId = null;
}
document.getElementById("editCancel").addEventListener("click", closeEditModal);
editModal.addEventListener("click", e => { if (e.target === editModal) closeEditModal(); });

document.getElementById("editReset").addEventListener("click", () => {
  if (!editingId) return;
  if (!confirm("Discard your edits and restore this entry's original data?")) return;
  delete fieldOverrides[editingId];
  saveOverrides();
  rebuildData();
  refreshChips();
  closeEditModal();
  route();
});

editForm.addEventListener("submit", e => {
  e.preventDefault();
  if (!editingId) return;
  const unit = document.getElementById("e-unit").value.trim();
  if (!unit) return;
  const checkedFactions = [...eFactions.querySelectorAll("input:checked")].map(c => c.value);
  const otherFactions = document.getElementById("e-faction-other").value
    .split(",").map(s => s.trim()).filter(Boolean);
  const imageFile = document.getElementById("e-image").files[0];

  readImageAsDataUrl(imageFile).then(dataUrl => {
    const patch = {
      unit,
      sculpt: document.getElementById("e-sculpt").value.trim(),
      weapon: document.getElementById("e-weapon").value.trim(),
      tabs: Array.from(new Set([...checkedFactions, ...otherFactions])),
      status: document.getElementById("e-status").value,
      notes: document.getElementById("e-notes").value.trim(),
      hsPage: document.getElementById("e-hspage").value.trim(),
    };
    if (dataUrl) patch.image = dataUrl;
    fieldOverrides[editingId] = Object.assign({}, fieldOverrides[editingId], patch);
    saveOverrides();
    rebuildData();
    refreshChips();
    const newKey = unitKeyOf(patch);
    closeEditModal();
    location.hash = "#unit/" + encodeURIComponent(newKey);
    route();
  });
});

// ---------- AVA toggle ----------
const avaToggle = document.getElementById("avaToggle");
avaToggle.checked = showAva;
avaToggle.addEventListener("change", () => {
  showAva = avaToggle.checked;
  localStorage.setItem(SHOW_AVA_KEY, String(showAva));
  route();
});

// ---------- mercenary-guest toggle ----------
const mercToggle = document.getElementById("mercToggle");
mercToggle.checked = hideMercGuests;
mercToggle.addEventListener("change", () => {
  hideMercGuests = mercToggle.checked;
  localStorage.setItem(HIDE_MERC_KEY, String(hideMercGuests));
  renderUnitList();
});

refreshChips();
route();
