// URL da API (configure com a URL do Render em produção)
const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : 'https://victor-farma.onrender.com/api';

// ============= VERIFICAÇÃO DE AUTENTICAÇÃO =============
const AUTH_KEY = 'victor_farma_admin_auth';

async function checkAuthentication() {
  const token = sessionStorage.getItem(AUTH_KEY);
  if (!token) {
    console.warn('🔐 Usuário não autenticado. Redirecionando para login...');
    window.location.href = 'login.html';
    return false;
  }
  
  try {
    // Verificar token com o backend
    console.log('🔍 Verificando autenticação com o servidor...');
    
    const response = await fetch(`${API_URL}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.authenticated) {
      throw new Error(data.error || 'Token inválido');
    }

    console.log('✅ Autenticação verificada pelo servidor');
    return true;

  } catch (error) {
    console.error('❌ Erro na verificação de autenticação:', error.message);
    sessionStorage.removeItem(AUTH_KEY);
    window.location.href = 'login.html';
    return false;
  }
}

// Verificar autenticação ao carregar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAuthentication);
} else {
  checkAuthentication();
}

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

// ============= LOGOUT =============
function handleLogout() {
  const confirmed = confirm('Tem certeza que deseja sair? Você será redirecionado para o login.');
  if (!confirmed) return;
  
  console.log('👋 Fazendo logout do painel admin...');
  sessionStorage.removeItem(AUTH_KEY);
  window.location.href = 'login.html';
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

    // Carregar receita total
    loadTotalRevenue();
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
    showProductDiagnosisModal({
      title: 'Erro ao diagnosticar',
      error: true,
      message: error.message || String(error)
    });
  }
}

// Mostra um modal estilizado com o diagnóstico do produto
function showProductDiagnosisModal(data) {
  try {
    // remover modal antigo se existir
    const existing = document.getElementById('product-diagnosis-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'product-diagnosis-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="absolute inset-0 bg-black opacity-50"></div>
      <div class="relative max-w-lg w-full bg-gray-900 text-white rounded-lg shadow-xl overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-800 flex items-start gap-4">
          <div class="flex-shrink-0 bg-green-600 rounded-full w-10 h-10 flex items-center justify-center text-xl">📊</div>
          <div class="flex-1">
            <div class="font-bold text-lg">Diagnóstico</div>
            <div class="text-sm text-green-200 mt-1">${data.title || (data.product ? data.product.name : '')}</div>
          </div>
          <button id="product-diagnosis-close" class="text-gray-300 hover:text-white">×</button>
        </div>
        <div class="p-6 space-y-4 text-sm text-gray-100">
          ${data.error ? `<div class="text-red-400">${data.message}</div>` : `
            <div class="flex items-center justify-between bg-gray-800 rounded p-3">
              <div class="font-semibold">Produto</div>
              <div class="text-gray-200">${data.product ? data.product.name : 'NÃO ENCONTRADO'}</div>
            </div>
            <div class="flex items-center justify-between bg-gray-800 rounded p-3">
              <div>Referências em carrinho</div>
              <div class="font-bold text-green-300">${data.cartItems}</div>
            </div>
            <div class="flex items-center justify-between bg-gray-800 rounded p-3">
              <div>Referências em pedidos</div>
              <div class="font-bold text-green-300">${data.orderItems}</div>
            </div>
            <div class="flex items-center justify-between bg-gray-800 rounded p-3">
              <div>Pode deletar</div>
              <div class="font-bold ${data.canDelete ? 'text-green-300' : 'text-red-400'}">${data.canDelete ? 'SIM' : 'NÃO'}</div>
            </div>
            ${data.dependencies ? `
              <div class="mt-2 text-xs text-gray-400">Detalhes:</div>
              <div class="max-h-40 overflow-auto bg-gray-800 rounded p-3 text-xs space-y-2">
                <div><strong>Carrinho:</strong> ${JSON.stringify(data.dependencies.cartItems)}</div>
                <div><strong>Pedidos:</strong> ${JSON.stringify(data.dependencies.orderItems)}</div>
              </div>
            ` : ''}
          `}
        </div>
        <div class="px-6 py-4 bg-gray-800 flex justify-end gap-3">
          <button id="product-diagnosis-ok" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">OK</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const removeModal = () => { const el = document.getElementById('product-diagnosis-modal'); if (el) el.remove(); };
    document.getElementById('product-diagnosis-close').addEventListener('click', removeModal);
    document.getElementById('product-diagnosis-ok').addEventListener('click', removeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) removeModal(); });
  } catch (e) {
    console.error('Erro ao renderizar modal de diagnóstico:', e);
    alert(data.error ? data.message : JSON.stringify(data));
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
    tbody.innerHTML = '<tr><td colspan="8" class="px-6 py-4 text-center text-gray-500">Nenhum pedido encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map(order => {
    const dateTime = new Date(order.created_at).toLocaleString('pt-BR');
    
    // Cores para status do pedido
    const statusPedidoColors = {
      'em preparação': 'bg-yellow-100 text-yellow-800',
      'em rota de entrega': 'bg-blue-100 text-blue-800',
      'entregue': 'bg-green-100 text-green-800',
      'cancelado': 'bg-red-100 text-red-800'
    };

    // Cores para status de pagamento
    const statusPagamentoColors = {
      'aprovado': 'bg-green-100 text-green-800',
      'pendente': 'bg-yellow-100 text-yellow-800',
      'cancelado': 'bg-red-100 text-red-800'
    };

    return `
      <tr class="border-b border-gray-300 hover:bg-gray-50 text-sm">
        <td class="px-6 py-4 font-mono text-gray-700 font-bold">${order.id.substring(0, 8)}...</td>
        <td class="px-6 py-4 font-semibold text-gray-900">${order.customer_name}</td>
        <td class="px-6 py-4 text-gray-700">${order.customer_phone}</td>
        <td class="px-6 py-4 font-bold text-red-600">R$ ${parseFloat(order.total).toFixed(2)}</td>
        <td class="px-6 py-4"><span class="px-2 py-1 rounded-full text-xs font-bold ${statusPedidoColors[order.status] || 'bg-gray-100 text-gray-800'}">${order.status || 'N/A'}</span></td>
        <td class="px-6 py-4"><span class="px-2 py-1 rounded-full text-xs font-bold ${statusPagamentoColors[order.payment_status] || 'bg-gray-100 text-gray-800'}">${order.payment_status || 'N/A'}</span></td>
        <td class="px-6 py-4 text-gray-700">${dateTime}</td>
        <td class="px-6 py-4 flex gap-2">
          <button class="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded font-semibold transition-colors" onclick="openOrderModal('${order.id}')">Ver</button>
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
    'em preparação': 'Em preparação',
    'em rota de entrega': 'Em rota de entrega',
    'entregue': 'Entregue',
    'cancelado': 'Cancelado',
    'aprovado': 'Aprovado',
    'pendente': 'Pendente'
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
    const dateTime = new Date(order.created_at).toLocaleString('pt-BR');
    
    // Cores para status do pedido
    const statusPedidoColors = {
      'em preparação': 'bg-purple-100 text-purple-800',
      'em rota de entrega': 'bg-cyan-100 text-cyan-800',
      'entregue': 'bg-green-100 text-green-800',
      'cancelado': 'bg-red-100 text-red-800'
    };

    // Cores para status de pagamento
    const statusPagamentoColors = {
      'aprovado': 'bg-green-100 text-green-800',
      'pendente': 'bg-yellow-100 text-yellow-800',
      'cancelado': 'bg-red-100 text-red-800'
    };

    content.innerHTML = `
      <div class="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <div class="text-xs text-gray-600 font-semibold uppercase">ID do Pedido</div>
          <div class="text-lg font-bold text-gray-900 font-mono">${order.id.substring(0, 12)}...</div>
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
          <div class="text-xs text-gray-600 font-semibold uppercase">Data e Hora</div>
          <div class="text-lg font-bold text-gray-900">${dateTime}</div>
        </div>
        <div>
          <div class="text-xs text-gray-600 font-semibold uppercase">📦 Status Pedido</div>
          <div><span class="px-2 py-1 rounded-full text-sm font-bold ${statusPedidoColors[order.status] || 'bg-gray-100 text-gray-800'}">${order.status || 'N/A'}</span></div>
        </div>
        <div>
          <div class="text-xs text-gray-600 font-semibold uppercase">💳 Status Pagto</div>
          <div><span class="px-2 py-1 rounded-full text-sm font-bold ${statusPagamentoColors[order.payment_status] || 'bg-gray-100 text-gray-800'}">${order.payment_status || 'N/A'}</span></div>
        </div>
        <div class="col-span-2">
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
        <strong class="text-gray-900 block mb-2">📍 Endereço de Entrega:</strong>
        <p class="text-gray-700">${order.delivery_address}</p>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label for="status-pedido-select-${orderId}" class="block text-sm font-bold text-gray-700 mb-2">📦 Status do Pedido</label>
          <select id="status-pedido-select-${orderId}" class="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500" onchange="saveOrderStatus('${orderId}', 'pedido')">
            <option value="em preparação" ${order.status === 'em preparação' ? 'selected' : ''}>Em preparação</option>
            <option value="em rota de entrega" ${order.status === 'em rota de entrega' ? 'selected' : ''}>Em rota de entrega</option>
            <option value="entregue" ${order.status === 'entregue' ? 'selected' : ''}>Entregue</option>
            <option value="cancelado" ${order.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
          </select>
        </div>

        <div>
          <label for="status-pagamento-select-${orderId}" class="block text-sm font-bold text-gray-700 mb-2">💳 Status de Pagamento</label>
          <select id="status-pagamento-select-${orderId}" class="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500" onchange="saveOrderStatus('${orderId}', 'pagamento')">
            <option value="aprovado" ${order.payment_status === 'aprovado' ? 'selected' : ''}>Aprovado</option>
            <option value="pendente" ${order.payment_status === 'pendente' ? 'selected' : ''}>Pendente</option>
            <option value="cancelado" ${order.payment_status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
          </select>
        </div>
      </div>
    `;

    orderModal.classList.remove('hidden');
  } catch (error) {
    console.error('Erro ao carregar pedido:', error);
    showAdminToast('Erro ao carregar detalhes do pedido', 'error');
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

// ==================== FUNÇÕES DE RECEITA ====================

async function loadTotalRevenue() {
  try {
    const response = await fetch(`${API_URL}/orders/admin/revenue/total`);
    if (!response.ok) {
      console.error('Erro ao buscar receita total:', response.status);
      return;
    }
    const data = await response.json();
    
    const revenueEl = document.getElementById('total-revenue');
    if (revenueEl) {
      revenueEl.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-600">
          <h3 class="text-lg font-semibold text-gray-700 mb-2">💰 Receita Total</h3>
          <div class="text-4xl font-bold text-green-600 mb-1">${data.formatted}</div>
          <div class="text-sm text-gray-500">${data.transaction_count} transações</div>
        </div>
      `;
    }
  } catch (error) {
    console.error('Erro ao carregar receita total:', error);
  }
}

// ==================== FUNÇÕES DE STATUS ====================

// Salvar status quando o select é alterado
async function saveOrderStatus(orderId, tipo) {
  try {
    const statusPedidoSelect = document.getElementById(`status-pedido-select-${orderId}`);
    const statusPagamentoSelect = document.getElementById(`status-pagamento-select-${orderId}`);
    
    if (!statusPedidoSelect || !statusPagamentoSelect) return;

    const statusPedido = statusPedidoSelect.value;
    const statusPagamento = statusPagamentoSelect.value;

    // Fazer request para atualizar (usar namespace admin onde o painel já opera)
    const response = await fetch(`${API_URL}/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: statusPedido,
        payment_status: statusPagamento
      })
    });

    if (!response.ok) {
      let errBody = null;
      try { errBody = await response.json(); } catch (e) { /* ignore */ }
      const msg = (errBody && (errBody.error || errBody.message)) || `HTTP ${response.status}`;
      throw new Error(`Erro ao salvar: ${msg}`);
    }

    const data = await response.json();
    
    // Atualizar o array de pedidos localmente
    const idx = allOrders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      allOrders[idx] = data.order || data;
    }

    showAdminToast('✅ Status atualizado com sucesso!', 'success');
    
    // Recarregar a lista de pedidos em background
    await new Promise(resolve => setTimeout(resolve, 500));
    filterOrders();
  } catch (error) {
    console.error('Erro ao salvar status:', error);
    showAdminToast(`Erro: ${error.message}`, 'error');
  }
}

