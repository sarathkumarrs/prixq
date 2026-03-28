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

const BRAND = window.APP_DATA?.brand || {
  name: "Container Cafe",
  area: "Bypass Road",
  phone: ""
};

const STORAGE_KEYS = {
  orders: "kot_demo_orders_v1"
};

const DEFAULT_ORDERS = [];

const brandName = document.getElementById("brandName");
const brandMeta = document.getElementById("brandMeta");
const tableTitle = document.getElementById("tableTitle");
const offerDateLabel = document.getElementById("offerDateLabel");
const dailyOffers = document.getElementById("dailyOffers");
const menuSearch = document.getElementById("menuSearch");
const sortSelect = document.getElementById("sortSelect");
const categoryChips = document.getElementById("categoryChips");
const menuList = document.getElementById("menuList");
const ticketList = document.getElementById("ticketList");
const activeOrderCount = document.getElementById("activeOrderCount");
const cartLines = document.getElementById("cartLines");
const cartTotal = document.getElementById("cartTotal");
const placeBtn = document.getElementById("placeBtn");
const toast = document.getElementById("toast");

const urlParams = new URLSearchParams(window.location.search);
const urlTable = urlParams.get("table");
const validTable = TABLES.find((table) => table.id === urlTable)?.id;

const state = {
  tableId: validTable || TABLES[0].id,
  demoDate: new Date(),
  activeCategory: "All",
  searchTerm: "",
  sort: "default",
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

function updateUrl() {
  const next = new URL(window.location.href);
  next.searchParams.set("table", state.tableId);
  window.history.replaceState({}, "", next.toString());
}

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
    0: { title: "Sunday Combo", detail: "Fried chicken family pack at discounted pricing." },
    1: { title: "Monday Saver", detail: "Tea and snacks combo deals available all day." },
    2: { title: "Tuesday Treat", detail: "Free brownie with orders above Rs. 800." },
    3: { title: "Midweek Deal", detail: "Combo meals with extra add-ons at lower rates." },
    4: { title: "Thursday Feast", detail: "Flat Rs. 120 off on selected family combos." },
    5: { title: "Friday Party", detail: "3 mocktails for the price of 2." },
    6: { title: "Weekend Grill", detail: "Chicken combo bundles at best value prices." }
  };

  const specialDates = {
    "02-14": { title: "Valentine Special", detail: "Couple combo menu at Rs. 999." },
    "12-25": { title: "Christmas Feast", detail: "Festive combo + dessert platter at 20% off." },
    "12-31": { title: "Year-End Deal", detail: "Celebration combo with flat Rs. 250 off." }
  };

  const tableOffer = TABLES.find((table) => table.id === tableId)?.offer || "";
  const offers = [
    { title: "Table Offer", detail: tableOffer },
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
  brandName.textContent = BRAND.name;
  brandMeta.textContent = `${BRAND.area} | ${BRAND.phone}`;
  tableTitle.textContent = `Table ${state.tableId}`;
}

function getCategories() {
  return ["All", ...new Set(MENU.map((item) => item.type))];
}

function renderCategoryChips() {
  categoryChips.innerHTML = getCategories()
    .map((category) => {
      const active = category === state.activeCategory ? "active" : "";
      return `<button class="chip ${active}" data-category="${category}">${category}</button>`;
    })
    .join("");

  categoryChips.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      state.activeCategory = chip.dataset.category;
      renderCategoryChips();
      renderMenu();
    });
  });
}

function getFilteredMenuItems() {
  let items = MENU.slice();

  if (state.activeCategory !== "All") {
    items = items.filter((item) => item.type === state.activeCategory);
  }

  if (state.searchTerm) {
    const key = state.searchTerm.toLowerCase();
    items = items.filter((item) => `${item.name} ${item.type}`.toLowerCase().includes(key));
  }

  if (state.sort === "priceAsc") {
    items.sort((a, b) => a.price - b.price);
  } else if (state.sort === "priceDesc") {
    items.sort((a, b) => b.price - a.price);
  } else if (state.sort === "nameAsc") {
    items.sort((a, b) => a.name.localeCompare(b.name));
  }

  return items;
}

function renderMenu() {
  const filtered = getFilteredMenuItems();
  menuList.innerHTML = "";

  if (!filtered.length) {
    menuList.innerHTML = `<p class="empty">No items match your filter.</p>`;
    return;
  }

  const groups = filtered.reduce((acc, item) => {
    if (!acc[item.type]) {
      acc[item.type] = [];
    }
    acc[item.type].push(item);
    return acc;
  }, {});

  Object.entries(groups).forEach(([groupName, items]) => {
    const group = document.createElement("section");
    group.className = "menu-group";
    group.innerHTML = `<h3>${groupName}</h3>`;

    items.forEach((item) => {
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
      group.appendChild(card);
    });

    menuList.appendChild(group);
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

function ticketItemsSummary(items) {
  return items
    .slice(0, 2)
    .map((line) => `${getMenuItem(line.id).name} x${line.qty}`)
    .join(", ");
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
          <span>${ticketItemsSummary(ticket.items)}</span>
        </article>
      `;
    })
    .join("");
}

menuSearch.addEventListener("input", (event) => {
  state.searchTerm = event.target.value.trim();
  renderMenu();
});

sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  renderMenu();
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
  updateUrl();
  renderTop();
  renderDailyOffers();
  renderCategoryChips();
  renderMenu();
  renderCart();
  renderTickets();
}

init();
