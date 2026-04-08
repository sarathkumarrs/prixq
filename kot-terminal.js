const FALLBACK_MENU = [
  { id: "M1", name: "Paneer Tikka", price: 220, type: "Starter", prep: 12 },
  { id: "M2", name: "Crispy Corn", price: 180, type: "Starter", prep: 9 },
  { id: "M3", name: "Butter Naan", price: 45, type: "Bread", prep: 4 },
  { id: "M4", name: "Veg Biryani", price: 260, type: "Main", prep: 16 },
  { id: "M5", name: "Chicken Curry", price: 320, type: "Main", prep: 18 },
  { id: "M6", name: "Brownie Sundae", price: 160, type: "Dessert", prep: 6 }
];

const MENU = Array.isArray(window.APP_DATA?.menu) && window.APP_DATA.menu.length
  ? window.APP_DATA.menu
  : FALLBACK_MENU;

const BRAND = window.APP_DATA?.brand || {
  name: "Container Cafe",
  area: "Bypass Road",
  phone: ""
};

const STORAGE_KEYS = {
  orders: "kot_demo_orders_v1",
  printRegistry: "kot_demo_print_registry_v1"
};

const KOT_CONFIG = window.APP_DATA?.kot || {};
const SETTINGS_KEY = "kot_terminal_settings_v1";
const ORDER_ALERT_AUDIO_SRC = typeof KOT_CONFIG.orderAlertAudio === "string" && KOT_CONFIG.orderAlertAudio.trim()
  ? KOT_CONFIG.orderAlertAudio.trim()
  : "notification_tune.wav";
const QUEUE_ACK_TARGET_MINS = Number.isFinite(Number(KOT_CONFIG.queueAckTargetMins)) && Number(KOT_CONFIG.queueAckTargetMins) > 0
  ? Math.round(Number(KOT_CONFIG.queueAckTargetMins))
  : 2;

const DEFAULT_ORDERS = [];
const DEFAULT_SETTINGS = {
  autoPrint: KOT_CONFIG.autoPrintDefault !== false,
  printMode: "browser",
  soundAlerts: KOT_CONFIG.soundAlertsDefault !== false
};

const state = {
  orders: loadStoredArray(STORAGE_KEYS.orders, DEFAULT_ORDERS),
  printRegistry: loadStoredObject(STORAGE_KEYS.printRegistry, {}),
  settings: loadSettings(),
  serialPort: null,
  printing: false,
  knownOrderIds: new Set(),
  alertAudio: null
};

const queuedCount = document.getElementById("queuedCount");
const preparingCount = document.getElementById("preparingCount");
const readyCount = document.getElementById("readyCount");
const pendingPrintCount = document.getElementById("pendingPrintCount");
const liveClock = document.getElementById("liveClock");
const incomingBadge = document.getElementById("incomingBadge");
const preparingBadge = document.getElementById("preparingBadge");
const readyBadge = document.getElementById("readyBadge");
const queuedList = document.getElementById("queuedList");
const preparingList = document.getElementById("preparingList");
const readyList = document.getElementById("readyList");
const autoPrintToggle = document.getElementById("autoPrintToggle");
const soundAlertToggle = document.getElementById("soundAlertToggle");
const printModeSelect = document.getElementById("printMode");
const connectPrinterBtn = document.getElementById("connectPrinterBtn");
const testPrintBtn = document.getElementById("testPrintBtn");
const printerStatus = document.getElementById("printerStatus");
const eventFeed = document.getElementById("eventFeed");
const soloPrepPanel = document.getElementById("soloPrepPanel");
const soloPrepBadge = document.getElementById("soloPrepBadge");
const soloPrepOrder = document.getElementById("soloPrepOrder");
const soloPrepElapsed = document.getElementById("soloPrepElapsed");
const soloPrepTarget = document.getElementById("soloPrepTarget");
const soloPrepRemaining = document.getElementById("soloPrepRemaining");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadStoredArray(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return clone(fallback);
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : clone(fallback);
  } catch (error) {
    return clone(fallback);
  }
}

function loadStoredObject(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return clone(fallback);
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : clone(fallback);
  } catch (error) {
    return clone(fallback);
  }
}

function loadSettings() {
  const stored = loadStoredObject(SETTINGS_KEY, DEFAULT_SETTINGS);
  return {
    autoPrint: stored.autoPrint !== false,
    printMode: stored.printMode === "serial" ? "serial" : "browser",
    soundAlerts: stored.soundAlerts !== false
  };
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function persistOrders() {
  localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(state.orders));
}

