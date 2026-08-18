/* ==========================================================================
   GoodPrice Telegram Mini App - Frontend Logic (Pure JS)
   ========================================================================== */

// --- App State ---
const state = {
  products: [],
  filteredProducts: [],
  cart: {}, // Format: { productId: quantity }
  filters: {
    search: '',
    category: 'all',
    sortBy: 'default',
    priceMin: null,
    priceMax: null,
    popularOnly: false
  }
};

// --- Telegram WebApp Integration (with safety fallback for browser testing) ---
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  // Enable native BackButton and MainButton for cart and modals
}

// Trigger haptic feedback safely
function triggerHaptic(style = 'light') {
  if (tg && tg.HapticFeedback) {
    try {
      if (style === 'light' || style === 'medium' || style === 'heavy') {
        tg.HapticFeedback.impactOccurred(style);
      } else if (style === 'success') {
        tg.HapticFeedback.notificationOccurred('success');
      } else if (style === 'warning') {
        tg.HapticFeedback.notificationOccurred('warning');
      }
    } catch (e) {
      console.warn("Haptic failed", e);
    }
  }
}

// --- DOM Elements Cache ---
const elements = {
  productsGrid: document.getElementById('products-grid'),
  emptyState: document.getElementById('empty-state'),
  searchInput: document.getElementById('search-input'),
  searchClearBtn: document.getElementById('search-clear-btn'),
  filterTriggerBtn: document.getElementById('filter-trigger-btn'),
  filterBadge: document.getElementById('filter-badge'),
  categoriesContainer: document.getElementById('categories-container'),
  activeFiltersSummary: document.getElementById('active-filters-summary'),
  resetFiltersShortcut: document.getElementById('reset-filters-shortcut'),
  emptyResetBtn: document.getElementById('empty-reset-btn'),
  adminShortcutBtn: document.getElementById('admin-shortcut-btn'),
  
  // Cart elements
  cartBar: document.getElementById('cart-bar'),
  cartBadge: document.getElementById('cart-badge'),
  cartTotalValue: document.getElementById('cart-total-value'),
  cartActionBtn: document.getElementById('cart-action-btn'),
  
  // Filter Drawer
  filterSheet: document.getElementById('filter-sheet'),
  filterBackdrop: document.getElementById('filter-backdrop'),
  filterCloseBtn: document.getElementById('filter-close-btn'),
  filterApplyBtn: document.getElementById('filter-apply-btn'),
  filterResetBtn: document.getElementById('filter-reset-btn'),
  priceMinInput: document.getElementById('price-min'),
  priceMaxInput: document.getElementById('price-max'),
  popularCheckbox: document.getElementById('filter-popular'),
  
  // Product Detail Drawer
  productSheet: document.getElementById('product-sheet'),
  productBackdrop: document.getElementById('product-backdrop'),
  productCloseBtn: document.getElementById('product-close-btn'),
  detailCategoryBadge: document.getElementById('detail-category-badge'),
  detailProductImage: document.getElementById('detail-product-image'),
  detailPopularTag: document.getElementById('detail-popular-tag'),
  detailProductTitle: document.getElementById('detail-product-title'),
  detailProductRating: document.getElementById('detail-product-rating'),
  detailProductDesc: document.getElementById('detail-product-desc'),
  detailSpecsGrid: document.getElementById('detail-specs-grid'),
  detailProductPrice: document.getElementById('detail-product-price'),
  detailQuantitySelector: document.getElementById('detail-quantity-selector'),
  qtyMinusBtn: document.getElementById('qty-minus-btn'),
  qtyCurrentValue: document.getElementById('qty-current-value'),
  qtyPlusBtn: document.getElementById('qty-plus-btn'),
  detailAddToCartBtn: document.getElementById('detail-add-to-cart-btn')
};

// Currently viewed product id inside the detail sheet
let activeDetailProductId = null;

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
  fetchProducts();
  setupEventListeners();
});

// --- API Calls ---
async function fetchProducts() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('Network error');
    state.products = await response.json();
    state.filteredProducts = [...state.products];
    renderProducts();
  } catch (error) {
    console.error('Ошибка загрузки товаров:', error);
    // Fallback Mock database in case server isn't run correctly or connection fails
    fallbackMockProducts();
  }
}

