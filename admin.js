const ADMIN_STORAGE_KEY = "kot_demo_admin_config_v1";
const DUMMY_QR_SRC = "images/dummy-qr.svg";

const defaults = clone(window.APP_DEFAULT_DATA || window.APP_DATA || {});

const state = {
  config: sanitizeConfig(loadAdminRaw(), defaults),
  defaults: sanitizeConfig(defaults, defaults)
};

const elements = {
  navButtons: document.querySelectorAll(".nav-btn"),
  sectionPanels: document.querySelectorAll(".section-panel"),
  sectionTitle: document.getElementById("sectionTitle"),
  dashboardTableCount: document.getElementById("dashboardTableCount"),
  dashboardMenuCount: document.getElementById("dashboardMenuCount"),
  dashboardCategoryCount: document.getElementById("dashboardCategoryCount"),
  dashboardOfferCount: document.getElementById("dashboardOfferCount"),
  dashboardQueueTarget: document.getElementById("dashboardQueueTarget"),
  brandNameInput: document.getElementById("brandNameInput"),
  brandAreaInput: document.getElementById("brandAreaInput"),
  brandPhoneInput: document.getElementById("brandPhoneInput"),
  commonOfferInput: document.getElementById("commonOfferInput"),
  queueAckTargetInput: document.getElementById("queueAckTargetInput"),
  orderAlertAudioInput: document.getElementById("orderAlertAudioInput"),
  waiterReadyAudioInput: document.getElementById("waiterReadyAudioInput"),
  autoPrintDefaultInput: document.getElementById("autoPrintDefaultInput"),
  soundAlertsDefaultInput: document.getElementById("soundAlertsDefaultInput"),
  tableRows: document.getElementById("tableRows"),
  menuCategoryRows: document.getElementById("menuCategoryRows"),
  menuRows: document.getElementById("menuRows"),
  offerRows: document.getElementById("offerRows"),
  addTableBtn: document.getElementById("addTableBtn"),
  addMenuCategoryBtn: document.getElementById("addMenuCategoryBtn"),
  addMenuBtn: document.getElementById("addMenuBtn"),
  addOfferBtn: document.getElementById("addOfferBtn"),
  exportJsonBtn: document.getElementById("exportJsonBtn"),
  applyJsonBtn: document.getElementById("applyJsonBtn"),
  resetDefaultsBtn: document.getElementById("resetDefaultsBtn"),
  saveConfigBtn: document.getElementById("saveConfigBtn"),
  saveConfigBtnBottom: document.getElementById("saveConfigBtnBottom"),
  jsonEditor: document.getElementById("jsonEditor"),
  statusText: document.getElementById("statusText")
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asPositiveInt(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return fallback;
  }
  return Math.round(num);
}

function asNonNegativeInt(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return fallback;
  }
  return Math.round(num);
}

function asString(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }
  return value.trim();
}

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];
  values.forEach((value) => {
    const clean = asString(value, "");
    if (!clean || seen.has(clean)) {
      return;
    }
    seen.add(clean);
    result.push(clean);
  });
  return result;
}

function parseOfferItemsSpec(spec) {
  if (!spec || typeof spec !== "string") {
    return [];
  }
  return spec
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const parts = chunk.split(":");
      const id = asString(parts[0], "");
      const qty = asPositiveInt(parts[1], 1);
      return { id, qty };
    })
    .filter((line) => line.id);
}

function formatOfferItems(items) {
  if (!Array.isArray(items) || !items.length) {
    return "";
  }
  return items.map((line) => `${line.id}:${line.qty}`).join(", ");
}

function loadAdminRaw() {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) {
      return clone(defaults);
    }
    const parsed = JSON.parse(raw);
    return isObject(parsed) ? parsed : clone(defaults);
  } catch (error) {
    return clone(defaults);
  }
}

