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

// Admin toast util
function showAdminToast(message, type = 'success') {
  try {
    const wrapper = document.getElementById('admin-toast');
    const msg = document.getElementById('admin-toast-message');
    const icon = document.getElementById('admin-toast-icon');
    const ok = document.getElementById('admin-toast-ok');
    if (!wrapper || !msg || !ok) return alert(message);

    msg.textContent = message;
    // estilo pelo tipo
    const card = document.getElementById('admin-toast-card');
    if (type === 'success') {
      card.classList.remove('bg-red-600');
      card.classList.add('bg-gray-900');
    } else if (type === 'error') {
      card.classList.remove('bg-gray-900');
      card.classList.add('bg-red-600');
    }

    wrapper.classList.remove('hidden');
    // foco no botão OK
    ok.focus();

    const hide = () => { wrapper.classList.add('hidden'); };
    ok.onclick = hide;

    // auto-dismiss after 5s
    clearTimeout(wrapper._dismissTimeout);
    wrapper._dismissTimeout = setTimeout(hide, 5000);
  } catch (e) {
    console.error('Erro showAdminToast:', e);
    alert(message);
  }
}

// Event Listeners
navBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    const sectionName = e.currentTarget ? e.currentTarget.dataset.section : btn.dataset.section;
    if (!sectionName) return;
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

  // Mostrar seção com transição: usar style.display + classes active/inactive
  sections.forEach(section => {
    const el = section;
    // esconder imediatamente
    el.style.display = 'none';
    el.classList.remove('active');
    el.classList.add('inactive');
    // garantir que a classe hidden do Tailwind esteja aplicada
    if (!el.classList.contains('hidden')) el.classList.add('hidden');
  });

  const target = document.getElementById(`${sectionName}-section`);
  if (target) {
    // remover a classe hidden do Tailwind para permitir exibição
    if (target.classList.contains('hidden')) target.classList.remove('hidden');
    // preparar para animação
    target.style.display = '';
    // forçar reflow antes de trocar classes para disparar a transição
    void target.offsetWidth;
    target.classList.remove('inactive');
    target.classList.add('active');
  }

  // Atualizar estilo visual dos botões (bg e texto)
  navBtns.forEach(btn => {
    btn.classList.remove('bg-green-500', 'text-white');
    if (btn.dataset.section === sectionName) {
      btn.classList.add('bg-green-500', 'text-white');
    }
  });

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
      lowStockList.innerHTML = '<p class="text-center text-gray-500 py-4">Todos os produtos têm estoque suficiente</p>';
    } else {
      lowStockList.innerHTML = data.lowStockProducts.map(product => `
        <div class="flex justify-between items-center p-3 bg-red-50 border-l-4 border-red-600 rounded">
          <span class="font-semibold text-gray-800">${product.name}</span>
          <span class="px-3 py-1 bg-red-600 text-white text-sm rounded font-bold">${product.stock} unidades</span>
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
    tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">Nenhum produto encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = products.map(product => `
    <tr class="border-b border-gray-300 hover:bg-gray-50 text-sm">
      <td class="px-6 py-4 font-medium text-gray-900">${product.name}</td>
      <td class="px-6 py-4 text-gray-600 truncate">${product.description || '-'}</td>
      <td class="px-6 py-4 font-bold text-red-600">R$ ${parseFloat(product.price).toFixed(2)}</td>
      <td class="px-6 py-4 text-gray-700">${product.stock}</td>
      <td class="px-6 py-4 text-gray-600">${product.category || '-'}</td>
      <td class="px-6 py-4 flex gap-2">
        <button class="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded font-semibold transition-colors" onclick="openEditProductModal('${product.id}')">Editar</button>
        <button class="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs rounded font-semibold transition-colors" onclick="debugDeleteProduct('${product.id}')" title="Diagnosticar antes de deletar">🔍</button>
        <button class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded font-semibold transition-colors" onclick="deleteProduct('${product.id}')">Deletar</button>
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
      showAdminToast('Erro ao salvar produto', 'error');
      return;
    }

    closeProductModal();
    loadProducts();
    showAdminToast('Produto salvo com sucesso!', 'success');
  } catch (error) {
    console.error('Erro:', error);
    showAdminToast('Erro ao salvar produto', 'error');
  }
}