function fallbackMockProducts() {
  // Use products directly if offline
  state.products = [
    {
      "id": 1,
      "name": "Беспроводные наушники ClearSound Max",
      "category": "electronics",
      "categoryName": "Электроника",
      "price": 12900,
      "description": "Минималистичные накладные наушники с активным шумоподавлением, студийным качеством звука и временем работы до 40 часов.",
      "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600",
      "rating": 4.8,
      "popular": true,
      "specs": { "Цвет": "Космический серый", "Подключение": "Bluetooth 5.2", "Время работы": "До 40 ч" }
    },
    {
      "id": 2,
      "name": "Умные часы Chronos Lite",
      "category": "electronics",
      "categoryName": "Электроника",
      "price": 8500,
      "description": "Элегантные смарт-часы с AMOLED-экраном, мониторингом здоровья 24/7 и влагозащитой IP68.",
      "image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600",
      "rating": 4.6,
      "popular": false,
      "specs": { "Цвет": "Черный матовый", "Экран": "AMOLED 1.43\"", "Влагозащита": "IP68" }
    },
    {
      "id": 3,
      "name": "Кожаный рюкзак Nomad Slim",
      "category": "accessories",
      "categoryName": "Аксессуары",
      "price": 14200,
      "description": "Ультратонкий городской рюкзак из натуральной кожи. Отделение для ноутбука до 15.6\".",
      "image": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=600",
      "rating": 4.9,
      "popular": true,
      "specs": { "Материал": "Натуральная кожа", "Объем": "15 литров", "Цвет": "Шоколадный" }
    },
    {
      "id": 4,
      "name": "Аромадиффузор Aura Wave",
      "category": "home",
      "categoryName": "Дом",
      "price": 3800,
      "description": "Ультразвуковой диффузор с мягкой LED-подсветкой и функцией холодного тумана.",
      "image": "https://images.unsplash.com/photo-1602928321679-560bb453f190?auto=format&fit=crop&q=80&w=600",
      "rating": 4.7,
      "popular": true,
      "specs": { "Объем": "300 мл", "Материал": "Керамика / Дерево" }
    }
  ];
  state.filteredProducts = [...state.products];
  renderProducts();
}

// --- Rendering Logic ---
function renderProducts() {
  elements.productsGrid.innerHTML = '';
  
  if (state.filteredProducts.length === 0) {
    elements.productsGrid.style.display = 'none';
    elements.emptyState.style.display = 'flex';
    return;
  }
  
  elements.productsGrid.style.display = 'grid';
  elements.emptyState.style.display = 'none';
  
  state.filteredProducts.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.id = product.id;
    
    const qtyInCart = state.cart[product.id] || 0;
    
    // Build specs HTML snippet
    const popularTag = product.popular ? `<span class="popular-badge">Top</span>` : '';
    
    card.innerHTML = `
      <div class="card-img-wrapper">
        ${popularTag}
        <img src="${product.image}" alt="${product.name}" loading="lazy">

      </div>
      <div class="card-body">
        <span class="card-category">${product.categoryName}</span>
        <h3 class="card-title">${product.name}</h3>
        <div class="card-footer">
          <span class="card-price">${formatPrice(product.price)}</span>
          <div class="action-btn-container" data-id="${product.id}">
            ${qtyInCart > 0 ? `
              <div class="card-qty-control">
                <button class="card-qty-btn qty-minus" onclick="event.stopPropagation(); changeQuantity(${product.id}, -1)">
                  <i data-lucide="minus"></i>
                </button>
                <span class="card-qty-value">${qtyInCart}</span>
                <button class="card-qty-btn qty-plus" onclick="event.stopPropagation(); changeQuantity(${product.id}, 1)">
                  <i data-lucide="plus"></i>
                </button>
              </div>
            ` : `
              <button class="add-btn" onclick="event.stopPropagation(); addToCart(${product.id})">
                <i data-lucide="plus"></i>
              </button>
            `}
          </div>
        </div>
      </div>
    `;
    
    // Add click event for details
    card.addEventListener('click', () => openProductDetail(product.id));
    elements.productsGrid.appendChild(card);
  });
  
  // Re-render lucide icons inside dynamically created cards
  lucide.createIcons();
}