function sanitizeConfig(input, fallback) {
  const src = isObject(input) ? input : {};
  const base = isObject(fallback) ? fallback : {};

  const brandFallback = isObject(base.brand) ? base.brand : {};
  const brandSource = isObject(src.brand) ? src.brand : {};
  const brand = {
    name: asString(brandSource.name, asString(brandFallback.name, "Restaurant")),
    area: asString(brandSource.area, asString(brandFallback.area, "")),
    phone: asString(brandSource.phone, asString(brandFallback.phone, ""))
  };
  const commonOfferText = asString(src.commonOfferText, asString(base.commonOfferText, "Today's live offers apply for all tables."));

  const kotFallback = isObject(base.kot) ? base.kot : {};
  const kotSource = isObject(src.kot) ? src.kot : {};
  const kot = {
    queueAckTargetMins: asPositiveInt(kotSource.queueAckTargetMins, asPositiveInt(kotFallback.queueAckTargetMins, 2)),
    autoPrintDefault: kotSource.autoPrintDefault !== false,
    soundAlertsDefault: kotSource.soundAlertsDefault !== false,
    orderAlertAudio: asString(kotSource.orderAlertAudio, asString(kotFallback.orderAlertAudio, "notification_tune.wav")),
    waiterReadyAudio: asString(kotSource.waiterReadyAudio, asString(kotFallback.waiterReadyAudio, "waiter_conf.wav"))
  };

  const fallbackTables = Array.isArray(base.tables) ? base.tables : [];
  const sourceTables = Array.isArray(src.tables) ? src.tables : [];
  const tables = sourceTables
    .map((table, index) => {
      const tableFallback = fallbackTables[index] || {};
      return {
        id: asString(table?.id, asString(tableFallback.id, `T${index + 1}`))
      };
    })
    .filter((table) => table.id);

  const fallbackMenu = Array.isArray(base.menu) ? base.menu : [];
  const sourceMenu = Array.isArray(src.menu) ? src.menu : [];
  const menu = sourceMenu
    .map((item, index) => {
      const itemFallback = fallbackMenu[index] || {};
      return {
        id: asString(item?.id, asString(itemFallback.id, `M${index + 1}`)),
        name: asString(item?.name, asString(itemFallback.name, "New Item")),
        type: asString(item?.type, asString(itemFallback.type, "")),
        price: asNonNegativeInt(item?.price, asNonNegativeInt(itemFallback.price, 0)),
        prep: asPositiveInt(item?.prep, asPositiveInt(itemFallback.prep, 8))
      };
    })
    .filter((item) => item.id && item.name);

  const fallbackMenuCategories = Array.isArray(base.menuCategories) && base.menuCategories.length
    ? base.menuCategories
    : fallbackMenu.map((item) => item.type);
  const sourceMenuCategories = Array.isArray(src.menuCategories) ? src.menuCategories : [];
  const menuCategories = uniqueStrings(sourceMenuCategories.length ? sourceMenuCategories : fallbackMenuCategories);
  if (!menuCategories.length) {
    menuCategories.push("General");
  }
  menu.forEach((item) => {
    if (!item.type) {
      item.type = menuCategories[0];
    }
    if (!menuCategories.includes(item.type)) {
      menuCategories.push(item.type);
    }
  });

  const fallbackOffers = Array.isArray(base.offers) ? base.offers : [];
  const sourceOffers = Array.isArray(src.offers) ? src.offers : [];
  const offers = sourceOffers
    .map((offer, index) => {
      const offerFallback = fallbackOffers[index] || {};
      const itemsFromList = Array.isArray(offer?.items)
        ? offer.items
        : parseOfferItemsSpec(asString(offer?.itemsSpec, ""));
      const items = itemsFromList
        .map((line) => ({
          id: asString(line?.id, ""),
          qty: asPositiveInt(line?.qty, 1)
        }))
        .filter((line) => line.id);

      return {
        id: asString(offer?.id, asString(offerFallback.id, `OFR${String(index + 1).padStart(2, "0")}`)),
        title: asString(offer?.title, asString(offerFallback.title, "Offer")),
        badge: asString(offer?.badge, asString(offerFallback.badge, "")),
        windowLabel: asString(offer?.windowLabel, asString(offerFallback.windowLabel, "Today")),
        startsAt: asString(offer?.startsAt, asString(offerFallback.startsAt, "")),
        endsAt: asString(offer?.endsAt, asString(offerFallback.endsAt, "")),
        dealPrice: asNonNegativeInt(offer?.dealPrice, asNonNegativeInt(offerFallback.dealPrice, 0)),
        image: asString(offer?.image, asString(offerFallback.image, "")),
        cta: asString(offer?.cta, asString(offerFallback.cta, "Add Deal")),
        priority: asPositiveInt(offer?.priority, asPositiveInt(offerFallback.priority, index + 1)),
        items
      };
    })
    .filter((offer) => offer.id && offer.title);

  return {
    brand,
    commonOfferText,
    kot,
    tables: tables.length ? tables : clone(fallbackTables),
    menuCategories,
    menu: menu.length ? menu : clone(fallbackMenu),
    offers
  };
}