async function debugDeleteProduct(productId) {
  try {
    console.log(`🔍 Diagnosticando produto: ${productId}`);
    
    const response = await fetch(`${API_URL}/products/debug/info/${productId}`);
    const data = await response.json();
    
    console.group('📊 Diagnóstico de Deletamento');
    console.log('Produto encontrado:', data.product ? '✅ SIM' : '❌ NÃO');
    if (data.product) {
      console.log('  ID:', data.product.id);
      console.log('  Nome:', data.product.name);
      console.log('  Criado em:', data.product.created_at);
    }
    console.log('Itens no carrinho referenciando este produto:', data.cartItems);
    console.log('Itens em pedidos referenciando este produto:', data.orderItems);
    console.log('Pode deletar:', data.canDelete ? '✅ SIM' : '❌ NÃO');
    console.groupEnd();
    
    // Mostrar ao usuário também
    const msg = `📊 Diagnóstico:\n` +
      `✓ Produto: ${data.product ? data.product.name : 'NÃO ENCONTRADO'}\n` +
      `✓ Referências em carrinho: ${data.cartItems}\n` +
      `✓ Referências em pedidos: ${data.orderItems}\n` +
      `✓ Pode deletar: ${data.canDelete ? 'SIM' : 'NÃO'}`;
    
    alert(msg);
  } catch (error) {
    console.error('❌ Erro ao diagnosticar:', error);
    alert(`Erro ao diagnosticar: ${error.message}`);
  }
}

