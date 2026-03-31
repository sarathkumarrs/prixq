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

const SETTINGS_KEY = "kot_terminal_settings_v1";

const DEFAULT_ORDERS = [];
const DEFAULT_SETTINGS = {
  autoPrint: true,
  printMode: "browser"
};

const state = {
  orders: loadStoredArray(STORAGE_KEYS.orders, DEFAULT_ORDERS),
  printRegistry: loadStoredObject(STORAGE_KEYS.printRegistry, {}),
  settings: loadSettings(),
  serialPort: null,
  printing: false,
  knownOrderIds: new Set()
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
const printModeSelect = document.getElementById("printMode");
const connectPrinterBtn = document.getElementById("connectPrinterBtn");
const testPrintBtn = document.getElementById("testPrintBtn");
const printerStatus = document.getElementById("printerStatus");
const eventFeed = document.getElementById("eventFeed");

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
    printMode: stored.printMode === "serial" ? "serial" : "browser"
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

      let statusActions = "";
      if (status === "Queued") {
        statusActions = `
          <button class="mini-btn" type="button" data-next-status="Preparing" data-order-id="${order.id}">Start Prep</button>
          <button class="mini-btn" type="button" data-next-status="Ready" data-order-id="${order.id}">Mark Ready</button>
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

function renderAll() {
  updateSummary();
  renderStatusColumn("Queued", queuedList);
  renderStatusColumn("Preparing", preparingList);
  renderStatusColumn("Ready", readyList);
  updatePrinterPanel();
}

function setOrderStatus(orderId, nextStatus) {
  const latestOrders = loadStoredArray(STORAGE_KEYS.orders, DEFAULT_ORDERS);
  const target = latestOrders.find((order) => order.id === orderId);
  if (!target) {
    updateEventFeed(`Could not find ticket ${orderId}.`, "error");
    return;
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

function refreshOrders(announceNew) {
  const previousIds = state.knownOrderIds;
  state.orders = loadStoredArray(STORAGE_KEYS.orders, DEFAULT_ORDERS);
  state.printRegistry = loadStoredObject(STORAGE_KEYS.printRegistry, {});
  state.knownOrderIds = new Set(state.orders.map((order) => order.id));

  if (announceNew) {
    const newlyAdded = state.orders.filter((order) => !previousIds.has(order.id) && order.status !== "Paid");
    if (newlyAdded.length) {
      const first = newlyAdded[0].id;
      updateEventFeed(`${newlyAdded.length} new ticket(s) received. Latest: ${first}.`, "info");
    }
  }
}

function updatePrinterPanel() {
  autoPrintToggle.checked = state.settings.autoPrint;
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
  refreshOrders(true);
  renderAll();
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

  state.knownOrderIds = new Set(state.orders.map((order) => order.id));
  renderClock();
  renderAll();
  window.setInterval(renderClock, 1000);
  window.setInterval(() => {
    refreshOrders(false);
    renderAll();
    maybeAutoPrint();
  }, 2500);
  maybeAutoPrint();
}

init();