function hasDuplicates(list, keyName) {
  const seen = new Set();
  for (const row of list) {
    const key = asString(row[keyName], "");
    if (!key) {
      continue;
    }
    if (seen.has(key)) {
      return key;
    }
    seen.add(key);
  }
  return "";
}

function hasDuplicateStrings(list) {
  const seen = new Set();
  for (const value of list) {
    const key = asString(value, "");
    if (!key) {
      continue;
    }
    if (seen.has(key)) {
      return key;
    }
    seen.add(key);
  }
  return "";
}

function setStatus(message, type = "info") {
  elements.statusText.textContent = message;
  if (type === "error") {
    elements.statusText.style.color = "#a7372f";
    return;
  }
  if (type === "success") {
    elements.statusText.style.color = "#156a45";
    return;
  }
  elements.statusText.style.color = "#1d5f7f";
}

function renderTopFields() {
  const { brand, kot } = state.config;
  elements.brandNameInput.value = brand.name || "";
  elements.brandAreaInput.value = brand.area || "";
  elements.brandPhoneInput.value = brand.phone || "";
  elements.commonOfferInput.value = state.config.commonOfferText || "";
  elements.queueAckTargetInput.value = String(kot.queueAckTargetMins || 2);
  elements.orderAlertAudioInput.value = kot.orderAlertAudio || "";
  elements.waiterReadyAudioInput.value = kot.waiterReadyAudio || "";
  elements.autoPrintDefaultInput.checked = kot.autoPrintDefault !== false;
  elements.soundAlertsDefaultInput.checked = kot.soundAlertsDefault !== false;
}

function renderTables() {
  elements.tableRows.innerHTML = state.config.tables
    .map((table, index) => `
      <div class="list-row table-row" data-index="${index}">
        <label>
          <span>Table ID</span>
          <input data-field="id" value="${escapeHtml(table.id)}" placeholder="T1">
        </label>
        <img class="qr-thumb" src="${DUMMY_QR_SRC}" alt="Dummy QR">
        <div class="qr-link">customer.html?table=${escapeHtml(table.id || "T1")}</div>
        <button class="remove-btn" type="button" data-action="remove">Remove</button>
      </div>
    `)
    .join("");
}

function renderMenuCategories() {
  elements.menuCategoryRows.innerHTML = state.config.menuCategories
    .map((category, index) => `
      <div class="list-row menu-category-row" data-index="${index}">
        <label>
          <span>Category</span>
          <input data-field="name" value="${escapeHtml(category)}" placeholder="Category name">
        </label>
        <button class="remove-btn" type="button" data-action="remove">Remove</button>
      </div>
    `)
    .join("");
}

function renderMenu() {
  const categories = state.config.menuCategories.length ? state.config.menuCategories : ["General"];
  const content = categories
    .map((category) => {
      const rows = state.config.menu
        .map((item, index) => ({ item, index }))
        .filter((entry) => entry.item.type === category)
        .map((entry) => {
          const options = categories
            .map((option) => `<option value="${escapeHtml(option)}" ${option === entry.item.type ? "selected" : ""}>${escapeHtml(option)}</option>`)
            .join("");
          return `
            <div class="list-row menu-row" data-index="${entry.index}">
              <label><span>ID</span><input data-field="id" value="${escapeHtml(entry.item.id)}" placeholder="FC01"></label>
              <label><span>Name</span><input data-field="name" value="${escapeHtml(entry.item.name)}" placeholder="Menu item"></label>
              <label><span>Category</span><select data-field="type">${options}</select></label>
              <label><span>Price</span><input data-field="price" type="number" min="0" value="${entry.item.price}"></label>
              <label><span>Prep (min)</span><input data-field="prep" type="number" min="1" value="${entry.item.prep}"></label>
              <button class="remove-btn" type="button" data-action="remove">Remove</button>
            </div>
          `;
        })
        .join("");
      return `
        <section class="menu-group">
          <h5 class="menu-group-title">${escapeHtml(category)}</h5>
          ${rows || `<p class="hint">No items in this category.</p>`}
        </section>
      `;
    })
    .join("");

  elements.menuRows.innerHTML = content || `<p class="hint">No categories available. Add one first.</p>`;
}

