const TABLES = [
  { id: "T1", offer: "10% off on all starters." },
  { id: "T2", offer: "Buy 2 mocktails, get 1 free." },
  { id: "T3", offer: "Free brownie above Rs. 1200 bill." },
  { id: "T4", offer: "Flat Rs. 100 off on family combo." }
];

const MENU = [
  { id: "M1", name: "Paneer Tikka", price: 220, type: "Starter", prep: 12 },
  { id: "M2", name: "Crispy Corn", price: 180, type: "Starter", prep: 9 },
  { id: "M3", name: "Butter Naan", price: 45, type: "Bread", prep: 4 },
  { id: "M4", name: "Veg Biryani", price: 260, type: "Main", prep: 16 },
  { id: "M5", name: "Chicken Curry", price: 320, type: "Main", prep: 18 },
  { id: "M6", name: "Brownie Sundae", price: 160, type: "Dessert", prep: 6 }
];

const STORAGE_KEYS = {
  orders: "kot_demo_orders_v1"
};

const DEFAULT_ORDERS = [
  {
    id: "KOT-1001",
    tableId: "T2",
    status: "Preparing",
    createdAt: Date.now() - 7 * 60 * 1000,
    items: [
      { id: "M1", qty: 1 },
      { id: "M4", qty: 1 }
    ]
  },
  {
    id: "KOT-1002",
    tableId: "T3",
    status: "Queued",
    createdAt: Date.now() - 2 * 60 * 1000,
    items: [
      { id: "M5", qty: 1 },
      { id: "M3", qty: 3 }
    ]
  }
];

const tableTitle = document.getElementById("tableTitle");
const offerText = document.getElementById("offerText");
const offerDateLabel = document.getElementById("offerDateLabel");
const dailyOffers = document.getElementById("dailyOffers");
const tableSelect = document.getElementById("tableSelect");
const menuList = document.getElementById("menuList");
const ticketList = document.getElementById("ticketList");
const activeOrderCount = document.getElementById("activeOrderCount");
const cartLines = document.getElementById("cartLines");
const cartTotal = document.getElementById("cartTotal");
const placeBtn = document.getElementById("placeBtn");
const toast = document.getElementById("toast");

const urlTable = new URLSearchParams(window.location.search).get("table");
const urlDate = new URLSearchParams(window.location.search).get("date");
const validTable = TABLES.find((table) => table.id === urlTable)?.id;

function resolveDemoDate(input) {
  if (!input) {
    return new Date();
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return new Date();
  }
  const parsed = new Date(`${input}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

const state = {
  tableId: validTable || TABLES[0].id,
  demoDate: resolveDemoDate(urlDate),
  cart: {},
  orders: loadOrders()
};

function loadOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.orders);
    if (!raw) {
      return JSON.parse(JSON.stringify(DEFAULT_ORDERS));
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : JSON.parse(JSON.stringify(DEFAULT_ORDERS));
  } catch (error) {
    return JSON.parse(JSON.stringify(DEFAULT_ORDERS));
  }
}

function saveOrders() {
  localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(state.orders));
}

function money(value) {
  return `Rs. ${value}`;
}

function getMenuItem(id) {
  return MENU.find((item) => item.id === id);
}

function cartTotalValue() {
  return Object.entries(state.cart).reduce((sum, [itemId, qty]) => {
    const item = getMenuItem(itemId);
    return sum + item.price * qty;
  }, 0);
}

function nextKotId() {
  const max = state.orders.reduce((acc, order) => {
    const idNum = Number(order.id.split("-")[1]) || 1000;
    return Math.max(acc, idNum);
  }, 1000);
  return `KOT-${max + 1}`;
}

function getOrderWaitMins(order) {
  const queueAhead = state.orders
    .filter((o) => o.status === "Queued" || o.status === "Preparing")
    .findIndex((o) => o.id === order.id);
  const prepWeight = Math.max(...order.items.map((i) => getMenuItem(i.id).prep), 6);
  return Math.max(4, prepWeight + Math.max(queueAhead, 0) * 3);
}

function getTodayOffers(dateObj, tableId) {
  const key = `${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
  const day = dateObj.getDay();

  const weekdayOffers = {
    0: { title: "Sunday Family Combo", detail: "2 mains + 2 mocktails + dessert platter at Rs. 999." },
    1: { title: "Monday Light Meal", detail: "Any biryani + starter combo at 15% off." },
    2: { title: "Tuesday Treat", detail: "Free brownie with every order above Rs. 800." },
    3: { title: "Midweek Combo", detail: "Paneer Tikka + Veg Biryani combo at Rs. 429." },
    4: { title: "Thursday Feast", detail: "Flat Rs. 120 off on family combo menu." },
    5: { title: "Friday Party Offer", detail: "3 mocktails for the price of 2." },
    6: { title: "Saturday Grill Combo", detail: "Starter + main + dessert at 18% off." }
  };

  const specialDates = {
    "02-14": { title: "Valentine's Day Special", detail: "Couple combo (starter + 2 mains + dessert) at Rs. 999." },
    "12-25": { title: "Christmas Feast", detail: "Festive combo + dessert platter at 20% off." },
    "12-31": { title: "New Year Eve Deal", detail: "Celebration combo menu with flat Rs. 250 off." }
  };

  const tableOffer = TABLES.find((table) => table.id === tableId)?.offer || "";
  const offers = [
    { title: "Table QR Offer", detail: tableOffer },
    weekdayOffers[day],
    { title: "Happy Hour", detail: "4:00 PM to 7:00 PM: 20% off on mocktails." }
  ];

  if (specialDates[key]) {
    offers.unshift(specialDates[key]);
  }
  return offers;
}

function renderDailyOffers() {
  const formatted = state.demoDate.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short"
  });
  offerDateLabel.textContent = formatted;
  const offers = getTodayOffers(state.demoDate, state.tableId);
  dailyOffers.innerHTML = offers
    .map(
      (offer) => `
      <article class="offer-item">
        <strong>${offer.title}</strong>
        <span>${offer.detail}</span>
      </article>
    `
    )
    .join("");
}

