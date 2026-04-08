const FALLBACK_TABLES = [
  { id: "T1", offer: "10% off on all starters." },
  { id: "T2", offer: "Buy 2 mocktails, get 1 free." },
  { id: "T3", offer: "Free brownie above Rs. 1200 bill." },
  { id: "T4", offer: "Flat Rs. 100 off on family combo." }
];

const FALLBACK_MENU = [
  { id: "M1", name: "Paneer Tikka", price: 220, type: "Starter", prep: 12 },
  { id: "M2", name: "Crispy Corn", price: 180, type: "Starter", prep: 9 },
  { id: "M3", name: "Butter Naan", price: 45, type: "Bread", prep: 4 },
  { id: "M4", name: "Veg Biryani", price: 260, type: "Main", prep: 16 },
  { id: "M5", name: "Chicken Curry", price: 320, type: "Main", prep: 18 },
  { id: "M6", name: "Brownie Sundae", price: 160, type: "Dessert", prep: 6 }
];

const TABLES = Array.isArray(window.APP_DATA?.tables) && window.APP_DATA.tables.length
  ? window.APP_DATA.tables
  : FALLBACK_TABLES;

const MENU = Array.isArray(window.APP_DATA?.menu) && window.APP_DATA.menu.length
  ? window.APP_DATA.menu
  : FALLBACK_MENU;
const COMMON_OFFER_TEXT = typeof window.APP_DATA?.commonOfferText === "string" && window.APP_DATA.commonOfferText.trim()
  ? window.APP_DATA.commonOfferText.trim()
  : "Today's live offers apply for all tables.";

const STORAGE_KEYS = {
  orders: "kot_demo_orders_v1",
  paidBills: "kot_demo_paid_bills_v1"
};

const DEFAULT_ORDERS = [];

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

function saveStoredArray(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

const state = {
  currentTable: TABLES[0].id,
  cart: {},
  paidBills: loadStoredArray(STORAGE_KEYS.paidBills, []),
  orders: loadStoredArray(STORAGE_KEYS.orders, DEFAULT_ORDERS)
};

const tabButtons = document.querySelectorAll(".tab-btn");
const views = document.querySelectorAll(".view");
const tableQrStrip = document.getElementById("tableQrStrip");
const customerQuickLink = document.getElementById("customerQuickLink");
const topCustomerViewBtn = document.getElementById("topCustomerViewBtn");
const tableOffer = document.getElementById("tableOffer");
const menuGrid = document.getElementById("menuGrid");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const placeOrderBtn = document.getElementById("placeOrderBtn");
const orderToast = document.getElementById("orderToast");
const kotQueue = document.getElementById("kotQueue");
const activeTickets = document.getElementById("activeTickets");
const avgWait = document.getElementById("avgWait");
const nextReady = document.getElementById("nextReady");
const billingTable = document.getElementById("billingTable");
const billingDetails = document.getElementById("billingDetails");
const markPaidBtn = document.getElementById("markPaidBtn");
const paidBills = document.getElementById("paidBills");

function persistState() {
  saveStoredArray(STORAGE_KEYS.orders, state.orders);
  saveStoredArray(STORAGE_KEYS.paidBills, state.paidBills);
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.view;
    tabButtons.forEach((b) => b.classList.remove("active"));
    views.forEach((v) => v.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(view).classList.add("active");
  });
});