function renderOffers() {
  elements.offerRows.innerHTML = state.config.offers
    .map((offer, index) => `
      <div class="list-row offer-row" data-index="${index}">
        <label><span>ID</span><input data-field="id" value="${escapeHtml(offer.id)}" placeholder="OFR01"></label>
        <label><span>Title</span><input data-field="title" value="${escapeHtml(offer.title)}"></label>
        <label><span>Badge</span><input data-field="badge" value="${escapeHtml(offer.badge)}"></label>
        <label><span>Window Label</span><input data-field="windowLabel" value="${escapeHtml(offer.windowLabel)}"></label>
        <label><span>Start (HH:MM)</span><input data-field="startsAt" value="${escapeHtml(offer.startsAt || "")}" placeholder="16:00"></label>
        <label><span>End (HH:MM)</span><input data-field="endsAt" value="${escapeHtml(offer.endsAt || "")}" placeholder="23:00"></label>
        <label><span>Deal Price</span><input data-field="dealPrice" type="number" min="0" value="${offer.dealPrice}"></label>
        <label><span>Priority</span><input data-field="priority" type="number" min="1" value="${offer.priority}"></label>
        <label><span>Image Path</span><input data-field="image" value="${escapeHtml(offer.image || "")}" placeholder="images/banner.png"></label>
        <label><span>CTA</span><input data-field="cta" value="${escapeHtml(offer.cta || "Add Deal")}"></label>
        <label><span>Bundle Items</span><input data-field="itemsSpec" value="${escapeHtml(formatOfferItems(offer.items))}" placeholder="FC01:1,MJ03:1"></label>
        <button class="remove-btn" type="button" data-action="remove">Remove</button>
      </div>
    `)
    .join("");
}

function renderAll() {
  renderDashboard();
  renderTopFields();
  renderTables();
  renderMenuCategories();
  renderMenu();
  renderOffers();
}

function renderDashboard() {
  elements.dashboardTableCount.textContent = String(state.config.tables.length);
  elements.dashboardMenuCount.textContent = String(state.config.menu.length);
  elements.dashboardCategoryCount.textContent = String(state.config.menuCategories.length);
  elements.dashboardOfferCount.textContent = String(state.config.offers.length);
  elements.dashboardQueueTarget.textContent = `${state.config.kot.queueAckTargetMins || 2} min`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function saveConfiguration() {
  state.config.brand.name = asString(elements.brandNameInput.value, "");
  if (!state.config.brand.name) {
    setStatus("Restaurant name is required.", "error");
    return;
  }

  const duplicateTable = hasDuplicates(state.config.tables, "id");
  if (duplicateTable) {
    setStatus(`Duplicate table id: ${duplicateTable}`, "error");
    return;
  }

  const duplicateMenu = hasDuplicates(state.config.menu, "id");
  if (duplicateMenu) {
    setStatus(`Duplicate menu id: ${duplicateMenu}`, "error");
    return;
  }
  const duplicateCategory = hasDuplicateStrings(state.config.menuCategories);
  if (duplicateCategory) {
    setStatus(`Duplicate category name: ${duplicateCategory}`, "error");
    return;
  }

  const duplicateOffer = hasDuplicates(state.config.offers, "id");
  if (duplicateOffer) {
    setStatus(`Duplicate offer id: ${duplicateOffer}`, "error");
    return;
  }

  state.config = sanitizeConfig(state.config, state.defaults);
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(state.config));
  window.APP_DATA = clone(state.config);
  renderDashboard();
  elements.jsonEditor.value = JSON.stringify(state.config, null, 2);
  setStatus("Configuration saved. Reload other open pages to apply changes.", "success");
}

