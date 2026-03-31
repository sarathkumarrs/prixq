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

const STORAGE_KEYS = {
  orders: "kot_demo_orders_v1",
  paidBills: "kot_demo_paid_bills_v1"
};

const DEFAULT_ORDERS = [];
const STATUS_OPTIONS = ["Queued", "Preparing", "Ready", "Paid"];

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
  selectedTableId: TABLES[0]?.id || "T1",
  activeTab: "orders",
  catalogMode: "categories",
  searchTerm: "",
  activeCategory: "All",
  carts: {},
  orders: loadStoredArray(STORAGE_KEYS.orders, DEFAULT_ORDERS),
  paidBills: loadStoredArray(STORAGE_KEYS.paidBills, [])
};

const tableGrid = document.getElementById("tableGrid");
const availableCount = document.getElementById("availableCount");
const occupiedCount = document.getElementById("occupiedCount");
const readyCount = document.getElementById("readyCount");
const tableSheet = document.getElementById("tableSheet");
const sheetBackdrop = document.getElementById("sheetBackdrop");
const closeSheetBtn = document.getElementById("closeSheetBtn");
const tabButtons = document.querySelectorAll(".tab-btn");
const tabOrders = document.getElementById("tabOrders");
const tabNew = document.getElementById("tabNew");
const modeCategoriesBtn = document.getElementById("modeCategoriesBtn");
const modeItemsBtn = document.getElementById("modeItemsBtn");
const categoryCards = document.getElementById("categoryCards");
const tableTitle = document.getElementById("tableTitle");
const tableStateLine = document.getElementById("tableStateLine");
const tableBillPreview = document.getElementById("tableBillPreview");
const clearTableBtn = document.getElementById("clearTableBtn");
const customerViewBtn = document.getElementById("customerViewBtn");
const ticketList = document.getElementById("ticketList");
const menuSearch = document.getElementById("menuSearch");
const categorySelect = document.getElementById("categorySelect");
const filtersWrap = tabNew.querySelector(".filters");
const menuList = document.getElementById("menuList");
const cartLines = document.getElementById("cartLines");
const cartSubtotal = document.getElementById("cartSubtotal");
const placeOrderBtn = document.getElementById("placeOrderBtn");
const toast = document.getElementById("toast");

function money(value) {
  return `Rs. ${value}`;
}

function setToast(message, type = "success") {
  toast.textContent = message;
  toast.style.color = type === "error" ? "#a3332f" : "#0f6b52";
}

function persistState() {
  saveStoredArray(STORAGE_KEYS.orders, state.orders);
  saveStoredArray(STORAGE_KEYS.paidBills, state.paidBills);
}

