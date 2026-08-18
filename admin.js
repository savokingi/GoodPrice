/* ==========================================================================
   GoodPrice Telegram Mini App - Admin Control Panel Logic (Pure JS)
   ========================================================================== */

const adminState = {
  token: sessionStorage.getItem('adminToken') || '',
  products: []
};

// --- DOM Elements ---
const dom = {
  authOverlay: document.getElementById('auth-overlay'),
  passwordInput: document.getElementById('admin-password-input'),
  authSubmitBtn: document.getElementById('auth-submit-btn'),
  authError: document.getElementById('auth-error'),
  
  productList: document.getElementById('admin-product-list'),
  addProductForm: document.getElementById('add-product-form'),
  specsList: document.getElementById('form-specs-list'),
  addSpecFieldBtn: document.getElementById('add-spec-field-btn')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  if (adminState.token) {
    // Attempt to load products with current token
    loadAdminDashboard();
  } else {
    // Show auth overlay
    dom.authOverlay.style.display = 'flex';
  }
  
  setupAdminListeners();
});

// --- Event Listeners ---
function setupAdminListeners() {
  // Auth Form Submit
  dom.authSubmitBtn.addEventListener('click', handleAuth);
  dom.passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAuth();
  });
  
  // Dynamic Specifications fields adding
  dom.addSpecFieldBtn.addEventListener('click', addSpecificationRow);
  
  // Submit new product
  dom.addProductForm.addEventListener('submit', handleAddProduct);
}

// --- Auth Handling ---
async function handleAuth() {
  const password = dom.passwordInput.value;
  if (!password) return;
  
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    
    if (response.ok) {
      const data = await response.json();
      adminState.token = password; // Set password as the authorization token for simplicity
      sessionStorage.setItem('adminToken', password);
      
      // Animate out overlay
      dom.authOverlay.style.display = 'none';
      loadAdminDashboard();
    } else {
      showAuthError();
    }
  } catch (error) {
    console.error('Ошибка входа:', error);
    showAuthError();
  }
}

function showAuthError() {
  dom.authError.style.display = 'block';
  dom.passwordInput.value = '';
  dom.passwordInput.focus();
}

// --- Dashboard Loading ---
async function loadAdminDashboard() {
  dom.authOverlay.style.display = 'none';
  await fetchAdminProducts();
  renderAdminProducts();
  
  // Seed first blank spec rows
  dom.specsList.innerHTML = '';
  addSpecificationRow('Цвет', '');
  addSpecificationRow('Материал', '');
}

async function fetchAdminProducts() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('Failed to load products');
    adminState.products = await response.json();
  } catch (err) {
    console.error(err);
    alert('Ошибка при загрузке каталога товаров.');
  }
}

// --- Render Admin Dashboard ---
function renderAdminProducts() {
  dom.productList.innerHTML = '';
  
  if (adminState.products.length === 0) {
    dom.productList.innerHTML = `
      <p style="color: var(--text-muted); text-align: center; padding: 20px;">
        Каталог пуст. Добавьте первый товар справа!
      </p>
    `;
    return;
  }
  
  adminState.products.forEach(p => {
    const item = document.createElement('div');
    item.className = 'admin-product-item';
    
    item.innerHTML = `
      <img src="${p.image}" class="admin-product-img" alt="${p.name}">
      <div class="admin-product-info">
        <div class="admin-product-name">${p.name}</div>
        <div class="admin-product-meta">
          <strong>${p.price.toLocaleString('ru-RU')} ₽</strong> | 
          <span>Категория: ${p.categoryName}</span>
          ${p.popular ? ' | <span style="color: var(--primary); font-weight: 700;">Top</span>' : ''}
        </div>
      </div>
      <button class="delete-product-btn" onclick="deleteProduct(${p.id})" title="Удалить товар">
        <i data-lucide="trash-2"></i>
      </button>
    `;
    dom.productList.appendChild(item);
  });
  
  lucide.createIcons();
}

// --- Specification Row Management ---
function addSpecificationRow(defaultKey = '', defaultValue = '') {
  const row = document.createElement('div');
  row.className = 'form-spec-row';
  
  row.innerHTML = `
    <input type="text" class="form-control spec-key-input" placeholder="Характеристика (напр., Вес)" value="${defaultKey}" required style="height: 36px; padding: 0 8px; font-size: 13px;">
    <input type="text" class="form-control spec-val-input" placeholder="Значение (напр., 150 г)" value="${defaultValue}" required style="height: 36px; padding: 0 8px; font-size: 13px;">
    <button type="button" class="remove-spec-btn" onclick="removeSpecRow(this)">
      <i data-lucide="minus"></i>
    </button>
  `;
  
  dom.specsList.appendChild(row);
  lucide.createIcons();
}

function removeSpecRow(button) {
  const row = button.closest('.form-spec-row');
  if (row) {
    row.remove();
  }
}

// --- Delete Product Action ---
async function deleteProduct(id) {
  if (!confirm('Вы действительно хотите удалить этот товар?')) return;
  
  try {
    const response = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminState.token}`
      }
    });
    
    if (response.ok) {
      // Reload products
      await loadAdminDashboard();
    } else {
      const errorMsg = await response.text();
      alert(`Ошибка при удалении: ${errorMsg}`);
    }
  } catch (error) {
    console.error('Ошибка сети при удалении:', error);
    alert('Сетевая ошибка при удалении товара.');
  }
}

// --- Add New Product Action ---
async function handleAddProduct(e) {
  e.preventDefault();
  
  const name = document.getElementById('p-name').value;
  const category = document.getElementById('p-category').value;
  const price = parseFloat(document.getElementById('p-price').value);
  const image = document.getElementById('p-image').value;
  const description = document.getElementById('p-description').value;
  const popular = document.getElementById('p-popular').checked;
  
  // Format human category name
  let categoryName = 'Электроника';
  if (category === 'accessories') categoryName = 'Аксессуары';
  if (category === 'home') categoryName = 'Дом';
  
  // Compile Specifications Object
  const specs = {};
  const specRows = dom.specsList.querySelectorAll('.form-spec-row');
  specRows.forEach(row => {
    const key = row.querySelector('.spec-key-input').value.trim();
    const val = row.querySelector('.spec-val-input').value.trim();
    if (key && val) {
      specs[key] = val;
    }
  });
  
  const productData = {
    name,
    category,
    categoryName,
    price,
    image,
    description,
    popular,
    specs
  };
  
  try {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminState.token}`
      },
      body: JSON.stringify(productData)
    });
    
    if (response.ok) {
      alert('Товар успешно добавлен!');
      dom.addProductForm.reset();
      
      // Reload list
      await loadAdminDashboard();
    } else {
      const errorMsg = await response.text();
      alert(`Не удалось добавить товар: ${errorMsg}`);
    }
  } catch (error) {
    console.error('Ошибка сети при добавлении:', error);
    alert('Сетевая ошибка при добавлении товара.');
  }
}