function bindTopFields() {
  elements.brandNameInput.addEventListener("input", (event) => {
    state.config.brand.name = event.target.value;
  });
  elements.brandAreaInput.addEventListener("input", (event) => {
    state.config.brand.area = event.target.value;
  });
  elements.brandPhoneInput.addEventListener("input", (event) => {
    state.config.brand.phone = event.target.value;
  });
  elements.commonOfferInput.addEventListener("input", (event) => {
    state.config.commonOfferText = event.target.value;
  });
  elements.queueAckTargetInput.addEventListener("input", (event) => {
    state.config.kot.queueAckTargetMins = asPositiveInt(event.target.value, 2);
  });
  elements.orderAlertAudioInput.addEventListener("input", (event) => {
    state.config.kot.orderAlertAudio = event.target.value.trim();
  });
  elements.waiterReadyAudioInput.addEventListener("input", (event) => {
    state.config.kot.waiterReadyAudio = event.target.value.trim();
  });
  elements.autoPrintDefaultInput.addEventListener("change", (event) => {
    state.config.kot.autoPrintDefault = event.target.checked;
  });
  elements.soundAlertsDefaultInput.addEventListener("change", (event) => {
    state.config.kot.soundAlertsDefault = event.target.checked;
  });
}

function bindTableEvents() {
  elements.tableRows.addEventListener("input", (event) => {
    const row = event.target.closest("[data-index]");
    if (!row) {
      return;
    }
    const index = Number(row.dataset.index);
    const field = event.target.dataset.field;
    if (!Number.isInteger(index) || !field || !state.config.tables[index]) {
      return;
    }
    state.config.tables[index][field] = event.target.value;
    if (field === "id") {
      const link = row.querySelector(".qr-link");
      if (link) {
        link.textContent = `customer.html?table=${event.target.value || "T1"}`;
      }
    }
  });

  elements.tableRows.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("[data-action]");
    if (!actionBtn || actionBtn.dataset.action !== "remove") {
      return;
    }
    const row = actionBtn.closest("[data-index]");
    const index = Number(row?.dataset.index);
    if (!Number.isInteger(index)) {
      return;
    }
    state.config.tables.splice(index, 1);
    renderTables();
  });
}

function bindMenuCategoryEvents() {
  elements.menuCategoryRows.addEventListener("input", (event) => {
    const row = event.target.closest("[data-index]");
    if (!row) {
      return;
    }
    const index = Number(row.dataset.index);
    const field = event.target.dataset.field;
    if (!Number.isInteger(index) || field !== "name") {
      return;
    }
    const oldName = state.config.menuCategories[index];
    const nextName = asString(event.target.value, "");
    if (!nextName) {
      return;
    }
    state.config.menuCategories[index] = nextName;
    state.config.menu.forEach((item) => {
      if (item.type === oldName) {
        item.type = nextName;
      }
    });
    renderMenuCategories();
    renderMenu();
    renderDashboard();
  });

  elements.menuCategoryRows.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("[data-action]");
    if (!actionBtn || actionBtn.dataset.action !== "remove") {
      return;
    }
    const row = actionBtn.closest("[data-index]");
    const index = Number(row?.dataset.index);
    if (!Number.isInteger(index)) {
      return;
    }
    if (state.config.menuCategories.length <= 1) {
      setStatus("At least one category is required.", "error");
      return;
    }
    const removed = state.config.menuCategories[index];
    state.config.menuCategories.splice(index, 1);
    const fallbackCategory = state.config.menuCategories[0];
    state.config.menu.forEach((item) => {
      if (item.type === removed) {
        item.type = fallbackCategory;
      }
    });
    renderMenuCategories();
    renderMenu();
    renderDashboard();
  });
}

function bindMenuEvents() {
  elements.menuRows.addEventListener("input", (event) => {
    const row = event.target.closest("[data-index]");
    if (!row) {
      return;
    }
    const index = Number(row.dataset.index);
    const field = event.target.dataset.field;
    const item = state.config.menu[index];
    if (!Number.isInteger(index) || !field || !item) {
      return;
    }
    if (field === "price" || field === "prep") {
      item[field] = asPositiveInt(event.target.value, field === "prep" ? 8 : 0);
      if (field === "price") {
        item[field] = asNonNegativeInt(event.target.value, 0);
      }
      return;
    }
    item[field] = event.target.value;
    if (field === "type") {
      renderMenu();
    }
  });

  elements.menuRows.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("[data-action]");
    if (!actionBtn || actionBtn.dataset.action !== "remove") {
      return;
    }
    const row = actionBtn.closest("[data-index]");
    const index = Number(row?.dataset.index);
    if (!Number.isInteger(index)) {
      return;
    }
    state.config.menu.splice(index, 1);
    renderMenu();
    renderDashboard();
  });
}