function ensureCart(tableId) {
  if (!state.carts[tableId]) {
    state.carts[tableId] = {};
  }
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

function nextKotId() {
  const max = state.orders.reduce((acc, order) => {
    const idNum = Number(order.id.split("-")[1]) || 1000;
    return Math.max(acc, idNum);
  }, 1000);
  return `KOT-${max + 1}`;
}

function activeOrdersForTable(tableId) {
  return state.orders.filter((order) => order.tableId === tableId && order.status !== "Paid");
}

function getTableState(tableId) {
  const active = activeOrdersForTable(tableId);
  if (!active.length) {
    return "available";
  }
  if (active.some((order) => order.status === "Ready")) {
    return "ready";
  }
  return "occupied";
}

function getTableOffer(tableId) {
  return TABLES.find((table) => table.id === tableId)?.offer || "No table offer configured.";
}

function formatAge(createdAt) {
  const diff = Math.max(0, Date.now() - Number(createdAt || 0));
  const mins = Math.floor(diff / 60000);
  if (mins < 1) {
    return "just now";
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m ago`;
}

function getOrderDiscount(order) {
  const discount = Number(order?.pricing?.discount);
  return Number.isFinite(discount) && discount > 0 ? discount : 0;
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
    tax,
    total
  };
}

function renderCounts() {
  let available = 0;
  let occupied = 0;
  let ready = 0;

  TABLES.forEach((table) => {
    const tableState = getTableState(table.id);
    if (tableState === "available") {
      available += 1;
    } else if (tableState === "ready") {
      ready += 1;
    } else {
      occupied += 1;
    }
  });

  availableCount.textContent = String(available);
  occupiedCount.textContent = String(occupied);
  readyCount.textContent = String(ready);
}

function renderTableGrid() {
  tableGrid.innerHTML = "";
  TABLES.forEach((table) => {
    const tableOrders = activeOrdersForTable(table.id);
    const tableState = getTableState(table.id);

    const button = document.createElement("button");
    button.className = `table-card ${tableState} ${state.selectedTableId === table.id ? "selected" : ""}`;
    button.dataset.tableId = table.id;
    button.type = "button";
    button.innerHTML = `
      <div class="table-icon">🍽</div>
      <p class="table-label">${table.id}</p>
      <span class="table-zone">FLOOR A</span>
      <span class="table-meta">${tableOrders.length} ticket(s)</span>
    `;
    tableGrid.appendChild(button);
  });
}

function categories() {
  return ["All", ...new Set(MENU.map((item) => item.type))];
}

function menuTypes() {
  return [...new Set(MENU.map((item) => item.type))];
}

function renderCategoryOptions() {
  categorySelect.innerHTML = categories()
    .map((category) => `<option value="${category}" ${category === state.activeCategory ? "selected" : ""}>${category}</option>`)
    .join("");
}

function renderCategoryCards() {
  const types = menuTypes();
  if (!types.length) {
    categoryCards.innerHTML = `<p class="empty">No categories found.</p>`;
    return;
  }

  categoryCards.innerHTML = types
    .map((typeName) => {
      const count = MENU.filter((item) => item.type === typeName).length;
      return `
        <button class="category-card" type="button" data-category-card="${typeName}">
          <h4>${typeName}</h4>
          <p>${count} item(s)</p>
        </button>
      `;
    })
    .join("");
}

function renderCatalogMode() {
  modeCategoriesBtn.classList.toggle("active", state.catalogMode === "categories");
  modeItemsBtn.classList.toggle("active", state.catalogMode === "items");

  const showCategories = state.catalogMode === "categories";
  categoryCards.classList.toggle("hidden", !showCategories);
  filtersWrap.classList.toggle("hidden", showCategories);
  menuList.classList.toggle("hidden", showCategories);
}

function getCurrentCart() {
  ensureCart(state.selectedTableId);
  return state.carts[state.selectedTableId];
}

function renderCart() {
  const cart = getCurrentCart();
  const entries = Object.entries(cart);
  if (!entries.length) {
    cartLines.innerHTML = `<p class="empty">No items in cart for ${state.selectedTableId}.</p>`;
    cartSubtotal.textContent = money(0);
    return;
  }

  let subtotal = 0;
  cartLines.innerHTML = entries
    .map(([itemId, qty]) => {
      const item = getMenuItem(itemId);
      const lineTotal = item.price * qty;
      subtotal += lineTotal;
      return `<div class="cart-line"><span>${item.name} x ${qty}</span><strong>${money(lineTotal)}</strong></div>`;
    })
    .join("");

  cartSubtotal.textContent = money(subtotal);
}

function filteredMenuItems() {
  const keyword = state.searchTerm.trim().toLowerCase();
  return MENU.filter((item) => {
    if (state.activeCategory !== "All" && item.type !== state.activeCategory) {
      return false;
    }
    if (!keyword) {
      return true;
    }
    return `${item.name} ${item.type}`.toLowerCase().includes(keyword);
  });
}

function menuItemCard(item, qty) {
  return `
    <article class="menu-item">
      <div class="menu-top">
        <div>
          <p class="menu-name">${item.name}</p>
          <span class="menu-tag">${item.type}</span>
        </div>
        <strong>${money(item.price)}</strong>
      </div>
      <div class="qty-row">
        <button class="qty-btn" type="button" data-item-id="${item.id}" data-delta="-1">-</button>
        <strong>${qty}</strong>
        <button class="qty-btn" type="button" data-item-id="${item.id}" data-delta="1">+</button>
      </div>
    </article>
  `;
}

function renderMenuList() {
  const cart = getCurrentCart();
  const items = filteredMenuItems();
  if (!items.length) {
    menuList.innerHTML = `<p class="empty">No menu items match this filter.</p>`;
    return;
  }

  const groups = items.reduce((acc, item) => {
    if (!acc[item.type]) {
      acc[item.type] = [];
    }
    acc[item.type].push(item);
    return acc;
  }, {});

  menuList.innerHTML = Object.entries(groups)
    .map(([groupName, groupItems]) => {
      const cards = groupItems
        .map((item) => {
          const qty = cart[item.id] || 0;
          return menuItemCard(item, qty);
        })
        .join("");

      return `
        <section class="menu-group">
          <h4 class="menu-group-title">${groupName}</h4>
          ${cards}
        </section>
      `;
    })
    .join("");
}

function renderSheetDetails() {
  const tableId = state.selectedTableId;
  const activeOrders = activeOrdersForTable(tableId).sort((a, b) => a.createdAt - b.createdAt);
  const tableState = getTableState(tableId);

  tableTitle.textContent = `Table ${tableId}`;
  tableStateLine.textContent = `${tableState.toUpperCase()} | ${activeOrders.length} active ticket(s) | ${getTableOffer(tableId)}`;
  customerViewBtn.href = `customer.html?table=${tableId}`;
  clearTableBtn.disabled = !activeOrders.length;

  if (!activeOrders.length) {
    tableBillPreview.innerHTML = `<p class="empty">No active items. Table is ready for next customer.</p>`;
    ticketList.innerHTML = `<p class="empty">No active tickets for ${tableId}.</p>`;
  } else {
    const bill = calculateBillBreakdown(activeOrders);
    tableBillPreview.innerHTML = `
      ${Object.entries(bill.merged)
        .map(([itemId, qty]) => {
          const item = getMenuItem(itemId);
          return `<div class="bill-line"><span>${item.name} x ${qty}</span><span>${money(item.price * qty)}</span></div>`;
        })
        .join("")}
      <div class="bill-line"><span>Subtotal</span><span>${money(bill.subtotal)}</span></div>
      ${bill.discount > 0 ? `<div class="bill-line"><span>Offer Savings</span><span>-${money(bill.discount)}</span></div>` : ""}
      <div class="bill-line"><span>GST (5%)</span><span>${money(bill.tax)}</span></div>
      <div class="bill-line bill-total"><span>Bill Total</span><span>${money(bill.total)}</span></div>
    `;

    ticketList.innerHTML = activeOrders
      .map((order) => {
        const ticketItems = order.items.map((line) => `${getMenuItem(line.id).name} x${line.qty}`).join(", ");
        const options = STATUS_OPTIONS
          .map((statusOption) => `<option value="${statusOption}" ${order.status === statusOption ? "selected" : ""}>${statusOption}</option>`)
          .join("");

        return `
          <article class="ticket status-${order.status}">
            <div class="ticket-head">
              <strong>${order.id}</strong>
              <span>${order.status}</span>
            </div>
            <div class="muted">Created ${formatAge(order.createdAt)}</div>
            <div class="ticket-items">${ticketItems}</div>
            <div class="status-row">
              <select class="status-select" data-order-id="${order.id}">${options}</select>
              <button class="status-btn" type="button" data-order-id="${order.id}">Update</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  renderCategoryCards();
  renderCatalogMode();
  renderMenuList();
  renderCart();
}

function renderTabState() {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === state.activeTab);
  });
  tabOrders.classList.toggle("active", state.activeTab === "orders");
  tabNew.classList.toggle("active", state.activeTab === "new");
}