async function deleteProduct(productId) {
  if (!confirm('Tem certeza que deseja deletar este produto?')) return;

  try {
    console.log(`🗑️ Deletando produto: ${productId}`);
    
    const response = await fetch(`${API_URL}/products/${productId}`, {
      method: 'DELETE'
    });

    console.log(`Resposta do servidor: ${response.status}`);
    
    let responseData;
    try {
      responseData = await response.json();
    } catch (parseErr) {
      console.error('❌ Erro ao fazer parse do JSON:', parseErr);
      showAdminToast('Erro: Resposta inválida do servidor', 'error');
      return;
    }

    console.log('Dados da resposta:', responseData);

    if (!response.ok) {
      const errorMsg = responseData?.message || responseData?.error || responseData?.details || 'Erro desconhecido';
      console.error(`❌ Erro HTTP ${response.status}: ${errorMsg}`);
      showAdminToast(`Erro ao deletar (${response.status}): ${errorMsg}`, 'error');
      return;
    }

    if (responseData.success === false) {
      const errorMsg = responseData.message || responseData.error || 'Erro desconhecido';
      console.error(`❌ Erro na resposta: ${errorMsg}`);
      showAdminToast(`Erro: ${errorMsg}`, 'error');
      return;
    }

    console.log('✅ Produto deletado com sucesso');
    setTimeout(() => {
      loadProducts();
    }, 300);
    showAdminToast('Produto deletado com sucesso!', 'success');
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
    showAdminToast(`Erro: ${error.message || 'Falha na comunicação com servidor'}`, 'error');
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
    tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">Nenhum pedido encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map(order => {
    const date = new Date(order.created_at).toLocaleDateString('pt-BR');
    const statusColors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'preparing': 'bg-purple-100 text-purple-800',
      'out_for_delivery': 'bg-cyan-100 text-cyan-800',
      'delivered': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return `
      <tr class="border-b border-gray-300 hover:bg-gray-50 text-sm">
        <td class="px-6 py-4 font-mono text-gray-700 font-bold">${order.id.substring(0, 8)}...</td>
        <td class="px-6 py-4 font-semibold text-gray-900">${order.customer_name}</td>
        <td class="px-6 py-4 text-gray-700">${order.customer_phone}</td>
        <td class="px-6 py-4 font-bold text-red-600">R$ ${parseFloat(order.total).toFixed(2)}</td>
        <td class="px-6 py-4"><span class="px-2 py-1 rounded-full text-xs font-bold ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}">${getStatusLabel(order.status)}</span></td>
        <td class="px-6 py-4 text-gray-700">${date}</td>
        <td class="px-6 py-4 flex gap-2">
          <button class="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded font-semibold transition-colors" onclick="openOrderModal('${order.id}')">Ver</button>
          <button class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-semibold transition-colors" onclick="openStatusModal('${order.id}')">Atualizar</button>
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
    const statusColors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'preparing': 'bg-purple-100 text-purple-800',
      'out_for_delivery': 'bg-cyan-100 text-cyan-800',
      'delivered': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };

    content.innerHTML = `
      <div class="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <div class="text-xs text-gray-600 font-semibold uppercase">ID do Pedido</div>
          <div class="text-lg font-bold text-gray-900 font-mono">${order.id}</div>
        </div>
        <div>
          <div class="text-xs text-gray-600 font-semibold uppercase">Cliente</div>
          <div class="text-lg font-bold text-gray-900">${order.customer_name}</div>
        </div>
        <div>
          <div class="text-xs text-gray-600 font-semibold uppercase">Telefone</div>
          <div class="text-lg font-bold text-gray-900">${order.customer_phone}</div>
        </div>
        <div>
          <div class="text-xs text-gray-600 font-semibold uppercase">Data</div>
          <div class="text-lg font-bold text-gray-900">${date}</div>
        </div>
        <div>
          <div class="text-xs text-gray-600 font-semibold uppercase">Status</div>
          <div><span class="px-2 py-1 rounded-full text-sm font-bold ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}">${getStatusLabel(order.status)}</span></div>
        </div>
        <div>
          <div class="text-xs text-gray-600 font-semibold uppercase">Total</div>
          <div class="text-lg font-bold text-red-600">R$ ${parseFloat(order.total).toFixed(2)}</div>
        </div>
      </div>

      <h4 class="text-lg font-bold text-gray-800 mb-3">Itens do Pedido</h4>
      <div class="bg-white rounded-lg overflow-hidden mb-6">
        <table class="w-full">
          <thead class="bg-gray-100 border-b border-gray-300">
            <tr class="text-left">
              <th class="px-4 py-2 font-bold text-gray-800 text-sm">Produto</th>
              <th class="px-4 py-2 font-bold text-gray-800 text-sm">Quantidade</th>
              <th class="px-4 py-2 font-bold text-gray-800 text-sm">Preço Unit.</th>
              <th class="px-4 py-2 font-bold text-gray-800 text-sm">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr class="border-b border-gray-200 hover:bg-gray-50 text-sm">
                <td class="px-4 py-2 font-medium text-gray-900">${item.name}</td>
                <td class="px-4 py-2 text-center text-gray-700">${item.quantity}</td>
                <td class="px-4 py-2 text-gray-700">R$ ${parseFloat(item.price).toFixed(2)}</td>
                <td class="px-4 py-2 font-bold text-red-600">R$ ${(item.quantity * item.price).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <strong class="text-gray-900 block mb-2">Endereço de Entrega:</strong>
        <p class="text-gray-700">${order.delivery_address}</p>
      </div>

      <div class="flex gap-2 items-center mb-4">
        <select id="new-status" value="${order.status}" class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-semibold">
          <option value="pending">Pendente</option>
          <option value="confirmed">Confirmado</option>
          <option value="preparing">Preparando</option>
          <option value="out_for_delivery">Em entrega</option>
          <option value="delivered">Entregue</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <button class="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-bold transition-all" onclick="updateOrderStatus('${orderId}')">Atualizar Status</button>
      </div>
    `;

    orderModal.classList.remove('hidden');
  } catch (error) {
    console.error('Erro ao carregar pedido:', error);
    showAdminToast('Erro ao carregar detalhes do pedido', 'error');
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
      showAdminToast('Erro ao atualizar status', 'error');
      return;
    }

    orderModal.classList.add('hidden');
    loadOrders();
    showAdminToast('Status atualizado com sucesso!', 'success');
  } catch (error) {
    console.error('Erro:', error);
    showAdminToast('Erro ao atualizar status', 'error');
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
    reportDiv.innerHTML = '<p class="text-center text-gray-500 py-4">Nenhuma venda nos últimos 30 dias</p>';
    return;
  }

  reportDiv.innerHTML = sales.map(sale => {
    const date = new Date(sale.date).toLocaleDateString('pt-BR');
    return `
      <div class="flex justify-between items-center p-3 bg-blue-50 border-l-4 border-blue-600 rounded">
        <div>
          <div class="font-bold text-gray-800">${date}</div>
          <div class="text-sm text-gray-600">${sale.orders} pedidos</div>
        </div>
        <div class="font-bold text-blue-600 text-lg">R$ ${parseFloat(sale.revenue).toFixed(2)}</div>
      </div>
    `;
  }).join('');
}

function displayTopProducts(topProducts) {
  const reportDiv = document.getElementById('top-products');
  
  if (topProducts.length === 0) {
    reportDiv.innerHTML = '<p class="text-center text-gray-500 py-4">Nenhum produto vendido</p>';
    return;
  }

  reportDiv.innerHTML = topProducts.map(product => `
    <div class="flex justify-between items-center p-3 bg-green-50 border-l-4 border-green-600 rounded">
      <div>
        <div class="font-bold text-gray-800">${product.name}</div>
        <div class="text-sm text-gray-600">${product.times_sold} pedidos</div>
      </div>
      <div class="font-bold text-green-600 text-lg">${product.total_sold} vendidas</div>
    </div>
  `).join('');
}
