// URL da API (configure com a URL do Render em produção)
const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : 'https://victor-farma.onrender.com/api';

let currentSection = 'dashboard';
let allProducts = [];
let allOrders = [];

// Elementos DOM
const navBtns = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.section');
const productModal = document.getElementById('product-modal');
const productForm = document.getElementById('product-form');
const orderModal = document.getElementById('order-modal');
const productSearchInput = document.getElementById('product-search');
const orderStatusFilter = document.getElementById('order-status-filter');

// Event Listeners
navBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    const sectionName = e.target.dataset.section;
    switchSection(sectionName);
  });
});

productForm.addEventListener('submit', handleSaveProduct);

document.querySelectorAll('.close-modal').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const modal = e.target.closest('.modal');
    modal.classList.add('hidden');
  });
});

document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });
});

productSearchInput.addEventListener('input', filterProducts);
orderStatusFilter.addEventListener('change', filterOrders);

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  updateClock();
  setInterval(updateClock, 1000);
  loadDashboard();
});

// Trocar seção
function switchSection(sectionName) {
  currentSection = sectionName;

  // Atualizar nav
  navBtns.forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.section === sectionName) {
      btn.classList.add('active');
    }
  });

  // Mostrar seção
  sections.forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(`${sectionName}-section`).classList.add('active');

  // Carregar dados
  switch (sectionName) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'products':
      loadProducts();
      break;
    case 'orders':
      loadOrders();
      break;
    case 'reports':
      loadReports();
      break;
  }
}

// Atualizar relógio
function updateClock() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('pt-BR');
  document.getElementById('current-time').textContent = timeString;
}

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const response = await fetch(`${API_URL}/admin/dashboard`);
    const data = await response.json();

    document.getElementById('total-orders').textContent = data.totalOrders;
    document.getElementById('total-revenue').textContent = `R$ ${parseFloat(data.totalRevenue).toFixed(2)}`;
    document.getElementById('total-products').textContent = data.totalProducts;

    const lowStockList = document.getElementById('low-stock-list');
    if (data.lowStockProducts.length === 0) {
      lowStockList.innerHTML = '<p>Todos os produtos têm estoque suficiente</p>';
    } else {
      lowStockList.innerHTML = data.lowStockProducts.map(product => `
        <div class="low-stock-item">
          <span>${product.name}</span>
          <span>${product.stock} unidades</span>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
  }
}

// ===== PRODUTOS =====
async function loadProducts() {
  try {
    const response = await fetch(`${API_URL}/products`);
    allProducts = await response.json();
    displayProducts(allProducts);
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    document.getElementById('products-tbody').innerHTML = '<tr><td colspan="6" class="loading">Erro ao carregar produtos</td></tr>';
  }
}

function displayProducts(products) {
  const tbody = document.getElementById('products-tbody');
  
  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading">Nenhum produto encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = products.map(product => `
    <tr>
      <td>${product.name}</td>
      <td>${product.description || '-'}</td>
      <td>R$ ${parseFloat(product.price).toFixed(2)}</td>
      <td>${product.stock}</td>
      <td>${product.category || '-'}</td>
      <td class="actions">
        <button class="action-btn edit btn-sm" onclick="openEditProductModal('${product.id}')">Editar</button>
        <button class="action-btn delete btn-sm" onclick="deleteProduct('${product.id}')">Deletar</button>
      </td>
    </tr>
  `).join('');
}

function filterProducts() {
  const searchTerm = productSearchInput.value.toLowerCase();
  const filtered = allProducts.filter(product => 
    product.name.toLowerCase().includes(searchTerm) ||
    (product.description && product.description.toLowerCase().includes(searchTerm))
  );
  displayProducts(filtered);
}

function openAddProductModal() {
  document.getElementById('product-id').value = '';
  document.getElementById('product-modal-title').textContent = 'Novo Produto';
  document.getElementById('product-form').reset();
  productModal.classList.remove('hidden');
}

function openEditProductModal(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  document.getElementById('product-modal-title').textContent = 'Editar Produto';
  document.getElementById('product-id').value = product.id;
  document.getElementById('product-name').value = product.name;
  document.getElementById('product-description').value = product.description || '';
  document.getElementById('product-price').value = product.price;
  document.getElementById('product-stock').value = product.stock;
  document.getElementById('product-category').value = product.category || '';
  document.getElementById('product-image').value = product.image_url || '';

  productModal.classList.remove('hidden');
}

function closeProductModal() {
  productModal.classList.add('hidden');
}

async function handleSaveProduct(e) {
  e.preventDefault();

  const productId = document.getElementById('product-id').value;
  const data = {
    name: document.getElementById('product-name').value,
    description: document.getElementById('product-description').value,
    price: parseFloat(document.getElementById('product-price').value),
    stock: parseInt(document.getElementById('product-stock').value),
    category: document.getElementById('product-category').value || null,
    image_url: document.getElementById('product-image').value || null
  };

  try {
    let response;
    if (productId) {
      // Editar
      response = await fetch(`${API_URL}/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      // Criar
      response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }

    if (!response.ok) {
      alert('Erro ao salvar produto');
      return;
    }

    closeProductModal();
    loadProducts();
    alert('Produto salvo com sucesso!');
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao salvar produto');
  }
}