function fecharStatusModal() {
  const modal = document.getElementById('status-modal');
  if (modal) modal.remove();
}

function openStatusModal(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) {
    showAdminToast('Pedido não encontrado', 'error');
    return;
  }

  fecharStatusModal();

  const modal = document.createElement('div');
  modal.id = 'status-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md overflow-y-auto">
      <h2 class="text-xl font-bold text-gray-900 mb-2">🔄 Alterar Status</h2>
      <p class="text-sm text-gray-600 mb-6">Pedido #${order.id.substring(0, 12)}...</p>
      
      <form id="status-form">
        <div class="mb-6">
          <label for="status-pedido-select" class="block text-sm font-bold text-gray-700 mb-2">📦 Status do Pedido</label>
            <select id="status-pedido-select" class="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="em preparação" ${order.status === 'em preparação' ? 'selected' : ''}>Em preparação</option>
              <option value="em rota de entrega" ${order.status === 'em rota de entrega' ? 'selected' : ''}>Em rota de entrega</option>
              <option value="entregue" ${order.status === 'entregue' ? 'selected' : ''}>Entregue</option>
              <option value="cancelado" ${order.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
            </select>
        </div>

        <div class="mb-6">
          <label for="status-pagamento-select" class="block text-sm font-bold text-gray-700 mb-2">💳 Status de Pagamento</label>
          <select id="status-pagamento-select" class="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="aprovado" ${order.payment_status === 'aprovado' ? 'selected' : ''}>Aprovado</option>
            <option value="pendente" ${order.payment_status === 'pendente' ? 'selected' : ''}>Pendente</option>
            <option value="cancelado" ${order.payment_status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
          </select>
        </div>

        <div class="flex gap-2">
          <button type="button" class="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 rounded-lg" id="btn-cancel">Cancelar</button>
          <button type="button" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg" id="btn-save">💾 Salvar</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // LISTENERS APÓS INSERIR NO DOM
  document.getElementById('btn-cancel').addEventListener('click', fecharStatusModal);
  document.getElementById('btn-save').addEventListener('click', async (e) => {
    e.preventDefault();
    const statusPedido = document.getElementById('status-pedido-select').value;
    const statusPagamento = document.getElementById('status-pagamento-select').value;
    await atualizar_Status(orderId, statusPedido, statusPagamento);
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) fecharStatusModal();
  });
  
  document.getElementById('status-pedido-select').focus();
}