function renderTop() {
  const table = TABLES.find((item) => item.id === state.tableId);
  tableTitle.textContent = `Table ${state.tableId}`;
  offerText.textContent = `Offer for your table: ${table.offer}`;
  tableSelect.innerHTML = TABLES.map((item) => {
    const selected = item.id === state.tableId ? "selected" : "";
    return `<option value="${item.id}" ${selected}>${item.id}</option>`;
  }).join("");
}

function renderMenu() {
  menuList.innerHTML = "";
  MENU.forEach((item) => {
    const qty = state.cart[item.id] || 0;
    const card = document.createElement("article");
    card.className = "menu-item";
    card.innerHTML = `
      <div class="top-line">
        <div>
          <p class="name">${item.name}</p>
          <span class="meta">${item.prep} min prep</span>
          <span class="tag">${item.type}</span>
        </div>
        <strong>${money(item.price)}</strong>
      </div>
      <div class="qty">
        <button class="minus">-</button>
        <strong>${qty}</strong>
        <button class="plus">+</button>
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
    menuList.appendChild(card);
  });
}

function renderCart() {
  cartLines.innerHTML = "";
  const lines = Object.entries(state.cart);
  if (!lines.length) {
    cartLines.innerHTML = `<p class="empty">Cart is empty.</p>`;
  } else {
    lines.forEach(([itemId, qty]) => {
      const item = getMenuItem(itemId);
      const line = document.createElement("div");
      line.className = "line";
      line.innerHTML = `
        <span>${item.name} x ${qty}</span>
        <strong>${money(item.price * qty)}</strong>
      `;
      cartLines.appendChild(line);
    });
  }
  cartTotal.textContent = money(cartTotalValue());
}

function tableTickets() {
  return state.orders
    .filter((order) => order.tableId === state.tableId && order.status !== "Paid")
    .sort((a, b) => b.createdAt - a.createdAt);
}

function renderTickets() {
  const tickets = tableTickets();
  const activeCount = tickets.filter((ticket) => ticket.status === "Queued" || ticket.status === "Preparing").length;
  activeOrderCount.textContent = `${activeCount} Active Orders`;

  if (!tickets.length) {
    ticketList.innerHTML = `<p class="empty">No tickets yet for this table.</p>`;
    return;
  }

  ticketList.innerHTML = tickets
    .map((ticket) => {
      const eta = getOrderWaitMins(ticket);
      return `
        <article class="ticket ${ticket.status}">
          <strong>${ticket.id} - ${ticket.status}</strong>
          <span>Estimated wait: ${eta} min</span>
        </article>
      `;
    })
    .join("");
}

tableSelect.addEventListener("change", (event) => {
  state.tableId = event.target.value;
  toast.textContent = "";
  renderTop();
  renderDailyOffers();
  renderTickets();
});

placeBtn.addEventListener("click", () => {
  if (!Object.keys(state.cart).length) {
    toast.textContent = "Add at least one item to place order.";
    toast.style.color = "#9b451f";
    return;
  }

  state.orders = loadOrders();
  const newOrder = {
    id: nextKotId(),
    tableId: state.tableId,
    status: "Queued",
    createdAt: Date.now(),
    items: Object.entries(state.cart).map(([id, qty]) => ({ id, qty }))
  };
  state.orders.push(newOrder);
  saveOrders();
  state.cart = {};
  renderMenu();
  renderCart();
  renderTickets();

  const eta = getOrderWaitMins(newOrder);
  toast.textContent = `Order placed (${newOrder.id}). Estimated wait ${eta} min.`;
  toast.style.color = "#187e4f";
});

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEYS.orders) {
    return;
  }
  state.orders = loadOrders();
  renderTickets();
});

function init() {
  saveOrders();
  renderTop();
  renderDailyOffers();
  renderMenu();
  renderCart();
  renderTickets();
}

init();
