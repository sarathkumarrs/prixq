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

const FALLBACK_OFFERS = [];

const TABLES = Array.isArray(window.APP_DATA?.tables) && window.APP_DATA.tables.length
  ? window.APP_DATA.tables
  : FALLBACK_TABLES;

const MENU = Array.isArray(window.APP_DATA?.menu) && window.APP_DATA.menu.length
  ? window.APP_DATA.menu
  : FALLBACK_MENU;

const UPSELL_OFFERS = Array.isArray(window.APP_DATA?.offers) && window.APP_DATA.offers.length
  ? window.APP_DATA.offers
  : FALLBACK_OFFERS;

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
const quickUpsell = document.getElementById("quickUpsell");
const savingsRow = document.getElementById("savingsRow");
const cartSavings = document.getElementById("cartSavings");
const placeBtn = document.getElementById("placeBtn");
const toast = document.getElementById("toast");

const urlParams = new URLSearchParams(window.location.search);
const urlTable = urlParams.get("table");
const validTable = TABLES.find((table) => table.id === urlTable)?.id;

const state = {
  tableId: validTable || TABLES[0].id,
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

function parseTimeValue(value) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function getMinutesOfDay(dateObj) {
  return dateObj.getHours() * 60 + dateObj.getMinutes();
}

function isOfferActiveNow(offer, dateObj) {
  const start = parseTimeValue(offer.startsAt);
  const end = parseTimeValue(offer.endsAt);
  if (start === null || end === null) {
    return true;
  }
  const current = getMinutesOfDay(dateObj);
  return current >= start && current <= end;
}

function getActiveOffers(dateObj = new Date()) {
  return UPSELL_OFFERS
    .filter((offer) => isOfferActiveNow(offer, dateObj))
    .sort((a, b) => (a.priority || 99) - (b.priority || 99));
}

function getOfferOriginalPrice(offer) {
  return offer.items.reduce((sum, line) => {
    const item = getMenuItem(line.id);
    return sum + item.price * line.qty;
  }, 0);
}

function offerLineLabel(offer) {
  return offer.items
    .map((line) => {
      const item = getMenuItem(line.id);
      return `${item.name}${line.qty > 1 ? ` x${line.qty}` : ""}`;
    })
    .join(" + ");
}

function computeCartPricing() {
  const subtotal = Object.entries(state.cart).reduce((sum, [itemId, qty]) => {
    const item = getMenuItem(itemId);
    return sum + item.price * qty;
  }, 0);

  const remaining = Object.entries(state.cart).reduce((acc, [itemId, qty]) => {
    acc[itemId] = qty;
    return acc;
  }, {});

  const applications = [];
  const activeOffers = getActiveOffers();

  activeOffers.forEach((offer) => {
    const originalUnit = getOfferOriginalPrice(offer);
    if (offer.dealPrice >= originalUnit) {
      return;
    }

    const count = offer.items.reduce((min, req) => {
      const available = remaining[req.id] || 0;
      return Math.min(min, Math.floor(available / req.qty));
    }, Number.MAX_SAFE_INTEGER);

    if (!Number.isFinite(count) || count < 1) {
      return;
    }

    offer.items.forEach((req) => {
      remaining[req.id] = (remaining[req.id] || 0) - req.qty * count;
    });

    const originalTotal = originalUnit * count;
    const dealTotal = offer.dealPrice * count;
    applications.push({
      offerId: offer.id,
      title: offer.title,
      count,
      originalTotal,
      dealTotal,
      savings: originalTotal - dealTotal
    });
  });

  const remainingTotal = Object.entries(remaining).reduce((sum, [itemId, qty]) => {
    if (qty <= 0) {
      return sum;
    }
    const item = getMenuItem(itemId);
    return sum + item.price * qty;
  }, 0);

  const dealsTotal = applications.reduce((sum, app) => sum + app.dealTotal, 0);
  const total = dealsTotal + remainingTotal;
  const savings = Math.max(0, subtotal - total);

  return {
    subtotal,
    savings,
    total,
    applications
  };
}

function addItemToCart(itemId, qty) {
  state.cart[itemId] = (state.cart[itemId] || 0) + qty;
  if (state.cart[itemId] <= 0) {
    delete state.cart[itemId];
  }
}

function addOfferBundle(offerId) {
  const offer = UPSELL_OFFERS.find((entry) => entry.id === offerId);
  if (!offer) {
    return;
  }
  offer.items.forEach((line) => addItemToCart(line.id, line.qty));
  toast.textContent = `${offer.title} added to cart.`;
  toast.style.color = "#187e4f";
  renderMenu();
  renderCart();
  renderDailyOffers();
}

function renderDailyOffers() {
  const now = new Date();
  const formatted = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short"
  });
  offerDateLabel.textContent = formatted;

  const offers = getActiveOffers(now);
  const pricing = computeCartPricing();
  const appliedByOffer = pricing.applications.reduce((acc, app) => {
    acc[app.offerId] = app.count;
    return acc;
  }, {});

  if (!offers.length) {
    dailyOffers.innerHTML = `<p class="empty">No live offers right now.</p>`;
    return;
  }

  dailyOffers.innerHTML = offers
    .map((offer) => {
      const original = getOfferOriginalPrice(offer);
      const save = Math.max(0, original - offer.dealPrice);
      const appliedCount = appliedByOffer[offer.id] || 0;
      return `
        <article class="offer-item">
          <div class="offer-head">
            <span class="offer-badge">${offer.badge || "Offer"}</span>
            <span class="offer-window">${offer.windowLabel || "Today"}</span>
          </div>
          <strong>${offer.title}</strong>
          <p class="offer-lines">${offerLineLabel(offer)}</p>
          <div class="offer-pricing">
            <span class="offer-old">${money(original)}</span>
            <span class="offer-deal">${money(offer.dealPrice)}</span>
            <span class="offer-save">Save ${money(save)}</span>
          </div>
          <button class="offer-btn" data-offer-id="${offer.id}">${offer.cta || "Add Deal"}</button>
          ${appliedCount > 0 ? `<div class="offer-applied">Applied in cart x${appliedCount}</div>` : ""}
        </article>
      `;
    })
    .join("");

  dailyOffers.querySelectorAll(".offer-btn").forEach((button) => {
    button.addEventListener("click", () => addOfferBundle(button.dataset.offerId));
  });
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
        addItemToCart(item.id, 1);
        renderMenu();
        renderCart();
        renderDailyOffers();
      });
      card.querySelector(".minus").addEventListener("click", () => {
        if (!state.cart[item.id]) {
          return;
        }
        addItemToCart(item.id, -1);
        renderMenu();
        renderCart();
        renderDailyOffers();
      });
      group.appendChild(card);
    });

    menuList.appendChild(group);
  });
}