async function atualizar_Status(orderId, statusPedido, statusPagamento) {
  try {
    const res1 = await fetch(`${API_URL}/orders/${orderId}/status-pedido`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ novoStatus: statusPedido })
    });
    if (!res1.ok) throw new Error(`Status: ${res1.status}`);

    const res2 = await fetch(`${API_URL}/orders/${orderId}/payment-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ novoStatus: statusPagamento })
    });
    if (!res2.ok) throw new Error(`Pagamento: ${res2.status}`);

    const data = await res2.json();
    const idx = allOrders.findIndex(o => o.id === orderId);
    if (idx !== -1) allOrders[idx] = data.pedido;

    showAdminToast('✅ Sucesso!');
    fecharStatusModal();
    filterOrders();
  } catch (e) {
    showAdminToast(`Erro: ${e.message}`, 'error');
  }
}

// ⚠️ TEMPORÁRIO: Função para deletar todos os pedidos (apenas para desenvolvimento)
async function deleteAllOrders() {
  const confirmDelete = confirm(
    '⚠️ ATENÇÃO!\n\n' +
    'Esta ação irá DELETAR TODOS os pedidos, incluindo a receita.\n\n' +
    'Esta é uma ação permanente e não pode ser desfeita.\n\n' +
    'Tem certeza que deseja continuar?'
  );

  if (!confirmDelete) {
    showAdminToast('Operação cancelada', 'error');
    return;
  }

  // Segunda confirmação de segurança
  const doubleConfirm = confirm(
    'Última confirmação: Você realmente deseja deletar TODOS os pedidos?'
  );

  if (!doubleConfirm) {
    showAdminToast('Operação cancelada', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/orders/admin/all`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true })
    });

    if (!response.ok) {
      const error = await response.json();
      showAdminToast(`Erro ao deletar pedidos: ${error.error}`, 'error');
      return;
    }

    const result = await response.json();
    showAdminToast(`✅ ${result.message}`);
    
    // Recarregar tudo
    allOrders = [];
    loadTotalRevenue();
    filterOrders();
  } catch (error) {
    console.error('Erro ao deletar todos os pedidos:', error);
    showAdminToast('Erro ao deletar pedidos', 'error');
  }
}