function formatPrice(num) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(num);
}

// --- Cart Operations ---
function addToCart(productId) {
  triggerHaptic('light');
  state.cart[productId] = 1;
  updateCartUI();
  renderProducts();
}

function changeQuantity(productId, amount) {
  triggerHaptic('light');
  const currentQty = state.cart[productId] || 0;
  const newQty = currentQty + amount;
  
  if (newQty <= 0) {
    delete state.cart[productId];
  } else {
    state.cart[productId] = newQty;
  }
  
  updateCartUI();
  renderProducts();
  
  // If product detail is open for this product, sync it
  if (activeDetailProductId === productId) {
    updateProductDetailQty(productId);
  }
}

function updateCartUI() {
  let totalCount = 0;
  let totalPrice = 0;
  
  Object.keys(state.cart).forEach(id => {
    const count = state.cart[id];
    const product = state.products.find(p => p.id === parseInt(id));
    if (product) {
      totalCount += count;
      totalPrice += product.price * count;
    }
  });
  
  if (totalCount > 0) {
    elements.cartBadge.innerText = totalCount;
    elements.cartTotalValue.innerText = formatPrice(totalPrice);
    elements.cartBar.classList.add('visible');
    
    // Integrate with native Telegram MainButton if wanted
    if (tg) {
      tg.MainButton.setText(`Оформить заказ на ${formatPrice(totalPrice)}`);
      tg.MainButton.show();
      tg.MainButton.enable();
    }
  } else {
    elements.cartBar.classList.remove('visible');
    if (tg) {
      tg.MainButton.hide();
    }
  }
}

// --- Detail Bottom Sheet Logic ---
function openProductDetail(productId) {
  triggerHaptic('medium');
  activeDetailProductId = productId;
  const product = state.products.find(p => p.id === productId);
  if (!product) return;
  
  elements.detailCategoryBadge.innerText = product.categoryName;
  elements.detailProductImage.src = product.image;
  elements.detailProductImage.alt = product.name;
  elements.detailPopularTag.style.display = product.popular ? 'block' : 'none';
  elements.detailProductTitle.innerText = product.name;

  elements.detailProductDesc.innerText = product.description;
  
  // Specs rendering
  elements.detailSpecsGrid.innerHTML = '';
  if (product.specs) {
    Object.keys(product.specs).forEach(label => {
      const specRow = document.createElement('div');
      specRow.className = 'spec-item';
      specRow.innerHTML = `
        <span class="spec-label">${label}</span>
        <span class="spec-value">${product.specs[label]}</span>
      `;
      elements.detailSpecsGrid.appendChild(specRow);
    });
  }
  
  elements.detailProductPrice.innerText = formatPrice(product.price);
  
  updateProductDetailQty(productId);
  
  elements.productSheet.classList.add('open');
  document.body.style.overflow = 'hidden'; // block page scroll
  
  if (tg) {
    tg.BackButton.show();
  }
}

function updateProductDetailQty(productId) {
  const qty = state.cart[productId] || 0;
  if (qty > 0) {
    elements.qtyCurrentValue.innerText = qty;
    elements.detailQuantitySelector.style.display = 'flex';
    elements.detailAddToCartBtn.style.display = 'none';
  } else {
    elements.detailQuantitySelector.style.display = 'none';
    elements.detailAddToCartBtn.style.display = 'inline-flex';
  }
}

function closeProductDetail() {
  elements.productSheet.classList.remove('open');
  activeDetailProductId = null;
  
  // Only restore scroll if no other bottom sheets are open
  if (!elements.filterSheet.classList.contains('open')) {
    document.body.style.overflow = '';
  }
  
  if (tg) {
    tg.BackButton.hide();
  }
}