async function deleteProduct(productId) {
  if (!confirm('Tem certeza que deseja deletar este produto?')) return;

  try {
    const response = await fetch(`${API_URL}/products/${productId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      alert('Erro ao deletar produto');
      return;
    }

    loadProducts();
    alert('Produto deletado com sucesso!');
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao deletar produto');
  }
}

// ===== PEDIDOS =====
async function loadOrders() {
  try {
    const response = await fetch(`${API_URL}/admin/orders`);
    allOrders = await response.json();
    displayOrders(allOrders);
  } catch (error) {
    console.error('Erro ao carregar pedidos:', error);
    document.getElementById('orders-tbody').innerHTML = '<tr><td colspan="7" class="loading">Erro ao carregar pedidos</td></tr>';
  }
}

function displayOrders(orders) {
  const tbody = document.getElementById('orders-tbody');
  
  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading">Nenhum pedido encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map(order => {
    const date = new Date(order.created_at).toLocaleDateString('pt-BR');
    return `
      <tr>
        <td>${order.id.substring(0, 8)}...</td>
        <td>${order.customer_name}</td>
        <td>${order.customer_phone}</td>
        <td>R$ ${parseFloat(order.total).toFixed(2)}</td>
        <td><span class="status-badge ${order.status}">${getStatusLabel(order.status)}</span></td>
        <td>${date}</td>
        <td class="actions">
          <button class="action-btn view btn-sm" onclick="openOrderModal('${order.id}')">Ver</button>
          <button class="action-btn update-status btn-sm" onclick="openStatusModal('${order.id}')">Atualizar</button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterOrders() {
  const status = orderStatusFilter.value;
  const filtered = status ? allOrders.filter(o => o.status === status) : allOrders;
  displayOrders(filtered);
}

function getStatusLabel(status) {
  const labels = {
    'pending': 'Pendente',
    'confirmed': 'Confirmado',
    'preparing': 'Preparando',
    'out_for_delivery': 'Em entrega',
    'delivered': 'Entregue',
    'cancelled': 'Cancelado'
  };
  return labels[status] || status;
}

async function openOrderModal(orderId) {
  try {
    const response = await fetch(`${API_URL}/admin/orders/${orderId}`);
    const data = await response.json();
    const order = data.order;
    const items = data.items;

    const content = document.getElementById('order-modal-content');
    const date = new Date(order.created_at).toLocaleDateString('pt-BR');

    content.innerHTML = `
      <div class="order-info">
        <div class="order-info-item">
          <div class="order-info-label">ID do Pedido</div>
          <div class="order-info-value">${order.id}</div>
        </div>
        <div class="order-info-item">
          <div class="order-info-label">Cliente</div>
          <div class="order-info-value">${order.customer_name}</div>
        </div>
        <div class="order-info-item">
          <div class="order-info-label">Telefone</div>
          <div class="order-info-value">${order.customer_phone}</div>
        </div>
        <div class="order-info-item">
          <div class="order-info-label">Data</div>
          <div class="order-info-value">${date}</div>
        </div>
        <div class="order-info-item">
          <div class="order-info-label">Status</div>
          <div class="order-info-value"><span class="status-badge ${order.status}">${getStatusLabel(order.status)}</span></div>
        </div>
        <div class="order-info-item">
          <div class="order-info-label">Total</div>
          <div class="order-info-value">R$ ${parseFloat(order.total).toFixed(2)}</div>
        </div>
      </div>

      <h4>Itens do Pedido</h4>
      <table class="order-items-table">
        <thead>
          <tr>
            <th>Produto</th>
            <th>Quantidade</th>
            <th>Preço Unit.</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td>R$ ${parseFloat(item.price).toFixed(2)}</td>
              <td>R$ ${(item.quantity * item.price).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div>
        <strong>Endereço de Entrega:</strong>
        <p>${order.delivery_address}</p>
      </div>

      <div class="status-selector">
        <select id="new-status" value="${order.status}">
          <option value="pending">Pendente</option>
          <option value="confirmed">Confirmado</option>
          <option value="preparing">Preparando</option>
          <option value="out_for_delivery">Em entrega</option>
          <option value="delivered">Entregue</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <button class="btn btn-primary" onclick="updateOrderStatus('${orderId}')">Atualizar Status</button>
      </div>
    `;

    orderModal.classList.remove('hidden');
  } catch (error) {
    console.error('Erro ao carregar pedido:', error);
    alert('Erro ao carregar detalhes do pedido');
  }
}

async function updateOrderStatus(orderId) {
  const newStatus = document.getElementById('new-status').value;

  try {
    const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    if (!response.ok) {
      alert('Erro ao atualizar status');
      return;
    }

    orderModal.classList.add('hidden');
    loadOrders();
    alert('Status atualizado com sucesso!');
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao atualizar status');
  }
}

// ===== RELATÓRIOS =====
async function loadReports() {
  try {
    const [salesResponse, topProductsResponse] = await Promise.all([
      fetch(`${API_URL}/admin/reports/sales`),
      fetch(`${API_URL}/admin/reports/top-products`)
    ]);

    const salesData = await salesResponse.json();
    const topProductsData = await topProductsResponse.json();

    displaySalesReport(salesData);
    displayTopProducts(topProductsData);
  } catch (error) {
    console.error('Erro ao carregar relatórios:', error);
  }
}

function displaySalesReport(sales) {
  const reportDiv = document.getElementById('sales-report');
  
  if (sales.length === 0) {
    reportDiv.innerHTML = '<p>Nenhuma venda nos últimos 30 dias</p>';
    return;
  }

  reportDiv.innerHTML = sales.map(sale => {
    const date = new Date(sale.date).toLocaleDateString('pt-BR');
    return `
      <div class="report-item">
        <div class="report-item-label">
          <strong>${date}</strong>: ${sale.orders} pedidos
        </div>
        <div class="report-item-value">R$ ${parseFloat(sale.revenue).toFixed(2)}</div>
      </div>
    `;
  }).join('');
}

function displayTopProducts(topProducts) {
  const reportDiv = document.getElementById('top-products');
  
  if (topProducts.length === 0) {
    reportDiv.innerHTML = '<p>Nenhum produto vendido</p>';
    return;
  }

  reportDiv.innerHTML = topProducts.map(product => `
    <div class="report-item">
      <div class="report-item-label">
        <strong>${product.name}</strong>: ${product.total_sold} unidades vendidas
      </div>
      <div class="report-item-value">${product.times_sold} pedidos</div>
    </div>
  `).join('');
}