function money(value) {
  return `Rs. ${value}`;
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

function cartTotalValue() {
  return Object.entries(state.cart).reduce((sum, [itemId, qty]) => {
    const item = getMenuItem(itemId);
    return sum + item.price * qty;
  }, 0);
}

function getOrderSubtotal(order) {
  return order.items.reduce((sum, line) => {
    const item = getMenuItem(line.id);
    return sum + item.price * line.qty;
  }, 0);
}

function getOrderDiscount(order) {
  const discount = Number(order?.pricing?.discount);
  return Number.isFinite(discount) && discount > 0 ? discount : 0;
}

function getOrderAmount(order) {
  const total = Number(order?.pricing?.total);
  if (Number.isFinite(total) && total >= 0) {
    return total;
  }
  return Math.max(0, getOrderSubtotal(order) - getOrderDiscount(order));
}

function getOrderWaitMins(order) {
  const queueAhead = state.orders
    .filter((o) => o.status === "Queued" || o.status === "Preparing")
    .findIndex((o) => o.id === order.id);
  const prepWeight = Math.max(...order.items.map((i) => getMenuItem(i.id).prep), 6);
  return Math.max(4, prepWeight + Math.max(queueAhead, 0) * 3);
}

function getDailyOfferSet(dateObj) {
  const key = `${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
  const day = dateObj.getDay();

  const weekdayOffers = {
    0: "Sunday Family Combo: 2 mains + 2 mocktails + dessert platter at Rs. 999.",
    1: "Monday Light Meal: Any biryani + starter combo at 15% off.",
    2: "Tuesday Treat: Free brownie with every order above Rs. 800.",
    3: "Midweek Combo: Paneer Tikka + Veg Biryani at Rs. 429.",
    4: "Thursday Feast: Flat Rs. 120 off on family combos.",
    5: "Friday Party Offer: 3 mocktails for price of 2.",
    6: "Saturday Grill Combo: Starter + main + dessert at 18% off."
  };

  const specialDates = {
    "02-14": "Valentine's Day Special: Couple combo at Rs. 999.",
    "12-25": "Christmas Feast: Festive combo + dessert platter at 20% off.",
    "12-31": "New Year Eve Deal: Celebration combo with Rs. 250 off."
  };

  const offers = [weekdayOffers[day], "Happy Hour (4 PM - 7 PM): 20% off on mocktails."];
  if (specialDates[key]) {
    offers.unshift(specialDates[key]);
  }
  return offers;
}

function renderQrTables() {
  tableQrStrip.innerHTML = "";
  TABLES.forEach((table) => {
    const btn = document.createElement("button");
    btn.className = `qr-btn ${state.currentTable === table.id ? "active" : ""}`;
    btn.innerHTML = `
      <div>
        <strong>${table.id}</strong>
        <div class="tiny">QR linked menu</div>
      </div>
      <div class="qr-mock"></div>
    `;
    btn.addEventListener("click", () => {
      state.currentTable = table.id;
      renderQrTables();
      renderCustomerLink();
      renderOffer();
      renderBillingOptions();
      renderBillingDetails();
    });
    tableQrStrip.appendChild(btn);
  });
}

function renderCustomerLink() {
  if (topCustomerViewBtn) {
    topCustomerViewBtn.href = `customer.html?table=${state.currentTable}`;
    topCustomerViewBtn.textContent = `Open Customer View (${state.currentTable})`;
  }
  customerQuickLink.innerHTML = `
    <a class="link-btn" href="customer.html?table=${state.currentTable}" target="_blank" rel="noopener">
      Open Customer Phone View for ${state.currentTable}
    </a>
  `;
}

function renderOffer() {
  const selected = TABLES.find((t) => t.id === state.currentTable) || { id: state.currentTable };
  const today = new Date();
  const label = today.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short"
  });
  const dailyOffers = getDailyOfferSet(today);
  tableOffer.innerHTML = `
    <strong>${selected.id} Active</strong>
    <p>${COMMON_OFFER_TEXT}</p>
    <p class="tiny">Today's Campaign (${label})</p>
    <ul class="offer-mini-list">
      ${dailyOffers.map((offer) => `<li>${offer}</li>`).join("")}
    </ul>
    <p class="tiny">Estimated wait shown to customer after order dispatch.</p>
  `;
}

function renderMenu() {
  menuGrid.innerHTML = "";
  MENU.forEach((item) => {
    const qty = state.cart[item.id] || 0;
    const card = document.createElement("article");
    card.className = "menu-item";
    card.innerHTML = `
      <div class="menu-head">
        <p class="menu-name">${item.name}</p>
        <span class="price">${money(item.price)}</span>
      </div>
      <span class="tag">${item.type}</span>
      <span class="meta">${item.prep} min prep</span>
      <div class="qty-row">
        <button class="qty-btn minus">-</button>
        <strong>${qty}</strong>
        <button class="qty-btn plus">+</button>
      </div>
    `;
    card.querySelector(".plus").addEventListener("click", () => {
      state.cart[item.id] = (state.cart[item.id] || 0) + 1;
      renderMenu();
      renderCart();
    });
    card.querySelector(".minus").addEventListener("click", () => {
      if (!state.cart[item.id]) {
        return;
      }
      state.cart[item.id] -= 1;
      if (state.cart[item.id] <= 0) {
        delete state.cart[item.id];
      }
      renderMenu();
      renderCart();
    });
    menuGrid.appendChild(card);
  });
}

function renderCart() {
  const lines = Object.entries(state.cart);
  cartItems.innerHTML = "";
  if (!lines.length) {
    cartItems.innerHTML = `<p class="empty">No items yet. Add from menu to create order.</p>`;
  } else {
    lines.forEach(([itemId, qty]) => {
      const item = getMenuItem(itemId);
      const line = document.createElement("div");
      line.className = "cart-line";
      line.innerHTML = `
        <span>${item.name} x ${qty}</span>
        <strong>${money(item.price * qty)}</strong>
      `;
      cartItems.appendChild(line);
    });
  }
  cartTotal.textContent = money(cartTotalValue());
}

function nextKotId() {
  const max = state.orders.reduce((acc, order) => {
    const idNum = Number(order.id.split("-")[1]) || 1000;
    return Math.max(acc, idNum);
  }, 1000);
  return `KOT-${max + 1}`;
}

placeOrderBtn.addEventListener("click", () => {
  if (!Object.keys(state.cart).length) {
    orderToast.textContent = "Add at least one item before dispatching.";
    orderToast.style.color = "#b04f1f";
    return;
  }
  const newOrder = {
    id: nextKotId(),
    tableId: state.currentTable,
    status: "Queued",
    createdAt: Date.now(),
    items: Object.entries(state.cart).map(([id, qty]) => ({ id, qty }))
  };
  state.orders.push(newOrder);
  persistState();
  state.cart = {};
  renderMenu();
  renderCart();
  renderKotQueue();
  renderBillingOptions();
  renderBillingDetails();
  const wait = getOrderWaitMins(newOrder);
  orderToast.textContent = `Order ${newOrder.id} sent to KOT for ${newOrder.tableId}. ETA: ${wait} min.`;
  orderToast.style.color = "#1f8f55";
});

function cycleStatus(orderId) {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) {
    return;
  }
  if (order.status === "Queued") {
    order.status = "Preparing";
  } else if (order.status === "Preparing") {
    order.status = "Ready";
  } else {
    order.status = "Queued";
  }
  persistState();
  renderKotQueue();
  renderBillingDetails();
}

function renderKotQueue() {
  kotQueue.innerHTML = "";
  const active = state.orders.filter((o) => o.status === "Queued" || o.status === "Preparing");
  activeTickets.textContent = String(active.length);

  const waits = active.map((order) => getOrderWaitMins(order));
  const average = waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : 0;
  avgWait.textContent = `${average} min`;

  const next = state.orders.find((o) => o.status === "Preparing") || state.orders.find((o) => o.status === "Queued");
  nextReady.textContent = next ? `${next.tableId} (${next.id})` : "-";

  const sorted = state.orders
    .filter((o) => o.status !== "Paid")
    .sort((a, b) => a.createdAt - b.createdAt);
  if (!sorted.length) {
    kotQueue.innerHTML = `<p class="empty">No tickets yet.</p>`;
    return;
  }
  sorted.forEach((order) => {
    const el = document.createElement("article");
    el.className = `ticket ${order.status}`;
    const lines = order.items
      .map((line) => {
        const item = getMenuItem(line.id);
        return `${item.name} x${line.qty}`;
      })
      .join(", ");
    const offers = Array.isArray(order.appliedOffers) && order.appliedOffers.length
      ? order.appliedOffers.map((offer) => `${offer.title} x${offer.count}`).join(", ")
      : "";
    el.innerHTML = `
      <div class="ticket-head">
        <div>
          <strong>${order.id}</strong>
          <div class="tiny">Table ${order.tableId} | ETA ${getOrderWaitMins(order)} min</div>
        </div>
        <strong>${order.status}</strong>
      </div>
      <div class="ticket-items">${lines}</div>
      ${offers ? `<div class="tiny">Offers: ${offers}</div>` : ""}
      <button class="status-btn">Move Status</button>
    `;
    el.querySelector(".status-btn").addEventListener("click", () => cycleStatus(order.id));
    kotQueue.appendChild(el);
  });
}

function renderBillingOptions() {
  const tables = [...new Set(state.orders.map((o) => o.tableId).concat(TABLES.map((t) => t.id)))];
  billingTable.innerHTML = tables
    .map((tableId) => `<option value="${tableId}" ${tableId === state.currentTable ? "selected" : ""}>${tableId}</option>`)
    .join("");
}

billingTable.addEventListener("change", (e) => {
  state.currentTable = e.target.value;
  renderQrTables();
  renderCustomerLink();
  renderOffer();
  renderBillingDetails();
});

function tableRunningOrders(tableId) {
  return state.orders.filter((order) => order.tableId === tableId && order.status !== "Paid");
}

function calculateBillBreakdown(orders) {
  const merged = {};
  orders.forEach((order) => {
    order.items.forEach((line) => {
      merged[line.id] = (merged[line.id] || 0) + line.qty;
    });
  });

  const subtotal = Object.entries(merged).reduce((sum, [itemId, qty]) => {
    const item = getMenuItem(itemId);
    return sum + item.price * qty;
  }, 0);

  const rawDiscount = orders.reduce((sum, order) => sum + getOrderDiscount(order), 0);
  const discount = Math.min(subtotal, Math.max(0, rawDiscount));
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = Math.round(taxableAmount * 0.05);
  const total = taxableAmount + tax;

  return {
    merged,
    subtotal,
    discount,
    taxableAmount,
    tax,
    total
  };
}

function renderBillingDetails() {
  const tableId = billingTable.value || state.currentTable;
  const orders = tableRunningOrders(tableId);
  if (!orders.length) {
    billingDetails.innerHTML = `<p class="empty">No active orders for ${tableId}.</p>`;
    return;
  }

  const bill = calculateBillBreakdown(orders);

  billingDetails.innerHTML = `
    <p><strong>${tableId}</strong> | ${orders.length} ticket(s)</p>
    ${Object.entries(bill.merged)
      .map(([itemId, qty]) => {
        const item = getMenuItem(itemId);
        return `<div class="b-line"><span>${item.name} x ${qty}</span><span>${money(item.price * qty)}</span></div>`;
      })
      .join("")}
    <div class="b-line"><span>Subtotal</span><span>${money(bill.subtotal)}</span></div>
    ${bill.discount > 0 ? `<div class="b-line"><span>Offer Savings</span><span>-${money(bill.discount)}</span></div>` : ""}
    <div class="b-line"><span>GST (5%)</span><span>${money(bill.tax)}</span></div>
    <div class="total-line"><span>Final Amount</span><span>${money(bill.total)}</span></div>
  `;
}

markPaidBtn.addEventListener("click", () => {
  const tableId = billingTable.value || state.currentTable;
  const orders = tableRunningOrders(tableId);
  if (!orders.length) {
    return;
  }
  const bill = calculateBillBreakdown(orders);
  const amount = bill.total;
  state.paidBills.unshift({
    tableId,
    ticketCount: orders.length,
    amount,
    when: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  });
  orders.forEach((order) => {
    order.status = "Paid";
  });
  persistState();
  renderKotQueue();
  renderBillingDetails();
  renderPaidBills();
});

function renderPaidBills() {
  if (!state.paidBills.length) {
    paidBills.innerHTML = `<p class="empty">No paid bills yet.</p>`;
    return;
  }
  paidBills.innerHTML = state.paidBills
    .map(
      (bill) => `
      <div class="paid-item">
        <strong>${bill.tableId}</strong>
        <div class="tiny">${bill.ticketCount} ticket(s) settled at ${bill.when}</div>
        <div>${money(bill.amount)}</div>
      </div>
    `
    )
    .join("");
}

function init() {
  persistState();
  renderQrTables();
  renderCustomerLink();
  renderOffer();
  renderMenu();
  renderCart();
  renderKotQueue();
  renderBillingOptions();
  renderBillingDetails();
  renderPaidBills();
}

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEYS.orders && event.key !== STORAGE_KEYS.paidBills) {
    return;
  }
  state.orders = loadStoredArray(STORAGE_KEYS.orders, DEFAULT_ORDERS);
  state.paidBills = loadStoredArray(STORAGE_KEYS.paidBills, []);
  renderKotQueue();
  renderBillingOptions();
  renderBillingDetails();
  renderPaidBills();
});

init();