// --- Search & Filter Advanced Drawers ---
function openFilterSheet() {
  triggerHaptic('medium');
  
  // Load current values into form inputs
  elements.priceMinInput.value = state.filters.priceMin || '';
  elements.priceMaxInput.value = state.filters.priceMax || '';
  elements.popularCheckbox.checked = state.filters.popularOnly;
  
  const sortRadio = document.querySelector(`input[name="sort-by"][value="${state.filters.sortBy}"]`);
  if (sortRadio) sortRadio.checked = true;
  
  elements.filterSheet.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeFilterSheet() {
  elements.filterSheet.classList.remove('open');
  // Only restore scroll if no other bottom sheets are open
  if (!elements.productSheet.classList.contains('open')) {
    document.body.style.overflow = '';
  }
}

function applyFilters() {
  triggerHaptic('success');
  
  // Save drawer values into state
  const minVal = parseInt(elements.priceMinInput.value);
  const maxVal = parseInt(elements.priceMaxInput.value);
  
  state.filters.priceMin = !isNaN(minVal) ? minVal : null;
  state.filters.priceMax = !isNaN(maxVal) ? maxVal : null;
  state.filters.popularOnly = elements.popularCheckbox.checked;
  
  const selectedSort = document.querySelector('input[name="sort-by"]:checked');
  state.filters.sortBy = selectedSort ? selectedSort.value : 'default';
  
  closeFilterSheet();
  processFiltering();
}

function resetFilters() {
  triggerHaptic('warning');
  state.filters.priceMin = null;
  state.filters.priceMax = null;
  state.filters.popularOnly = false;
  state.filters.sortBy = 'default';
  state.filters.category = 'all';
  state.filters.search = '';
  
  // Reset form inputs
  elements.priceMinInput.value = '';
  elements.priceMaxInput.value = '';
  elements.popularCheckbox.checked = false;
  elements.searchInput.value = '';
  elements.searchClearBtn.style.display = 'none';
  
  const defaultSort = document.querySelector('input[name="sort-by"][value="default"]');
  if (defaultSort) defaultSort.checked = true;
  
  // Reset category chips
  document.querySelectorAll('.category-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.category === 'all');
  });
  
  closeFilterSheet();
  processFiltering();
}

// --- Core Filter and Sort processing algorithm ---
function processFiltering() {
  let list = [...state.products];
  let activeFiltersCount = 0;
  
  // 1. Search Filter
  if (state.filters.search.trim() !== '') {
    const q = state.filters.search.toLowerCase().trim();
    list = list.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.description.toLowerCase().includes(q) ||
      (p.categoryName && p.categoryName.toLowerCase().includes(q))
    );
  }
  
  // 2. Category Filter
  if (state.filters.category !== 'all') {
    list = list.filter(p => p.category === state.filters.category);
    activeFiltersCount++;
  }
  
  // 3. Price Filter
  if (state.filters.priceMin !== null) {
    list = list.filter(p => p.price >= state.filters.priceMin);
    activeFiltersCount++;
  }
  if (state.filters.priceMax !== null) {
    list = list.filter(p => p.price <= state.filters.priceMax);
    activeFiltersCount++;
  }
  
  // 4. Popular check
  if (state.filters.popularOnly) {
    list = list.filter(p => p.popular === true);
    activeFiltersCount++;
  }
  
  // 5. Sorting
  if (state.filters.sortBy === 'price-asc') {
    list.sort((a, b) => a.price - b.price);
    activeFiltersCount++;
  } else if (state.filters.sortBy === 'price-desc') {
    list.sort((a, b) => b.price - a.price);
    activeFiltersCount++;
  } else if (state.filters.sortBy === 'rating-desc') {
    list.sort((a, b) => b.rating - a.rating);
    activeFiltersCount++;
  }
  
  state.filteredProducts = list;
  renderProducts();
  
  // Update UI notifications
  if (activeFiltersCount > 0) {
    elements.filterBadge.style.display = 'block';
    elements.activeFiltersSummary.style.display = 'flex';
  } else {
    elements.filterBadge.style.display = 'none';
    elements.activeFiltersSummary.style.display = 'none';
  }
}