function bindOfferEvents() {
  elements.offerRows.addEventListener("input", (event) => {
    const row = event.target.closest("[data-index]");
    if (!row) {
      return;
    }
    const index = Number(row.dataset.index);
    const field = event.target.dataset.field;
    const offer = state.config.offers[index];
    if (!Number.isInteger(index) || !field || !offer) {
      return;
    }
    if (field === "dealPrice") {
      offer.dealPrice = asNonNegativeInt(event.target.value, 0);
      return;
    }
    if (field === "priority") {
      offer.priority = asPositiveInt(event.target.value, 1);
      return;
    }
    if (field === "itemsSpec") {
      offer.items = parseOfferItemsSpec(event.target.value);
      return;
    }
    offer[field] = event.target.value;
  });

  elements.offerRows.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("[data-action]");
    if (!actionBtn || actionBtn.dataset.action !== "remove") {
      return;
    }
    const row = actionBtn.closest("[data-index]");
    const index = Number(row?.dataset.index);
    if (!Number.isInteger(index)) {
      return;
    }
    state.config.offers.splice(index, 1);
    renderOffers();
  });
}

function bindActions() {
  elements.addTableBtn.addEventListener("click", () => {
    const next = state.config.tables.length + 1;
    state.config.tables.push({ id: `T${next}` });
    renderTables();
    renderDashboard();
  });

  elements.addMenuCategoryBtn.addEventListener("click", () => {
    const next = state.config.menuCategories.length + 1;
    state.config.menuCategories.push(`Category ${next}`);
    renderMenuCategories();
    renderMenu();
    renderDashboard();
  });

  elements.addMenuBtn.addEventListener("click", () => {
    if (!state.config.menuCategories.length) {
      state.config.menuCategories.push("General");
      renderMenuCategories();
    }
    state.config.menu.push({
      id: "",
      name: "",
      type: state.config.menuCategories[0],
      price: 0,
      prep: 8
    });
    renderMenu();
    renderDashboard();
  });

  elements.addOfferBtn.addEventListener("click", () => {
    state.config.offers.push({
      id: "",
      title: "",
      badge: "",
      windowLabel: "Today",
      startsAt: "",
      endsAt: "",
      dealPrice: 0,
      image: "",
      cta: "Add Deal",
      priority: state.config.offers.length + 1,
      items: []
    });
    renderOffers();
    renderDashboard();
  });

  elements.exportJsonBtn.addEventListener("click", () => {
    elements.jsonEditor.value = JSON.stringify(state.config, null, 2);
    setStatus("Exported current configuration to JSON editor.");
  });

  elements.applyJsonBtn.addEventListener("click", () => {
    try {
      const parsed = JSON.parse(elements.jsonEditor.value);
      state.config = sanitizeConfig(parsed, state.defaults);
      renderAll();
      setStatus("JSON applied to editor state. Click Save to persist.", "success");
    } catch (error) {
      setStatus(`Invalid JSON: ${error.message}`, "error");
    }
  });

  elements.resetDefaultsBtn.addEventListener("click", () => {
    state.config = clone(state.defaults);
    renderAll();
    elements.jsonEditor.value = JSON.stringify(state.config, null, 2);
    setStatus("Reset to defaults. Click Save to persist.", "success");
  });

  elements.saveConfigBtn.addEventListener("click", saveConfiguration);
  elements.saveConfigBtnBottom.addEventListener("click", saveConfiguration);
}

function bindNavigation() {
  const titleMap = {
    dashboard: "Dashboard",
    restaurant: "Restaurant",
    tables: "Tables",
    kot: "KOT Config",
    menu: "Menu Items",
    offers: "Offers",
    json: "JSON Tools"
  };

  elements.navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const section = button.dataset.section;
      elements.navButtons.forEach((entry) => entry.classList.toggle("active", entry === button));
      elements.sectionPanels.forEach((panel) => {
        panel.classList.toggle("active", panel.id === `panel-${section}`);
      });
      elements.sectionTitle.textContent = titleMap[section] || "Admin";
    });
  });
}

function init() {
  renderAll();
  elements.jsonEditor.value = JSON.stringify(state.config, null, 2);
  bindNavigation();
  bindTopFields();
  bindTableEvents();
  bindMenuCategoryEvents();
  bindMenuEvents();
  bindOfferEvents();
  bindActions();
  setStatus("Ready. Edit fields and click Save Configuration.");
}

init();