function getQuickUpsellSuggestion(pricing) {
  const totalQty = Object.values(state.cart).reduce((sum, qty) => sum + qty, 0);
  if (!totalQty) {
    return null;
  }

  const hasItem = (itemId) => Boolean(state.cart[itemId]);
  const hasType = (typeName) =>
    Object.keys(state.cart).some((itemId) => {
      const item = getMenuItem(itemId);
      return item.type === typeName;
    });

  if (hasType("Fried Chicken Combo") && !hasItem("CP01")) {
    return {
      itemId: "CP01",
      title: "Popular add-on",
      detail: "Customers usually add Leg Piece with chicken combo."
    };
  }

  if (pricing.subtotal >= 150 && !hasType("Mojitos")) {
    return {
      itemId: "MJ03",
      title: "Cooler suggestion",
      detail: "Add Mint Mojito to increase combo value."
    };
  }

  if (pricing.subtotal < 180 && !hasItem("FF01")) {
    return {
      itemId: "FF01",
      title: "Quick upsell",
      detail: "Chicken Burger is a frequent add-on."
    };
  }

  return null;
}

function renderQuickUpsell(pricing) {
  const suggestion = getQuickUpsellSuggestion(pricing);
  if (!suggestion) {
    quickUpsell.innerHTML = "";
    return;
  }

  const item = getMenuItem(suggestion.itemId);
  quickUpsell.innerHTML = `
    <div class="upsell-card">
      <div class="upsell-copy">
        <strong>${suggestion.title}</strong>
        <span>${item.name} - ${money(item.price)} | ${suggestion.detail}</span>
      </div>
      <button class="upsell-btn" data-item-id="${item.id}">Add</button>
    </div>
  `;

  const button = quickUpsell.querySelector(".upsell-btn");
  if (button) {
    button.addEventListener("click", () => {
      addItemToCart(button.dataset.itemId, 1);
      toast.textContent = `${item.name} added.`;
      toast.style.color = "#187e4f";
      renderMenu();
      renderCart();
      renderDailyOffers();
    });
  }
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

  const pricing = computeCartPricing();
  renderQuickUpsell(pricing);
  if (pricing.savings > 0) {
    savingsRow.classList.remove("hidden");
    cartSavings.textContent = `-${money(pricing.savings)}`;
  } else {
    savingsRow.classList.add("hidden");
    cartSavings.textContent = "-Rs. 0";
  }
}

function tableTickets() {
  return state.orders
    .filter((order) => order.tableId === state.tableId && order.status !== "Paid")
    .sort((a, b) => b.createdAt - a.createdAt);
}

function ticketItemsSummary(items) {
  const preview = items.slice(0, 2).map((line) => `${getMenuItem(line.id).name} x${line.qty}`);
  if (items.length > 2) {
    preview.push(`+${items.length - 2} more`);
  }
  return preview.join(", ");
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
      const offersText = Array.isArray(ticket.appliedOffers) && ticket.appliedOffers.length
        ? ticket.appliedOffers.map((offer) => `${offer.title} x${offer.count}`).join(", ")
        : "";
      return `
        <article class="ticket ${ticket.status}">
          <strong>${ticket.id} - ${ticket.status}</strong>
          <span>Estimated wait: ${eta} min</span>
          <span>${ticketItemsSummary(ticket.items)}</span>
          ${offersText ? `<span>Offers: ${offersText}</span>` : ""}
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
  const pricing = computeCartPricing();
  const newOrder = {
    id: nextKotId(),
    tableId: state.tableId,
    status: "Queued",
    createdAt: Date.now(),
    items: Object.entries(state.cart).map(([id, qty]) => ({ id, qty })),
    pricing: {
      subtotal: pricing.subtotal,
      discount: pricing.savings,
      total: pricing.total
    },
    appliedOffers: pricing.applications.map((app) => ({
      offerId: app.offerId,
      title: app.title,
      count: app.count,
      savings: app.savings
    }))
  };
  state.orders.push(newOrder);
  saveOrders();
  state.cart = {};
  renderMenu();
  renderCart();
  renderDailyOffers();
  renderTickets();

  const eta = getOrderWaitMins(newOrder);
  if (pricing.savings > 0) {
    toast.textContent = `Order placed (${newOrder.id}). ETA ${eta} min. You saved ${money(pricing.savings)}.`;
  } else {
    toast.textContent = `Order placed (${newOrder.id}). Estimated wait ${eta} min.`;
  }
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
  renderCategoryChips();
  renderDailyOffers();
  renderMenu();
  renderCart();
  renderTickets();
}

init();