function persistPrintRegistry() {
  localStorage.setItem(STORAGE_KEYS.printRegistry, JSON.stringify(state.printRegistry));
}

function updateEventFeed(message, type = "info") {
  eventFeed.textContent = message;
  if (type === "error") {
    eventFeed.style.color = "#9f2b1f";
    eventFeed.style.borderLeftColor = "#d7604d";
    return;
  }
  if (type === "success") {
    eventFeed.style.color = "#1d6e41";
    eventFeed.style.borderLeftColor = "#4ba977";
    return;
  }
  eventFeed.style.color = "#87441e";
  eventFeed.style.borderLeftColor = "#f06f2d";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getMenuItem(id) {
  return MENU.find((item) => item.id === id) || {
    id,
    name: `Unknown Item (${id})`,
    price: 0,
    type: "Unknown",
    prep: 8
  };
}

function formatTime(timeValue) {
  const parsed = Number(timeValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "-";
  }
  return new Date(parsed).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function formatAge(createdAt) {
  const elapsed = Math.max(0, Date.now() - Number(createdAt || 0));
  const mins = Math.floor(elapsed / 60000);
  if (mins < 1) {
    return "just now";
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  return `${hours}h ${remaining}m ago`;
}

function listActiveOrders() {
  return state.orders
    .filter((order) => order.status !== "Paid")
    .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
}

function normalizeOrderTimers(order) {
  if (!order || typeof order !== "object") {
    return false;
  }
  let changed = false;
  const now = Date.now();
  if (!Number.isFinite(Number(order.createdAt))) {
    order.createdAt = now;
    changed = true;
  }
  if (!Number.isFinite(Number(order.queuedAt))) {
    order.queuedAt = Number(order.createdAt);
    changed = true;
  }
  if (order.status === "Preparing" && !Number.isFinite(Number(order.prepStartedAt))) {
    order.prepStartedAt = Number(order.createdAt);
    changed = true;
  }
  return changed;
}

function normalizeAllOrders(orders) {
  let changed = false;
  orders.forEach((order) => {
    changed = normalizeOrderTimers(order) || changed;
  });
  return changed;
}

function prepTargetMinutes(order) {
  const prepWeights = Array.isArray(order?.items)
    ? order.items.map((line) => {
      const item = getMenuItem(line.id);
      return Number(item.prep) || 0;
    })
    : [];
  return Math.max(4, ...prepWeights, 8);
}

function prepTimerMeta(order, now = Date.now()) {
  if (!order || order.status !== "Preparing") {
    return null;
  }
  const startAt = Number(order.prepStartedAt) || Number(order.createdAt) || now;
  const targetMs = prepTargetMinutes(order) * 60000;
  const elapsedMs = Math.max(0, now - startAt);
  const remainingMs = targetMs - elapsedMs;
  const overdue = remainingMs < 0;
  const clockValue = formatDurationMs(overdue ? Math.abs(remainingMs) : remainingMs);
  const label = overdue
    ? `Prep timer: +${clockValue} overdue`
    : `Prep timer: ${clockValue} left`;

  return {
    overdue,
    label,
    elapsedMs,
    remainingMs,
    targetMins: prepTargetMinutes(order)
  };
}

function queueTimerMeta(order, now = Date.now()) {
  if (!order || order.status !== "Queued") {
    return null;
  }
  const queuedAt = Number(order.queuedAt) || Number(order.createdAt) || now;
  const elapsedMs = Math.max(0, now - queuedAt);
  const targetMs = QUEUE_ACK_TARGET_MINS * 60000;
  const remainingMs = targetMs - elapsedMs;
  const overdue = remainingMs < 0;
  const clockValue = formatDurationMs(overdue ? Math.abs(remainingMs) : remainingMs);

  return {
    overdue,
    elapsedMs,
    remainingMs,
    targetMins: QUEUE_ACK_TARGET_MINS,
    label: overdue
      ? `Queue wait: +${clockValue} over acknowledge target`
      : `Queue wait: ${clockValue} to acknowledge`
  };
}

function formatDurationMs(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function isPrinted(orderId) {
  const row = state.printRegistry[orderId];
  return Boolean(row && Number(row.count) > 0);
}

function printMeta(orderId) {
  const row = state.printRegistry[orderId];
  if (!row || Number(row.count) <= 0) {
    return "Not printed";
  }
  const count = Number(row.count) || 0;
  const at = formatTime(row.lastPrintedAt);
  return `${count} print(s) at ${at}`;
}

function offersLabel(order) {
  if (!Array.isArray(order.appliedOffers) || !order.appliedOffers.length) {
    return "";
  }
  return order.appliedOffers
    .map((offer) => `${offer.title} x${offer.count}`)
    .join(", ");
}

function renderClock() {
  liveClock.textContent = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function updateSummary() {
  const active = listActiveOrders();
  const queued = active.filter((order) => order.status === "Queued");
  const preparing = active.filter((order) => order.status === "Preparing");
  const ready = active.filter((order) => order.status === "Ready");
  const pending = active.filter((order) => !isPrinted(order.id));

  queuedCount.textContent = String(queued.length);
  preparingCount.textContent = String(preparing.length);
  readyCount.textContent = String(ready.length);
  pendingPrintCount.textContent = String(pending.length);

  incomingBadge.textContent = String(queued.length);
  preparingBadge.textContent = String(preparing.length);
  readyBadge.textContent = String(ready.length);
}

function renderStatusColumn(status, holder) {
  const now = Date.now();
  const tickets = listActiveOrders().filter((order) => order.status === status);
  if (!tickets.length) {
    holder.innerHTML = `<p class="empty">No ${status.toLowerCase()} tickets.</p>`;
    return;
  }

  holder.innerHTML = tickets
    .map((order) => {
      const itemLines = order.items
        .map((line) => {
          const item = getMenuItem(line.id);
          return `<li>${escapeHtml(item.name)} x${line.qty}</li>`;
        })
        .join("");

      const printLabel = isPrinted(order.id) ? "Reprint" : "Print";
      const source = order.source ? `Source: ${escapeHtml(order.source)}` : "Source: customer";
      const offerLine = offersLabel(order);
      const prepMeta = prepTimerMeta(order, now);
      const queueMeta = queueTimerMeta(order, now);

      let statusActions = "";
      if (status === "Queued") {
        statusActions = `
          <button class="mini-btn" type="button" data-next-status="Preparing" data-order-id="${order.id}" title="Move this ticket to Preparing">Start Prep</button>
        `;
      } else if (status === "Preparing") {
        statusActions = `
          <button class="mini-btn" type="button" data-next-status="Queued" data-order-id="${order.id}">Back Queue</button>
          <button class="mini-btn" type="button" data-next-status="Ready" data-order-id="${order.id}">Mark Ready</button>
        `;
      } else {
        statusActions = `
          <button class="mini-btn" type="button" data-next-status="Preparing" data-order-id="${order.id}">Back Prep</button>
          <button class="mini-btn paid" type="button" data-next-status="Paid" data-order-id="${order.id}">Mark Paid</button>
        `;
      }

      return `
        <article class="ticket" data-status="${status}">
          <div class="ticket-head">
            <strong class="order-id">${escapeHtml(order.id)} | Table ${escapeHtml(order.tableId)}</strong>
            <span class="order-meta">${formatAge(order.createdAt)}</span>
          </div>
          <ul class="item-lines">${itemLines}</ul>
          ${queueMeta ? `<div class="queue-line ${queueMeta.overdue ? "overdue" : ""}" data-queue-timer="${order.id}">${queueMeta.label}</div>` : ""}
          ${prepMeta ? `<div class="prep-line ${prepMeta.overdue ? "overdue" : ""}" data-prep-timer="${order.id}">${prepMeta.label}</div>` : ""}
          <div class="order-meta">${source}</div>
          ${offerLine ? `<div class="offer-line">Offers: ${escapeHtml(offerLine)}</div>` : ""}
          <div class="print-line">${printMeta(order.id)}</div>
          <div class="actions">
            ${statusActions}
            <button class="mini-btn print" type="button" data-print-order="${order.id}">${printLabel}</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSoloPrepPanel() {
  const active = listActiveOrders();
  if (active.length !== 1) {
    soloPrepPanel.classList.add("hidden");
    return;
  }

  const order = active[0];
  const now = Date.now();
  const prepMeta = prepTimerMeta(order, now);
  const queueMeta = queueTimerMeta(order, now);
  if (!prepMeta && !queueMeta) {
    soloPrepPanel.classList.add("hidden");
    return;
  }

  const meta = prepMeta || queueMeta;
  const isPrep = Boolean(prepMeta);
  soloPrepPanel.classList.remove("hidden");
  soloPrepPanel.classList.toggle("overdue", meta.overdue);
  soloPrepPanel.classList.toggle("ontrack", !meta.overdue);
  soloPrepOrder.textContent = `${order.id} | Table ${order.tableId}`;
  soloPrepElapsed.textContent = formatDurationMs(meta.elapsedMs);
  soloPrepTarget.textContent = `${meta.targetMins} min`;
  soloPrepRemaining.textContent = meta.overdue
    ? `+${formatDurationMs(Math.abs(meta.remainingMs))}`
    : formatDurationMs(meta.remainingMs);
  if (meta.overdue) {
    soloPrepBadge.textContent = isPrep
      ? "Prep overdue - expedite now"
      : "Queue overdue - start prep now";
  } else {
    soloPrepBadge.textContent = isPrep
      ? "Single active order (Preparing)"
      : "Single active order (Queued)";
  }
}

function updateVisiblePrepTimers() {
  const now = Date.now();
  document.querySelectorAll("[data-queue-timer]").forEach((node) => {
    const orderId = node.getAttribute("data-queue-timer");
    const order = state.orders.find((entry) => entry.id === orderId);
    const meta = queueTimerMeta(order, now);
    if (!meta) {
      return;
    }
    node.textContent = meta.label;
    node.classList.toggle("overdue", meta.overdue);
  });
  document.querySelectorAll("[data-prep-timer]").forEach((node) => {
    const orderId = node.getAttribute("data-prep-timer");
    const order = state.orders.find((entry) => entry.id === orderId);
    const meta = prepTimerMeta(order, now);
    if (!meta) {
      return;
    }
    node.textContent = meta.label;
    node.classList.toggle("overdue", meta.overdue);
  });
  renderSoloPrepPanel();
}

function renderAll() {
  updateSummary();
  renderStatusColumn("Queued", queuedList);
  renderStatusColumn("Preparing", preparingList);
  renderStatusColumn("Ready", readyList);
  renderSoloPrepPanel();
  updatePrinterPanel();
}

function setOrderStatus(orderId, nextStatus) {
  const latestOrders = loadStoredArray(STORAGE_KEYS.orders, DEFAULT_ORDERS);
  normalizeAllOrders(latestOrders);
  const target = latestOrders.find((order) => order.id === orderId);
  if (!target) {
    updateEventFeed(`Could not find ticket ${orderId}.`, "error");
    return;
  }
  const now = Date.now();
  if (!Number.isFinite(Number(target.queuedAt))) {
    target.queuedAt = Number(target.createdAt) || now;
  }

  if (nextStatus === "Queued") {
    target.queuedAt = now;
    target.prepStartedAt = null;
    target.readyAt = null;
  } else if (nextStatus === "Preparing") {
    target.prepStartedAt = now;
    target.readyAt = null;
  } else if (nextStatus === "Ready") {
    if (!Number.isFinite(Number(target.prepStartedAt))) {
      target.prepStartedAt = now;
    }
    target.readyAt = now;
  } else if (nextStatus === "Paid") {
    if (!Number.isFinite(Number(target.readyAt))) {
      target.readyAt = now;
    }
  }

  target.status = nextStatus;
  state.orders = latestOrders;
  persistOrders();
  renderAll();
  updateEventFeed(`Updated ${orderId} -> ${nextStatus}.`, "success");
}

function markPrinted(orderId) {
  const existing = state.printRegistry[orderId] || { count: 0, lastPrintedAt: 0 };
  state.printRegistry[orderId] = {
    count: Number(existing.count || 0) + 1,
    lastPrintedAt: Date.now()
  };
  persistPrintRegistry();
}

function buildTicketText(order, isTest = false) {
  const lines = [];
  const divider = "--------------------------------";
  lines.push(BRAND.name || "KOT Terminal");
  if (BRAND.area) {
    lines.push(BRAND.area);
  }
  if (BRAND.phone) {
    lines.push(BRAND.phone);
  }
  lines.push(divider);
  if (isTest) {
    lines.push("TEST PRINT");
    lines.push(formatTime(Date.now()));
    lines.push(divider);
    lines.push("Printer check successful.");
    lines.push("");
    lines.push("");
    return lines.join("\n");
  }

  lines.push(`KOT: ${order.id}`);
  lines.push(`Table: ${order.tableId}`);
  lines.push(`Time: ${formatTime(order.createdAt)}`);
  lines.push(divider);
  order.items.forEach((line) => {
    const item = getMenuItem(line.id);
    lines.push(`${line.qty} x ${item.name}`);
  });
  const offerLine = offersLabel(order);
  if (offerLine) {
    lines.push(divider);
    lines.push(`Offers: ${offerLine}`);
  }
  lines.push(divider);
  lines.push("Kitchen copy");
  lines.push("");
  lines.push("");
  lines.push("");
  return lines.join("\n");
}

function buildTicketHtml(order, isTest = false) {
  const heading = isTest ? "TEST PRINT" : "KITCHEN ORDER TICKET";
  const detailRows = isTest
    ? `<div class="line">Time: ${escapeHtml(formatTime(Date.now()))}</div>`
    : `
      <div class="line">KOT: ${escapeHtml(order.id)}</div>
      <div class="line">Table: ${escapeHtml(order.tableId)}</div>
      <div class="line">Created: ${escapeHtml(formatTime(order.createdAt))}</div>
    `;
  const items = isTest
    ? "<li>Printer diagnostics ticket</li>"
    : order.items
      .map((line) => {
        const item = getMenuItem(line.id);
        return `<li>${line.qty} x ${escapeHtml(item.name)}</li>`;
      })
      .join("");
  const offerLine = !isTest && offersLabel(order)
    ? `<p class="offers">Offers: ${escapeHtml(offersLabel(order))}</p>`
    : "";

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>KOT Print</title>
        <style>
          @page { size: 58mm auto; margin: 2mm; }
          body {
            margin: 0;
            font-family: "Courier New", monospace;
            font-size: 12px;
            color: #000;
          }
          .ticket {
            width: 54mm;
            padding: 2mm;
          }
          .brand { font-weight: 700; text-align: center; margin-bottom: 2px; }
          .head { text-align: center; margin-bottom: 4px; }
          .line { margin-bottom: 2px; }
          ul { margin: 4px 0 0; padding-left: 14px; }
          li { margin-bottom: 2px; }
          .offers { margin-top: 4px; }
          .divider {
            border-top: 1px dashed #000;
            margin: 4px 0;
            height: 0;
          }
        </style>
      </head>
      <body>
        <section class="ticket">
          <div class="brand">${escapeHtml(BRAND.name || "KOT Terminal")}</div>
          <div class="head">${heading}</div>
          ${detailRows}
          <div class="divider"></div>
          <ul>${items}</ul>
          ${offerLine}
          <div class="divider"></div>
          <div>Kitchen copy</div>
        </section>
      </body>
    </html>
  `;
}

function printHtmlDocument(html) {
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";

    const cleanup = () => {
      window.setTimeout(() => {
        frame.remove();
      }, 500);
    };

    frame.onload = () => {
      try {
        const frameWindow = frame.contentWindow;
        if (!frameWindow) {
          cleanup();
          reject(new Error("Print frame unavailable."));
          return;
        }
        frameWindow.focus();
        frameWindow.print();
        cleanup();
        resolve();
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}

async function connectSerialPrinter() {
  if (!("serial" in navigator)) {
    updateEventFeed("Web Serial is not supported in this browser.", "error");
    return false;
  }
  try {
    state.serialPort = await navigator.serial.requestPort();
    await state.serialPort.open({
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
      flowControl: "none"
    });
    updateEventFeed("Serial printer connected.", "success");
    renderAll();
    return true;
  } catch (error) {
    updateEventFeed(`Printer connection failed: ${error.message}`, "error");
    return false;
  }
}

async function disconnectSerialPrinter() {
  if (!state.serialPort) {
    return;
  }
  try {
    await state.serialPort.close();
  } catch (error) {
    updateEventFeed(`Could not close serial printer: ${error.message}`, "error");
  }
  state.serialPort = null;
  renderAll();
}

async function writeSerialTicket(text) {
  if (!state.serialPort?.writable) {
    throw new Error("Serial printer is not connected.");
  }
  const writer = state.serialPort.writable.getWriter();
  try {
    const encoder = new TextEncoder();
    await writer.write(encoder.encode(text));
    await writer.write(new Uint8Array([0x1b, 0x64, 0x04]));
    await writer.write(new Uint8Array([0x1d, 0x56, 0x41, 0x10]));
  } finally {
    writer.releaseLock();
  }
}

async function printTicket(order, options = {}) {
  const isTest = options.isTest === true;
  if (state.printing) {
    return;
  }
  state.printing = true;
  connectPrinterBtn.disabled = true;
  testPrintBtn.disabled = true;

  try {
    if (state.settings.printMode === "serial") {
      if (!state.serialPort) {
        if (!options.allowConnect) {
          throw new Error("Connect the serial printer first.");
        }
        const connected = await connectSerialPrinter();
        if (!connected) {
          throw new Error("Serial printer not available.");
        }
      }
      await writeSerialTicket(buildTicketText(order, isTest));
    } else {
      await printHtmlDocument(buildTicketHtml(order, isTest));
    }

    if (!isTest && order?.id) {
      markPrinted(order.id);
      updateEventFeed(`Printed ${order.id}.`, "success");
    } else {
      updateEventFeed("Printer test dispatched.", "success");
    }
  } catch (error) {
    updateEventFeed(`Print failed: ${error.message}`, "error");
  } finally {
    state.printing = false;
    connectPrinterBtn.disabled = false;
    testPrintBtn.disabled = false;
    renderAll();
    window.setTimeout(() => {
      maybeAutoPrint();
    }, 120);
  }
}

function getNextUnprintedOrder() {
  return listActiveOrders().find((order) => !isPrinted(order.id)) || null;
}

function maybeAutoPrint() {
  if (!state.settings.autoPrint || state.printing) {
    return;
  }
  if (state.settings.printMode === "serial" && !state.serialPort) {
    return;
  }
  const next = getNextUnprintedOrder();
  if (!next) {
    return;
  }
  printTicket(next, { allowConnect: false });
}

function refreshOrders() {
  const previousIds = state.knownOrderIds;
  state.orders = loadStoredArray(STORAGE_KEYS.orders, DEFAULT_ORDERS);
  const changed = normalizeAllOrders(state.orders);
  if (changed) {
    persistOrders();
  }
  state.printRegistry = loadStoredObject(STORAGE_KEYS.printRegistry, {});
  state.knownOrderIds = new Set(state.orders.map((order) => order.id));
  return state.orders.filter((order) => !previousIds.has(order.id) && order.status !== "Paid");
}

function updatePrinterPanel() {
  autoPrintToggle.checked = state.settings.autoPrint;
  soundAlertToggle.checked = state.settings.soundAlerts;
  printModeSelect.value = state.settings.printMode;

  if (state.settings.printMode === "serial") {
    const connected = Boolean(state.serialPort?.writable);
    printerStatus.textContent = connected
      ? "Web Serial printer connected. ESC/POS output is active."
      : "Web Serial mode selected. Connect a printer for direct ESC/POS output.";
    connectPrinterBtn.textContent = connected ? "Disconnect Printer" : "Connect Printer";
  } else {
    printerStatus.textContent = "Browser print mode. Set thermal printer as system default for fast operation.";
    connectPrinterBtn.textContent = "Printer Setup";
  }
}

function ensureAlertAudio() {
  if (state.alertAudio) {
    return state.alertAudio;
  }
  try {
    const audio = new Audio(ORDER_ALERT_AUDIO_SRC);
    audio.preload = "auto";
    state.alertAudio = audio;
    return audio;
  } catch (error) {
    return null;
  }
}

function playAlertPattern(beepCount = 1) {
  if (!state.settings.soundAlerts) {
    return;
  }
  const baseAudio = ensureAlertAudio();
  if (!baseAudio) {
    updateEventFeed("New ticket received, but alert audio file could not be loaded.", "error");
    return;
  }

  const count = Math.min(3, Math.max(1, Number(beepCount) || 1));
  for (let index = 0; index < count; index += 1) {
    const clip = baseAudio.cloneNode(true);
    clip.volume = 1;
    window.setTimeout(() => {
      clip.play().catch(() => {
        updateEventFeed("New ticket received. Tap once to enable sound alerts.", "info");
      });
    }, index * 500);
  }
}

function handleNewOrders(newOrders) {
  if (!Array.isArray(newOrders) || !newOrders.length) {
    return;
  }
  const latest = newOrders[newOrders.length - 1];
  updateEventFeed(`${newOrders.length} new ticket(s) received. Latest: ${latest.id}.`, "info");
  playAlertPattern(newOrders.length);
}

function handleModeChange() {
  const nextMode = printModeSelect.value === "serial" ? "serial" : "browser";
  if (nextMode === "serial" && !("serial" in navigator)) {
    printModeSelect.value = "browser";
    state.settings.printMode = "browser";
    saveSettings();
    renderAll();
    updateEventFeed("Web Serial is unavailable in this browser. Using Browser Print.", "error");
    return;
  }

  state.settings.printMode = nextMode;
  saveSettings();
  renderAll();
  if (nextMode === "browser") {
    disconnectSerialPrinter();
  }
}

queuedList.addEventListener("click", (event) => {
  const statusButton = event.target.closest("[data-next-status]");
  if (statusButton) {
    setOrderStatus(statusButton.dataset.orderId, statusButton.dataset.nextStatus);
    return;
  }
  const printButton = event.target.closest("[data-print-order]");
  if (printButton) {
    const order = state.orders.find((row) => row.id === printButton.dataset.printOrder);
    if (!order) {
      return;
    }
    printTicket(order, { allowConnect: true });
  }
});

preparingList.addEventListener("click", (event) => {
  const statusButton = event.target.closest("[data-next-status]");
  if (statusButton) {
    setOrderStatus(statusButton.dataset.orderId, statusButton.dataset.nextStatus);
    return;
  }
  const printButton = event.target.closest("[data-print-order]");
  if (printButton) {
    const order = state.orders.find((row) => row.id === printButton.dataset.printOrder);
    if (!order) {
      return;
    }
    printTicket(order, { allowConnect: true });
  }
});

readyList.addEventListener("click", (event) => {
  const statusButton = event.target.closest("[data-next-status]");
  if (statusButton) {
    setOrderStatus(statusButton.dataset.orderId, statusButton.dataset.nextStatus);
    return;
  }
  const printButton = event.target.closest("[data-print-order]");
  if (printButton) {
    const order = state.orders.find((row) => row.id === printButton.dataset.printOrder);
    if (!order) {
      return;
    }
    printTicket(order, { allowConnect: true });
  }
});

autoPrintToggle.addEventListener("change", () => {
  state.settings.autoPrint = autoPrintToggle.checked;
  saveSettings();
  renderAll();
  if (state.settings.autoPrint) {
    updateEventFeed("Auto print enabled.", "success");
    maybeAutoPrint();
  } else {
    updateEventFeed("Auto print paused.", "info");
  }
});

soundAlertToggle.addEventListener("change", () => {
  state.settings.soundAlerts = soundAlertToggle.checked;
  saveSettings();
  renderAll();
  if (state.settings.soundAlerts) {
    const audio = ensureAlertAudio();
    if (audio) {
      audio.load();
    }
    updateEventFeed("Sound alerts enabled.", "success");
  } else {
    updateEventFeed("Sound alerts muted.", "info");
  }
});

printModeSelect.addEventListener("change", handleModeChange);

connectPrinterBtn.addEventListener("click", async () => {
  if (state.settings.printMode === "browser") {
    updateEventFeed("Browser print mode uses your system default printer.", "info");
    return;
  }

  if (state.serialPort) {
    await disconnectSerialPrinter();
    updateEventFeed("Serial printer disconnected.", "info");
    return;
  }
  await connectSerialPrinter();
});

testPrintBtn.addEventListener("click", () => {
  printTicket(null, { isTest: true, allowConnect: true });
});

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEYS.orders && event.key !== STORAGE_KEYS.printRegistry) {
    return;
  }
  const newOrders = refreshOrders();
  renderAll();
  handleNewOrders(newOrders);
  maybeAutoPrint();
});

function init() {
  if (!("serial" in navigator)) {
    const serialOption = printModeSelect.querySelector('option[value="serial"]');
    if (serialOption) {
      serialOption.disabled = true;
    }
    if (state.settings.printMode === "serial") {
      state.settings.printMode = "browser";
      saveSettings();
    }
  }

  if (normalizeAllOrders(state.orders)) {
    persistOrders();
  }
  state.knownOrderIds = new Set(state.orders.map((order) => order.id));
  ensureAlertAudio();
  renderClock();
  renderAll();
  window.setInterval(() => {
    renderClock();
    updateVisiblePrepTimers();
  }, 1000);
  window.setInterval(() => {
    const newOrders = refreshOrders();
    renderAll();
    handleNewOrders(newOrders);
    maybeAutoPrint();
  }, 2500);
  maybeAutoPrint();
}

init();