// --- Event Listeners binding ---
function setupEventListeners() {
  // Category tabs click
  elements.categoriesContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.category-chip');
    if (!chip) return;
    
    triggerHaptic('light');
    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    
    state.filters.category = chip.dataset.category;
    processFiltering();
  });
  
  // Search actions
  elements.searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    state.filters.search = val;
    elements.searchClearBtn.style.display = val.length > 0 ? 'flex' : 'none';
    processFiltering();
  });
  
  elements.searchClearBtn.addEventListener('click', () => {
    triggerHaptic('light');
    elements.searchInput.value = '';
    state.filters.search = '';
    elements.searchClearBtn.style.display = 'none';
    processFiltering();
    elements.searchInput.focus();
  });
  
  // Filter drawers actions
  elements.filterTriggerBtn.addEventListener('click', openFilterSheet);
  elements.filterCloseBtn.addEventListener('click', closeFilterSheet);
  elements.filterBackdrop.addEventListener('click', closeFilterSheet);
  elements.filterApplyBtn.addEventListener('click', applyFilters);
  elements.filterResetBtn.addEventListener('click', resetFilters);
  
  // Product detailed sheet actions
  elements.productCloseBtn.addEventListener('click', closeProductDetail);
  elements.productBackdrop.addEventListener('click', closeProductDetail);
  
  elements.qtyMinusBtn.addEventListener('click', () => {
    if (activeDetailProductId) {
      changeQuantity(activeDetailProductId, -1);
    }
  });
  
  elements.qtyPlusBtn.addEventListener('click', () => {
    if (activeDetailProductId) {
      changeQuantity(activeDetailProductId, 1);
    }
  });
  
  elements.detailAddToCartBtn.addEventListener('click', () => {
    if (activeDetailProductId) {
      addToCart(activeDetailProductId);
    }
  });
  
  // Reset shortcuts
  elements.resetFiltersShortcut.addEventListener('click', resetFilters);
  elements.emptyResetBtn.addEventListener('click', resetFilters);
  
  // Telegram native BackButton hook
  if (tg) {
    tg.onEvent('backButtonClicked', () => {
      if (elements.productSheet.classList.contains('open')) {
        closeProductDetail();
      }
    });
    
    tg.onEvent('mainButtonClicked', () => {
      triggerHaptic('success');
      // Cart checkout action
      checkoutOrder();
    });
  }
  
  // Browser bottom action bar click fallback
  elements.cartActionBtn.addEventListener('click', checkoutOrder);

  // Administration panel shortcut redirect (just a placeholder alert or URL redirect for now)
  elements.adminShortcutBtn.addEventListener('click', () => {
    triggerHaptic('medium');
    window.location.href = '/admin';
  });
}

// --- Cart Checkout Action ---
function checkoutOrder() {
  let cartDetails = [];
  let totalSum = 0;
  
  Object.keys(state.cart).forEach(id => {
    const count = state.cart[id];
    const product = state.products.find(p => p.id === parseInt(id));
    if (product) {
      cartDetails.push({
        name: product.name,
        qty: count,
        price: product.price,
        sum: product.price * count
      });
      totalSum += product.price * count;
    }
  });
  
  if (cartDetails.length === 0) return;
  
  // Format check summary
  let message = `🛒 *Заказ GoodPrice*\n\n`;
  cartDetails.forEach((item, index) => {
    message += `${index + 1}. *${item.name}* x${item.qty}\n   └ ${formatPrice(item.price)} × ${item.qty} = *${formatPrice(item.sum)}*\n`;
  });
  message += `\n💵 *Итого:* *${formatPrice(totalSum)}*`;
  
  if (tg) {
    // Send data to Telegram Bot parent conversation
    try {
      tg.sendData(JSON.stringify({
        type: 'checkout',
        cart: state.cart,
        total: totalSum,
        message: message
      }));
      tg.close();
    } catch(err) {
      alert("Заказ оформлен! В Telegram WebApp отправлены данные. Итого: " + formatPrice(totalSum));
    }
  } else {
    alert("Заказ успешно имитирован!\n\n" + message.replace(/\*/g, ''));
  }
}