function openSheet(tableId, tab = "orders") {
  state.selectedTableId = tableId;
  state.activeTab = tab;
  state.catalogMode = "categories";
  ensureCart(tableId);
  renderCounts();
  renderTableGrid();
  renderTabState();
  renderSheetDetails();
  sheetBackdrop.classList.remove("hidden");
  tableSheet.classList.add("open");
  tableSheet.setAttribute("aria-hidden", "false");
}

function closeSheet() {
  sheetBackdrop.classList.add("hidden");
  tableSheet.classList.remove("open");
  tableSheet.setAttribute("aria-hidden", "true");
  renderTableGrid();
}

function updateOrderStatus(orderId, nextStatus) {
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order) {
    return;
  }
  order.status = nextStatus;
  persistState();
  setToast(`Updated ${order.id} to ${nextStatus}.`);
  renderCounts();
  renderTableGrid();
  renderSheetDetails();
}

function clearSelectedTable() {
  const tableId = state.selectedTableId;
  const activeOrders = activeOrdersForTable(tableId);
  if (!activeOrders.length) {
    setToast(`No active orders for ${tableId}.`, "error");
    return;
  }

  const ok = window.confirm(`Clear ${activeOrders.length} active ticket(s) for ${tableId}?`);
  if (!ok) {
    return;
  }

  const bill = calculateBillBreakdown(activeOrders);
  activeOrders.forEach((order) => {
    order.status = "Paid";
  });
  state.paidBills.unshift({
    tableId,
    ticketCount: activeOrders.length,
    amount: bill.total,
    when: new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }),
    source: "waiter_clear"
  });
  state.carts[tableId] = {};
  persistState();
  setToast(`Table ${tableId} is now ready for next customer.`);
  renderCounts();
  renderTableGrid();
  renderSheetDetails();
}

function updateCart(tableId, itemId, delta) {
  ensureCart(tableId);
  state.carts[tableId][itemId] = (state.carts[tableId][itemId] || 0) + delta;
  if (state.carts[tableId][itemId] <= 0) {
    delete state.carts[tableId][itemId];
  }
}

function placeOrderForSelectedTable() {
  const cart = getCurrentCart();
  const lines = Object.entries(cart);
  if (!lines.length) {
    setToast("Add items before placing order.", "error");
    return;
  }

  state.orders = loadStoredArray(STORAGE_KEYS.orders, DEFAULT_ORDERS);
  state.paidBills = loadStoredArray(STORAGE_KEYS.paidBills, []);

  const subtotal = lines.reduce((sum, [itemId, qty]) => {
    const item = getMenuItem(itemId);
    return sum + item.price * qty;
  }, 0);

  const newOrder = {
    id: nextKotId(),
    tableId: state.selectedTableId,
    status: "Queued",
    source: "waiter",
    createdAt: Date.now(),
    items: lines.map(([id, qty]) => ({ id, qty })),
    pricing: {
      subtotal,
      discount: 0,
      total: subtotal
    }
  };

  state.orders.push(newOrder);
  state.carts[state.selectedTableId] = {};
  persistState();
  setToast(`Placed ${newOrder.id} for ${state.selectedTableId}.`);
  state.activeTab = "orders";
  renderCounts();
  renderTableGrid();
  renderTabState();
  renderSheetDetails();
}

tableGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-table-id]");
  if (!button) {
    return;
  }
  openSheet(button.dataset.tableId, "orders");
});

sheetBackdrop.addEventListener("click", closeSheet);
closeSheetBtn.addEventListener("click", closeSheet);

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.activeTab = button.dataset.tab;
    if (state.activeTab === "new") {
      state.catalogMode = "categories";
    }
    renderTabState();
    renderSheetDetails();
  });
});

modeCategoriesBtn.addEventListener("click", () => {
  state.catalogMode = "categories";
  renderCatalogMode();
});

modeItemsBtn.addEventListener("click", () => {
  state.catalogMode = "items";
  state.activeCategory = "All";
  categorySelect.value = "All";
  renderCatalogMode();
  renderMenuList();
});

ticketList.addEventListener("click", (event) => {
  const button = event.target.closest(".status-btn");
  if (!button) {
    return;
  }
  const orderId = button.dataset.orderId;
  const select = ticketList.querySelector(`select[data-order-id="${orderId}"]`);
  if (!select) {
    return;
  }
  updateOrderStatus(orderId, select.value);
});

menuList.addEventListener("click", (event) => {
  const button = event.target.closest(".qty-btn");
  if (!button) {
    return;
  }
  const itemId = button.dataset.itemId;
  const delta = Number(button.dataset.delta) || 0;
  if (!itemId || !delta) {
    return;
  }
  updateCart(state.selectedTableId, itemId, delta);
  renderMenuList();
  renderCart();
});

categoryCards.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category-card]");
  if (!button) {
    return;
  }
  const category = button.dataset.categoryCard;
  state.activeCategory = category;
  categorySelect.value = category;
  state.catalogMode = "items";
  renderCatalogMode();
  renderMenuList();
});

menuSearch.addEventListener("input", (event) => {
  state.searchTerm = event.target.value;
  renderMenuList();
});

categorySelect.addEventListener("change", (event) => {
  state.activeCategory = event.target.value;
  renderMenuList();
});

clearTableBtn.addEventListener("click", clearSelectedTable);
placeOrderBtn.addEventListener("click", placeOrderForSelectedTable);

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEYS.orders && event.key !== STORAGE_KEYS.paidBills) {
    return;
  }
  state.orders = loadStoredArray(STORAGE_KEYS.orders, DEFAULT_ORDERS);
  state.paidBills = loadStoredArray(STORAGE_KEYS.paidBills, []);
  renderCounts();
  renderTableGrid();
  if (tableSheet.classList.contains("open")) {
    renderSheetDetails();
  }
});

function init() {
  ensureCart(state.selectedTableId);
  renderCategoryOptions();
  renderCounts();
  renderTableGrid();
  renderTabState();
}

init();
