// URL da API (configure com a URL do Render em produção)
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api'
  : 'https://victor-farma.onrender.com/api';

// Log inicial para confirmar carregamento do script
console.log('app.js carregado — iniciando scripts');

// Capturar erros globais para que o usuário veja no console
window.addEventListener('error', function (e) {
  console.error('Erro capturado (window.error):', e.message, e.error);
});
window.addEventListener('unhandledrejection', function (e) {
  console.error('Unhandled promise rejection:', e.reason);
});

let userId = localStorage.getItem('userId') || generateUserId();
let cart = [];
let products = [];
let currentOrder = null;
let paymentPollingInterval = null;
let currentPixOverlay = null; // ← Guardar referência do modal PIX atual

// Gerar ID do usuário
function generateUserId() {
  const id = 'user_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('userId', id);
  return id;
}

// Elementos DOM
const productsContainer = document.getElementById('products-container');
const cartBtn = document.getElementById('cart-btn');
const cartModal = document.getElementById('cart-modal');
const checkoutModal = document.getElementById('checkout-modal');
const paymentModal = document.getElementById('payment-modal');
const confirmationModal = document.getElementById('confirmation-modal');
const cartItemsDiv = document.getElementById('cart-items');
const cartCountSpan = document.getElementById('cart-count');
const cartTotalSpan = document.getElementById('cart-total');
const checkoutBtn = document.getElementById('checkout-btn');
const checkoutForm = document.getElementById('checkout-form');
const searchInput = document.getElementById('search-input');
const categoryFilter = document.getElementById('category-filter');
const myOrdersBtn = document.getElementById('my-orders-btn');
const ordersModal = document.getElementById('orders-modal');
const ordersListDiv = document.getElementById('orders-list');
const refreshOrdersBtn = document.getElementById('refresh-orders-btn');

// Verificar elementos críticos (ajuda a diagnosticar carregamento/caching)
const missing = [];
[['productsContainer', productsContainer], ['cartBtn', cartBtn], ['cartModal', cartModal], ['checkoutModal', checkoutModal], ['paymentModal', paymentModal], ['confirmationModal', confirmationModal], ['cartItemsDiv', cartItemsDiv], ['cartCountSpan', cartCountSpan], ['cartTotalSpan', cartTotalSpan], ['checkoutBtn', checkoutBtn], ['checkoutForm', checkoutForm], ['searchInput', searchInput], ['categoryFilter', categoryFilter]].forEach(([name, el]) => {
  if (!el) missing.push(name);
});
if (missing.length) {
  console.warn('Elementos DOM ausentes (verificar se app.js foi carregado antes do HTML ou se IDs mudaram):', missing);
}

// Event Listeners
cartBtn.addEventListener('click', () => {
  console.log('🛒 Clique no carrinho detectado');
  console.log('cartModal:', cartModal);
  console.log('classList antes:', cartModal.className);
  cartModal.classList.remove('hidden');
  console.log('classList depois:', cartModal.className);
  loadCart();
});

checkoutBtn.addEventListener('click', () => {
  cartModal.classList.add('hidden');
  checkoutModal.classList.remove('hidden');
});

checkoutForm.addEventListener('submit', handleCheckout);

document.getElementById('back-to-products-btn').addEventListener('click', () => {
  confirmationModal.classList.add('hidden');
  location.reload();
});

searchInput.addEventListener('input', filterProducts);
categoryFilter.addEventListener('change', filterProducts);

// Close modal buttons
document.querySelectorAll('.close-modal').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const modal = e.target.closest('.modal');
    modal.classList.add('hidden');
  });
});

// Fechar modal ao clicar fora do conteúdo
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });
});

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  initUserOrders();
});

// ------------------- Meus Pedidos -------------------
let userOrders = [];
let ordersPollingInterval = null;
let lastOrderStatusMap = {}; // map orderId -> status

function initUserOrders() {
  if (myOrdersBtn) {
    myOrdersBtn.addEventListener('click', () => {
      ordersModal.classList.remove('hidden');
      loadUserOrders();
    });
  }
  document.querySelectorAll('#orders-modal .close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      ordersModal.classList.add('hidden');
    });
  });
  if (refreshOrdersBtn) refreshOrdersBtn.addEventListener('click', loadUserOrders);

  // Iniciar polling de orders a cada 8s
  ordersPollingInterval = setInterval(() => {
    loadUserOrders(false);
  }, 8000);
}

async function loadUserOrders(showNotifyOnChange = true) {
  try {
    const res = await fetch(`${API_URL}/orders/user/${userId}`);
    if (!res.ok) {
      console.warn('Erro ao buscar pedidos do usuário:', res.status);
      return;
    }
    const data = await res.json();
    const orders = Array.isArray(data) ? data : (data.orders || []);
    // Detectar mudanças de status
    orders.forEach(o => {
      const prev = lastOrderStatusMap[o.id];
      if (prev && prev !== o.status && showNotifyOnChange) {
        notify.info(`Pedido #${o.id} atualizado: ${statusLabel(o.status)}`, 4000);
      }
      lastOrderStatusMap[o.id] = o.status;
    });
    userOrders = orders;
    renderOrdersList();
  } catch (e) {
    console.error('Erro ao carregar pedidos do usuário:', e);
  }
}

function renderOrdersList() {
  if (!ordersListDiv) return;
  if (!userOrders || userOrders.length === 0) {
    ordersListDiv.innerHTML = '<p class="text-center text-gray-500">Nenhum pedido encontrado.</p>';
    return;
  }
  ordersListDiv.innerHTML = '';
  userOrders.forEach(order => {
    const el = document.createElement('div');
    el.className = 'border rounded-lg p-3 bg-white shadow-sm';
    const created = new Date(order.created_at || order.createdAt || order.created);
    const dd = String(created.getDate()).padStart(2,'0');
    const MM = String(created.getMonth()+1).padStart(2,'0');
    const yyyy = created.getFullYear();
    const hh = String(created.getHours()).padStart(2,'0');
    const min = String(created.getMinutes()).padStart(2,'0');
    const dateTimeStr = `${dd}/${MM}/${yyyy} - ${hh}:${min}`;

    const label = statusLabel(order.status);
    const statusBadge = `<span class="text-xs font-semibold px-2 py-1 rounded-full" style="background:${statusColor(order.status)}; color:white">${label}</span>`;

    el.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <div>
          <div class="text-sm text-gray-600">Pedido #${order.id}</div>
          <div class="text-base font-bold text-green-600">R$ ${parseFloat(order.total || 0).toFixed(2)}</div>
        </div>
        <div class="text-right">
          ${statusBadge}
          <div class="text-xs text-gray-500 mt-1">${dateTimeStr}</div>
        </div>
      </div>
      <div class="text-sm text-gray-700 mb-2">${(order.items || []).map(it => `${it.quantity}x ${it.name || it.product_name || ''}`).join(', ')}</div>
      <div class="flex gap-2">
        <button class="btn-view-order bg-green-600 hover:bg-green-700 text-white font-semibold py-1 px-3 rounded" data-id="${order.id}">Ver</button>
        <button class="btn-open-confirmation bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-1 px-3 rounded" data-id="${order.id}">Nota</button>
      </div>
    `;

    ordersListDiv.appendChild(el);
  });

  // Handlers para botões
  ordersListDiv.querySelectorAll('.btn-view-order').forEach(b => {
    b.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      // navegar para detalhes ou abrir modal de pagamento se necessário
      const order = userOrders.find(o => String(o.id) === String(id));
      if (order) {
        alert(`Pedido #${order.id}\nStatus: ${statusLabel(order.status)}\nTotal: R$ ${parseFloat(order.total||0).toFixed(2)}`);
      }
    });
  });
  ordersListDiv.querySelectorAll('.btn-open-confirmation').forEach(b => {
    b.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      const order = userOrders.find(o => String(o.id) === String(id));
      if (order) {
        // mostrar modal de confirmação com detalhes
        document.getElementById('order-id-display').textContent = `#${order.id}`;
        const dtEl = document.getElementById('order-datetime-display');
        if (dtEl) {
          const created = new Date(order.created_at || order.createdAt || order.created);
          const dd = String(created.getDate()).padStart(2,'0');
          const MM = String(created.getMonth()+1).padStart(2,'0');
          const yyyy = created.getFullYear();
          const hh = String(created.getHours()).padStart(2,'0');
          const min = String(created.getMinutes()).padStart(2,'0');
          dtEl.textContent = `${dd}/${MM}/${yyyy} - ${hh}:${min}`;
        }
        confirmationModal.classList.remove('hidden');
        ordersModal.classList.add('hidden');
      }
    });
  });
}

function statusKey(status) {
  if (!status) return 'unknown';
  const s = String(status).toLowerCase();
  // mapeamentos conhecidos (ing/pt-br)
  if (s === 'pendente' || s === 'pending') return 'pending';
  if (s === 'confirmado' || s === 'confirmed' || s === 'confirmed_payment') return 'confirmed';
  if (s === 'preparando' || s === 'preparing' || s === 'preparing_order') return 'preparing';
  if (s === 'out_for_delivery' || s === 'out_for_delivery' || s.includes('delivery') || s === 'em entrega') return 'out_for_delivery';
  if (s === 'entregue' || s === 'delivered' || s === 'delivered_order') return 'delivered';
  if (s === 'cancelado' || s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'ready' || s === 'pronto') return 'ready';
  return s.replace(/[^a-z0-9_]/g, '_');
}

function statusLabel(status) {
  const key = statusKey(status);
  switch (key) {
    case 'pending': return 'Pendente';
    case 'confirmed': return 'Confirmado';
    case 'preparing': return 'Preparando';
    case 'out_for_delivery': return 'Em entrega';
    case 'delivered': return 'Entregue';
    case 'cancelled': return 'Cancelado';
    case 'ready': return 'Pronto';
    default: return String(status || '').charAt(0).toUpperCase() + String(status || '').slice(1);
  }
}

function statusColor(status) {
  const key = statusKey(status);
  switch (key) {
    case 'pending': return '#f59e0b';
    case 'confirmed': return '#10b981';
    case 'preparing': return '#3b82f6';
    case 'out_for_delivery': return '#06b6d4';
    case 'delivered': return '#059669';
    case 'cancelled': return '#ef4444';
    case 'ready': return '#059669';
    default: return '#6b7280';
  }
}

// Buscar produtos
async function loadProducts() {
  try {
    console.log('🔄 Iniciando carregamento de produtos de:', `${API_URL}/products`);
    const response = await fetch(`${API_URL}/products`);
    console.log('✓ Resposta recebida:', response.status, response.statusText);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log('✓ Produtos carregados:', data);
    products = Array.isArray(data) ? data : (data.products || []);
    console.log('✓ Total de produtos:', products.length);
    displayProducts(products);
  } catch (error) {
    console.error('❌ Erro ao carregar produtos:', error);
    if (productsContainer) {
      productsContainer.innerHTML = '<p class="text-center text-red-500 py-12">Erro ao carregar produtos. Tente recarregar a página.</p>';
    }
  }
}

// Exibir produtos
function displayProducts(productsToDisplay) {
  if (!productsContainer) {
    console.error('❌ productsContainer não encontrado no DOM');
    return;
  }
  
  if (!Array.isArray(productsToDisplay)) {
    console.error('❌ productsToDisplay não é um array:', productsToDisplay);
    productsContainer.innerHTML = '<p class="text-center text-red-500 py-12">Erro: dados inválidos</p>';
    return;
  }
  
  if (productsToDisplay.length === 0) {
    console.warn('⚠️ Nenhum produto encontrado');
    productsContainer.innerHTML = '<p class="col-span-full text-center text-gray-500 py-12">Nenhum produto encontrado</p>';
    return;
  }

  console.log('📦 Renderizando', productsToDisplay.length, 'produtos');
  productsContainer.innerHTML = productsToDisplay.map(product => `
    <div class="bg-white rounded-lg shadow hover:shadow-lg product-card overflow-hidden flex flex-col" data-product-id="${product.id}">
      <div class="bg-gradient-to-br from-green-100 to-green-50 h-32 sm:h-40 flex items-center justify-center overflow-hidden">
        ${product.image_url ? `<img id="product-img-${product.id}" src="${product.image_url}" alt="${product.name}" class="w-full h-full object-cover product-image-el">` : '<span class="text-gray-400 text-sm text-center px-2">Sem imagem</span>'}
      </div>
      <div class="p-3 flex-1 flex flex-col justify-between">
        <div>
          <h3 class="font-bold text-sm md:text-base text-gray-900 line-clamp-2 mb-1">${product.name}</h3>
          <p class="text-xs text-gray-600 line-clamp-2 mb-2">${product.description || ''}</p>
        </div>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <p class="text-lg md:text-xl font-bold text-red-600">R$ ${parseFloat(product.price).toFixed(2)}</p>
            <p class="text-xs font-semibold ${product.stock < 10 ? 'text-red-600' : 'text-gray-600'}">Est: ${product.stock}</p>
          </div>
          <button class="add-to-cart-btn w-full ${product.stock === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 btn-hover'} text-white font-bold py-2 px-3 rounded-lg text-xs md:text-sm transition-all" ${product.stock === 0 ? 'disabled' : ''} onclick="addToCart('${product.id}')">
            ${product.stock === 0 ? '❌ Fora de estoque' : '➕ Adicionar'}
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// Filtrar produtos
function filterProducts() {
  const searchTerm = searchInput.value.toLowerCase();
  const selectedCategory = categoryFilter.value;

  const filtered = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm) || 
                         (product.description && product.description.toLowerCase().includes(searchTerm));
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  displayProducts(filtered);
}

// Adicionar ao carrinho
async function addToCart(productId) {
  // Animação: clonar imagem do produto e mover para o botão do carrinho
  try {
    const img = document.getElementById(`product-img-${productId}`);
    if (img) {
      const imgRect = img.getBoundingClientRect();
      const cartRect = cartBtn.getBoundingClientRect();

      const clone = img.cloneNode(true);
      clone.style.position = 'fixed';
      clone.style.left = `${imgRect.left}px`;
      clone.style.top = `${imgRect.top}px`;
      clone.style.width = `${imgRect.width}px`;
      clone.style.height = `${imgRect.height}px`;
      clone.style.transition = 'transform 620ms cubic-bezier(.2,.8,.2,1), opacity 300ms';
      clone.style.zIndex = 2147483647;
      clone.style.pointerEvents = 'none';
      document.body.appendChild(clone);

      const dx = (cartRect.left + cartRect.width / 2) - (imgRect.left + imgRect.width / 2);
      const dy = (cartRect.top + cartRect.height / 2) - (imgRect.top + imgRect.height / 2);
      const scale = 0.18;

      requestAnimationFrame(() => {
        clone.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`;
        clone.style.opacity = '0.9';
      });

      await new Promise(resolve => {
        clone.addEventListener('transitionend', function onend(e) {
          if (e.propertyName.includes('transform')) {
            clone.removeEventListener('transitionend', onend);
            clone.remove();
            resolve();
          }
        });
      });
    }

    // Após animação, chamar API para adicionar ao carrinho
    const response = await fetch(`${API_URL}/cart/${userId}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity: 1 })
    });

    if (!response.ok) {
      const error = await response.json();
      notify.error(error.error || 'Erro ao adicionar ao carrinho');
      return;
    }

    // Atualizar carrinho
    await loadCart();

    // Animar mensagem saindo de dentro do carrinho para o centro da tela
    const product = products.find(p => p.id === productId) || { name: 'Produto' };
    animateCartMessage(`✓ ${product.name} adicionado ao carrinho`);

  } catch (error) {
    console.error('Erro ao adicionar ao carrinho:', error);
    notify.error('Erro ao adicionar ao carrinho');
  }
}

// Carregar carrinho
async function loadCart() {
  try {
    const response = await fetch(`${API_URL}/cart/${userId}`);
    cart = await response.json();
    updateCartDisplay();
  } catch (error) {
    console.error('Erro ao carregar carrinho:', error);
    cart = [];
  }
}

// Atualizar exibição do carrinho
function updateCartDisplay() {
  cartCountSpan.textContent = cart.length;

  if (cart.length === 0) {
    cartItemsDiv.innerHTML = '<p class="text-center text-gray-500 py-8 text-sm">Seu carrinho está vazio</p>';
    checkoutBtn.disabled = true;
    cartTotalSpan.textContent = 'R$ 0.00';
    return;
  }

  checkoutBtn.disabled = false;
  let total = 0;

  cartItemsDiv.innerHTML = cart.map(item => {
    total += parseFloat(item.subtotal);
    return `
      <div class="border-b py-3 px-4 hover:bg-gray-50 text-sm">
        <div class="flex justify-between items-start gap-2 mb-2">
          <div class="flex-1">
            <div class="font-semibold text-gray-900">${item.name}</div>
            <div class="text-red-600 font-bold">R$ ${parseFloat(item.price).toFixed(2)}</div>
          </div>
          <button class="remove-btn bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-bold" onclick="removeFromCart('${item.id}')">🗑️</button>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1 bg-gray-100 rounded">
            <button class="quantity-btn w-7 h-7 hover:bg-gray-200 text-center" onclick="updateQuantity('${item.id}', ${item.quantity - 1})">−</button>
            <span class="w-7 text-center font-bold">${item.quantity}</span>
            <button class="quantity-btn w-7 h-7 hover:bg-gray-200 text-center" onclick="updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
          </div>
          <div class="text-gray-700 font-semibold">R$ ${parseFloat(item.subtotal).toFixed(2)}</div>
        </div>
      </div>
    `;
  }).join('');

  cartTotalSpan.textContent = `R$ ${total.toFixed(2)}`;
}

// Animar mensagem do carrinho para o centro da tela
function animateCartMessage(text) {
  // Criar elemento de mensagem posicionado no centro do botão do carrinho
  const cartRect = cartBtn.getBoundingClientRect();
  const msg = document.createElement('div');
  msg.className = 'floating-cart-message';
  msg.textContent = text;
  
  // Estilos inline para uma mensagem bonita e profissional
  msg.style.cssText = `
    position: fixed;
    left: ${cartRect.left + cartRect.width/2}px;
    top: ${cartRect.top + cartRect.height/2}px;
    transform: translate(-50%, -50%) scale(0.8);
    z-index: 2150000000;
    pointer-events: none;
    opacity: 0;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 16px;
    box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
    backdrop-filter: blur(10px);
    white-space: nowrap;
  `;
  
  document.body.appendChild(msg);

  // Forçar reflow
  void msg.offsetWidth;

  // Animar para centro da tela
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const dx = centerX - (cartRect.left + cartRect.width/2);
  const dy = centerY - (cartRect.top + cartRect.height/2);

  msg.style.transition = 'transform 700ms cubic-bezier(.2,.8,.2,1), opacity 350ms';
  msg.style.opacity = '1';
  msg.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)`;

  // Depois de animar, manter 1.2s e sumir
  setTimeout(() => {
    msg.style.transition = 'opacity 400ms';
    msg.style.opacity = '0';
    setTimeout(() => msg.remove(), 500);
  }, 1400);
}

// Atualizar quantidade
async function updateQuantity(itemId, newQuantity) {
  if (newQuantity <= 0) {
    removeFromCart(itemId);
    return;
  }

  try {
    const response = await fetch(`${API_URL}/cart/${userId}/item/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: newQuantity })
    });

    if (response.ok) {
      await loadCart();
      notify.info('Quantidade atualizada');
    } else {
      notify.error('Erro ao atualizar quantidade');
    }
  } catch (error) {
    console.error('Erro:', error);
    notify.error('Erro ao atualizar quantidade');
  }
}

// Remover do carrinho
async function removeFromCart(itemId) {
  try {
    const response = await fetch(`${API_URL}/cart/${userId}/item/${itemId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      notify.info('Produto removido do carrinho');
      loadCart();
    } else {
      notify.error('Erro ao remover item');
    }
  } catch (error) {
    console.error('Erro:', error);
    notify.error('Erro ao remover item');
  }
}

// Processar checkout
async function handleCheckout(e) {
  e.preventDefault();

  const customerName = document.getElementById('customer-name').value;
  const customerPhone = document.getElementById('customer-phone').value;
  const deliveryAddress = document.getElementById('delivery-address').value;

  const items = cart.map(item => ({
    productId: item.product_id,
    quantity: item.quantity
  }));

  try {
    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        items,
        customerName,
        customerPhone,
        deliveryAddress,
        paymentMethod: 'pix'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      notify.error(error.error || 'Erro ao criar pedido');
      return;
    }

    const data = await response.json();
    currentOrder = data.order;

    // Gerar PIX real do Mercado Pago
    generatePixPayment(data.order.id, data.order.total);
  } catch (error) {
    console.error('Erro:', error);
    notify.error('Erro ao processar pedido');
  }
}

// Exibir modal de pagamento
function displayPaymentModal(pixQRCode, amount, orderId) {
  document.getElementById('qr-code-image').src = pixQRCode.qrCodeUrl;
  document.getElementById('pix-amount').textContent = `R$ ${parseFloat(amount).toFixed(2)}`;
  document.getElementById('pix-order-id').textContent = orderId;
  paymentModal.classList.remove('hidden');
}

// Gerar PIX real do Mercado Pago
async function generatePixPayment(orderId, amount) {
  try {
    checkoutModal.classList.add('hidden');
    
    // Mostrar loading
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'pix-loading';
    loadingDiv.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-10 rounded-lg shadow-md z-50';
    loadingDiv.innerHTML = '<p class="text-lg font-semibold text-gray-800">Gerando QR Code PIX...</p>';
    document.body.appendChild(loadingDiv);

    const response = await fetch(`${API_URL}/orders/${orderId}/generate-pix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      loadingDiv.remove();
      const error = await response.json();
      notify.error(error.error || 'Erro ao gerar PIX');
      return;
    }

    const pixData = await response.json();
    loadingDiv.remove();

    console.log('generatePixPayment - resposta do backend:', pixData);

    // Exibir modal com QR code (com fallback para diferentes campos retornados)
    displayPixQrModal(pixData, amount, orderId);

  } catch (error) {
    console.error('Erro ao gerar PIX:', error);
    const loading = document.getElementById('pix-loading');
    if (loading) loading.remove();
    notify.error('Erro ao gerar PIX');
  }
}

// Exibir modal com QR Code PIX
function displayPixQrModal(pixData, amount, orderId) {
  const valorNumerico = parseFloat(amount);
  
  // Remover qualquer modal anterior
  const existing = document.getElementById('pix-qr-modal');
  if (existing) existing.remove();

  // Extrair paymentId de pixData
  const paymentId = pixData.paymentId || pixData.id || pixData.payment_id || null;
  
  // Determinar fonte do QR
  const base64 = pixData.qrCodeBase64 || pixData.qr_code_base64 || null;
  const qrUrl = pixData.qrCodeUrl || pixData.qr_code_url || null;
  const brcode = pixData.qrCode || pixData.qr_code || pixData.qr || null;

  console.log('displayPixQrModal - fontes detectadas:', { base64, qrUrl, brcode, paymentId });

  // Criar overlay (escurecimento) — SEM classes. Definir estilos via style.setProperty para forçar !important
  const overlay = document.createElement('div');
  const pixModalId = 'pix-qr-modal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  overlay.id = pixModalId;

  // Definir propriedades de estilo individualmente com prioridade 'important'
  overlay.style.setProperty('position', 'fixed', 'important');
  overlay.style.setProperty('top', '0', 'important');
  overlay.style.setProperty('left', '0', 'important');
  overlay.style.setProperty('width', '100%', 'important');
  overlay.style.setProperty('height', '100%', 'important');
  overlay.style.setProperty('display', 'flex', 'important');
  overlay.style.setProperty('align-items', 'center', 'important');
  overlay.style.setProperty('justify-content', 'center', 'important');
  overlay.style.setProperty('z-index', '9999999999', 'important');
  overlay.style.setProperty('background-color', 'rgba(0, 0, 0, 0.7)', 'important');
  overlay.style.setProperty('padding', '20px', 'important');
  overlay.style.setProperty('box-sizing', 'border-box', 'important');
  overlay.style.setProperty('margin', '0', 'important');
  overlay.style.setProperty('border', 'none', 'important');
  overlay.style.setProperty('visibility', 'visible', 'important');
  overlay.style.setProperty('opacity', '1', 'important');
  overlay.style.setProperty('pointer-events', 'auto', 'important');
  overlay.style.setProperty('overflow', 'auto', 'important');

  // Remover qualquer classe conflitante (hidden, modal, etc)
  overlay.className = ''; // Limpar todas as classes
  
  // Adicionar apenas a classe de reforço (é a ÚNICA classe no elemento)
  overlay.classList.add('pix-qr-force');
  
  // ⚡ FORÇA ULTRA-AGRESSIVA: Usar cssText como último recurso (sobrescreve style.setProperty)
  overlay.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 9999999999 !important; background-color: rgba(0, 0, 0, 0.7) !important; padding: 20px !important; box-sizing: border-box !important; margin: 0 !important; border: none !important; visibility: visible !important; opacity: 1 !important; pointer-events: auto !important; overflow: auto !important;';
  
  // 🔄 MutationObserver PERMANENTE: Detectar qualquer mudança e corrigir IMEDIATAMENTE
  const observer = new MutationObserver((mutations) => {
    // Se algo tentou adicionar classe hidden ou mudar style, corrige
    if (overlay.classList.contains('hidden')) {
      overlay.classList.remove('hidden');
      console.warn('⚠️ MutationObserver: Classe .hidden foi adicionada, removendo...');
    }
    const computed = window.getComputedStyle(overlay).display;
    if (computed !== 'flex') {
      console.warn(`⚠️ MutationObserver: display='${computed}', reforçando...`);
      overlay.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 9999999999 !important; background-color: rgba(0, 0, 0, 0.7) !important; padding: 20px !important; box-sizing: border-box !important; margin: 0 !important; border: none !important; visibility: visible !important; opacity: 1 !important; pointer-events: auto !important; overflow: auto !important;';
    }
  });
  
  // Observar mudanças no elemento: attributes (class, style) e subtree
  observer.observe(overlay, {
    attributes: true,
    attributeFilter: ['class', 'style'],
    subtree: false
  });
  
  // Guardar observer na referência global para parar depois
  overlay._pixObserver = observer;

  // Container do card — SEM classes, apenas inline styles com !important via setAttribute
  const card = document.createElement('div');
  card.setAttribute('style', 'position: relative !important; background: white !important; border-radius: 12px !important; padding: 40px !important; text-align: center !important; max-width: 500px !important; width: 90vw !important; max-height: 85vh !important; overflow-y: auto !important; box-shadow: 0 20px 25px rgba(0, 0, 0, 0.2) !important; box-sizing: border-box !important; margin: 0 auto !important; z-index: 10000000000 !important; pointer-events: auto !important;');
  
  // Responsividade para telas muito pequenas
  if (window.innerWidth < 480) {
    card.setAttribute('style', card.getAttribute('style').replace('padding: 40px !important;', 'padding: 20px !important;'));
  }

  // Novo layout do modal: espelhando o design fornecido
  const qrSize = window.innerWidth < 420 ? '200px' : '300px';
  card.innerHTML = `
    <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 16px;">💳 Pagamento via PIX</div>

    <div style="display:flex; justify-content:center; margin-bottom:18px;">
      <div style="padding:12px; border-radius:14px; background: linear-gradient(180deg, rgba(239, 240, 255, 0.8), rgba(250,250,255,0.6)); border: 6px solid rgba(236, 213, 255, 0.6); display:inline-block;">
        ${base64 ? `<img src="data:image/png;base64,${base64}" alt="QR PIX" style="display:block; width:${qrSize}; height:${qrSize}; object-fit:contain; border-radius:8px; background:#fff;">` : (qrUrl ? `<img src="${qrUrl}" alt="QR PIX" style="display:block; width:${qrSize}; height:${qrSize}; object-fit:contain; border-radius:8px; background:#fff;">` : '<div style="width:'+qrSize+';height:'+qrSize+';display:flex;align-items:center;justify-content:center;color:#999;background:#fff;border-radius:8px;">QR indisponível</div>')}
      </div>
    </div>

    <div id="pix-status-msg" style="display:flex; align-items:center; justify-content:center; gap:8px; color:#6b21a8; font-weight:600; margin-bottom:8px; background:linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%); padding:12px 16px; border-radius:10px; border-left:4px solid #a855f7;">⏳ Aguardando pagamento...</div>

    ${brcode ? `
      <div style="margin-bottom:12px;">
        <div style="font-size:12px; color:#6b7280; font-weight:700; margin-bottom:6px;">Cód. PIX (Copia & Cola)</div>
        <div style="display:flex; gap:8px;">
          <input id="pix-brcode" readonly value="${brcode}" style="flex:1; padding:10px 12px; border:1px solid #e6e6f0; border-radius:8px; background:#fff; font-family:monospace; font-size:13px; color:#111;"/>
          <button id="pix-copy" style="background:#7c3aed; color:#fff; border:none; padding:10px 12px; border-radius:8px; font-weight:700;">📋 Copiar</button>
        </div>
      </div>
    ` : ''}

    <div style="margin:14px 0; padding:14px; background:#ecfdf5; border-radius:10px; text-align:center; border:1px solid #bbf7d0;">
      <div style="font-size:12px; color:#065f46;">Total a pagar:</div>
      <div style="font-size:20px; font-weight:800; color:#047857;">R$ ${valorNumerico.toFixed(2)}</div>
    </div>

    <div id="pix-buttons-container" style="display:flex; flex-direction:column; gap:10px; margin-top:6px;">
      <button id="pix-cancel" style="background:#ef4444; color:white; border:none; padding:12px; border-radius:10px; font-weight:800;">✖ Cancelar Compra</button>
      <button id="pix-back" style="background:#6b7280; color:white; border:none; padding:10px; border-radius:10px; font-weight:700;">← Voltar</button>
    </div>
  `;

  overlay.appendChild(card);
  // guardar orderId no overlay para verificações externas (visibilitychange)
  overlay.setAttribute('data-order-id', orderId);
  
  // ✅ GUARDAR REFERÊNCIA GLOBAL PARA O POLLING ENCONTRAR
  currentPixOverlay = overlay;
  
  // APPEND AO BODY AGORA (COM ESTILOS JÁ APLICADOS)
  document.body.appendChild(overlay);
  
  // Verificar que foi realmente adicionado ao DOM
  if (overlay.parentElement !== document.body) {
    console.error('❌ ERRO: Overlay não foi adicionado ao body!');
    notify.error('Erro ao criar modal PIX');
    return;
  }

  // Forçar reflow para garantir renderização
  void overlay.offsetHeight;
  
  setTimeout(() => {
    const finalDisplay = window.getComputedStyle(overlay).display;
    console.log('✅ Overlay PIX criado e visível no DOM');
    console.log('✅ Display:', finalDisplay);
    console.log('✅ Visibility:', window.getComputedStyle(overlay).visibility);
    console.log('✅ Z-index:', window.getComputedStyle(overlay).zIndex);
    
    // Se display não for flex, força novamente
    if (finalDisplay !== 'flex') {
      console.error(`❌ Display computado é '${finalDisplay}', forçando novamente...`);
      overlay.style.display = 'flex !important';
      overlay.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 9999999999 !important; background-color: rgba(0, 0, 0, 0.7) !important; padding: 20px !important; box-sizing: border-box !important; margin: 0 !important; border: none !important; visibility: visible !important; opacity: 1 !important; pointer-events: auto !important; overflow: auto !important;';
      void overlay.offsetHeight;
      console.log('✅ Reforçado - Display agora:', window.getComputedStyle(overlay).display);
    }

    // Checagem imediata para capturar status
    try {
      checkOrderStatus(orderId);
    } catch (e) {
      console.warn('Erro ao disparar checkOrderStatus:', e);
    }

    // Iniciar polling
    if (paymentId) {
      console.log('⏳ Iniciando polling');
      try { startPaymentPolling(paymentId, orderId); } catch (e) { console.warn('Erro ao iniciar polling:', e); }
    }

    // Ligar botões
    const copyBtn = overlay.querySelector('#pix-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', function() {
        const ta = overlay.querySelector('#pix-brcode');
        ta.select();
        document.execCommand('copy');
        this.textContent = '✓ Copiado!';
        setTimeout(() => { this.textContent = '📋 Copiar'; }, 2000);
      });
    }

    const cancelBtn = overlay.querySelector('#pix-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        cancelPixPayment(orderId);
      });
    }

    // Botão WhatsApp será adicionado apenas após confirmação de pagamento

    const backBtn = overlay.querySelector('#pix-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        // Parar o MutationObserver antes de remover
        if (overlay._pixObserver) {
          overlay._pixObserver.disconnect();
        }
        try { 
          if (overlay.parentElement === document.body) {
            document.body.removeChild(overlay);
          }
        } catch (e) { /* already removed */ }
        document.body.style.overflow = '';
        currentPixOverlay = null;
      });
    }
  }, 100);

  document.body.style.overflow = 'hidden';
}

// Fazer polling para verificar status do pagamento
function startPaymentPolling(paymentId, orderId) {
  let attempts = 0;
  const maxAttempts = 120; // 10 minutos (cada 5 segundos)
  
  console.log('⏳ Iniciando polling para orderId:', orderId);
  console.log('   paymentId:', paymentId);
  console.log('   maxAttempts:', maxAttempts);
  
  // Executar uma verificação imediata e depois o polling periódico
  async function doCheck() {
    attempts++;
    try {
      console.log(`\n🔍 [Polling ${attempts}/${maxAttempts}] Verificando status de ${orderId}...`);
      
      const response = await fetch(`${API_URL}/orders/${orderId}`);
      if (!response.ok) {
        console.warn(`⚠️ Resposta HTTP ${response.status}`);
        return false;
      }

      const data = await response.json();
      const order = data.order;
      
      console.log(`📦 Status atual: status='${order.status}', payment_status='${order.payment_status}'`);
      
      // ✅ Verificar se modal ainda existe (usar referência global)
      const modal = currentPixOverlay && currentPixOverlay.parentElement ? currentPixOverlay : null;
      if (!modal) {
        console.warn('⚠️ Modal PIX não existe mais (referência perdida), parando polling');
        clearInterval(paymentPollingInterval);
        return false;
      }
      
      // Atualizar texto de status no modal
      const statusEl = modal.querySelector('#pix-status-msg');
      if (statusEl) {
        if (order.status === 'confirmed' && order.payment_status === 'approved') {
          console.log('✅ CONFIRMADO! Atualizando visual...');
          statusEl.innerHTML = '✅ Pagamento confirmado!';
          statusEl.style.color = '#10b981';
          statusEl.style.fontSize = '16px';
          statusEl.style.fontWeight = '700';
        } else {
          statusEl.innerHTML = '⏳ Aguardando pagamento...';
        }
      }

      // Se pagamento foi confirmado (webhook atualiza status)
      if (order.status === 'confirmed' && order.payment_status === 'approved') {
        console.log('✅ Pagamento confirmado via polling!');
        clearInterval(paymentPollingInterval);
        completePixPayment(order);
        return true;
      }
    } catch (error) {
      console.error(`❌ Erro ao verificar pagamento (tentativa ${attempts}):`, error);
    }

    // Timeout após 10 minutos
    if (attempts >= maxAttempts) {
      console.warn('⏱️ Timeout: limite de tentativas atingido');
      clearInterval(paymentPollingInterval);
      pixPaymentTimeout(orderId);
    }
    return false;
  }

  // Checagem imediata
  doCheck();

  paymentPollingInterval = setInterval(() => {
    doCheck();
  }, 5000); // Verificar a cada 5 segundos
}

// Verificar status do pedido uma vez (retorno imediato) — usado pelo botão manual e visibilitychange
async function checkOrderStatus(orderId) {
  try {
    const res = await fetch(`${API_URL}/orders/${orderId}`);
    if (!res.ok) return;
    const data = await res.json();
    const order = data.order;

    // Atualizar mensagem de status no modal, se existir
    const statusEl = document.getElementById('pix-status-msg');
    if (statusEl) {
      statusEl.textContent = `Status atual: ${statusLabel(order.status)} (${order.payment_status || 'n/a'})`;
    }

    if (order.status === 'confirmed' && order.payment_status === 'approved') {
      clearInterval(paymentPollingInterval);
      completePixPayment(order);
    }
  } catch (err) {
    console.error('Erro em checkOrderStatus:', err);
  }
}

// Rechecar automaticamente quando o usuário retornar à aba (caso o webhook tenha sido entregue enquanto a aba estava em segundo plano)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // ✅ Usar referência global
    const modal = currentPixOverlay;
    if (modal && modal.parentElement) {
      const oid = modal.getAttribute('data-order-id');
      
      // Se o pagamento foi confirmado, fechar o modal após 2 segundos
      if (modal._paymentConfirmed) {
        console.log('🔔 Cliente retornou ao site. Fechando modal em 2 segundos...');
        setTimeout(() => {
          if (modal._pixObserver) {
            modal._pixObserver.disconnect();
          }
          try {
            if (modal.parentElement) {
              document.body.removeChild(modal);
            }
          } catch (e) { /* already removed */ }
          document.body.style.overflow = 'auto';
          currentPixOverlay = null;
          
          // Buscar dados da order para mostrar confirmação
          fetch(`${API_URL}/orders/${oid}`)
            .then(res => res.json())
            .then(data => {
              const order = data.order;
              showConfirmation(order);
            })
            .catch(err => {
              console.error('Erro ao buscar dados do pedido:', err);
              showConfirmation({ id: oid, total: 0 });
            });
        }, 2000);
      } else if (oid) {
        // Se pagamento ainda não confirmado, apenas verificar status
        checkOrderStatus(oid);
      }
    }
  }
});

// PIX confirmado com sucesso
function completePixPayment(order) {
  console.log('✅ Completando pagamento PIX:', order.id);
  notify.success('Pagamento PIX confirmado!', 3000);
  
  // ✅ Usar referência global
  const modal = currentPixOverlay;
  if (modal) {
    // Atualizar visualmente o modal para mostrar confirmação
    const statusEl = modal.querySelector('#pix-status-msg');
    if (statusEl) {
      statusEl.innerHTML = `
        <div style="animation: slideDown 0.5s ease-out; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 20px; border-radius: 12px; text-align: center; box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3);">
          <div style="font-size: 32px; margin-bottom: 8px;">✅</div>
          <div style="font-size: 18px; font-weight: 700; margin-bottom: 4px;">Pagamento Confirmado!</div>
          <div style="font-size: 14px; opacity: 0.95;">Seu pedido foi recebido com sucesso</div>
        </div>
      `;
      statusEl.style.display = 'flex';
      statusEl.style.justifyContent = 'center';
    }
    
    // Desabilitar/ocultar botões de ação
    const copyBtn = modal.querySelector('#pix-copy');
    const cancelBtn = modal.querySelector('#pix-cancel');
    const backBtn = modal.querySelector('#pix-back');
    const buttonsContainer = modal.querySelector('#pix-buttons-container');
    
    if (copyBtn) {
      copyBtn.disabled = true;
      copyBtn.style.opacity = '0.5';
      copyBtn.style.cursor = 'not-allowed';
    }
    if (cancelBtn) {
      cancelBtn.disabled = true;
      cancelBtn.style.opacity = '0.5';
      cancelBtn.style.cursor = 'not-allowed';
    }
    
    // Adicionar botão WhatsApp APÓS confirmação
    if (buttonsContainer) {
      const whatsappBtn = document.createElement('button');
      whatsappBtn.id = 'pix-whatsapp-confirmed';
      whatsappBtn.textContent = '📱 Enviar Pedido pelo WhatsApp';
      whatsappBtn.style.cssText = 'background:#10b981; color:white; border:none; padding:12px; border-radius:10px; font-weight:800; cursor:pointer; transition:all 0.3s ease;';
      whatsappBtn.addEventListener('click', () => {
        const brcode = order.payment?.qr_code || order.payment?.qrCode || '';
        let dateTimeStr = '';
        try {
          const created = order.created_at || order.createdAt || order.created;
          if (created) {
            const d = new Date(created);
            const dd = String(d.getDate()).padStart(2, '0');
            const MM = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            const hh = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            dateTimeStr = ` ${dd}/${MM}/${yyyy} - ${hh}:${min}`;
          }
        } catch (e) { /* ignore */ }
        const texto = `✅ Pagamento Confirmado!\\n\\nPedido: ${order.id}\\nTotal: R$ ${order.total.toFixed(2)}${dateTimeStr}\\n\\nChave PIX: ${brcode}`;
        const url = `https://wa.me/5581987508211?text=${encodeURIComponent(texto)}`;
        window.open(url, '_blank');
      });
      whatsappBtn.addEventListener('mouseenter', () => {
        whatsappBtn.style.backgroundColor = '#059669';
        whatsappBtn.style.transform = 'scale(1.02)';
      });
      whatsappBtn.addEventListener('mouseleave', () => {
        whatsappBtn.style.backgroundColor = '#10b981';
        whatsappBtn.style.transform = 'scale(1)';
      });
      buttonsContainer.insertBefore(whatsappBtn, cancelBtn);
    }
    
    if (backBtn) {
      backBtn.textContent = '✅ Fechar';
      backBtn.style.backgroundColor = '#10b981';
      backBtn.style.animation = 'pulse 2s infinite';
    }
    
    // 🚀 Marcar que o pagamento foi confirmado — modal NÃO fecha automaticamente
    // Vai fechar só quando o cliente voltar ao site
    modal._paymentConfirmed = true;
    console.log('✅ Pagamento confirmado. Modal permanece aberto até cliente retornar ao site...');
  }
}

// Cancelar pagamento PIX
function cancelPixPayment(orderId) {
  console.log('🔴 Cancelando pedido PIX:', orderId);
  
  clearInterval(paymentPollingInterval);
  
  // ✅ Usar referência global e verificar
  const modal = currentPixOverlay;
  if (modal && modal.parentElement === document.body) {
    // Parar o MutationObserver antes de remover
    if (modal._pixObserver) {
      modal._pixObserver.disconnect();
    }
    try {
      modal.remove();
      console.log('✅ Modal removido com sucesso');
    } catch (e) {
      console.warn('⚠️ Erro ao remover modal:', e);
    }
  }
  currentPixOverlay = null; // ← Limpar referência
  
  document.body.style.overflow = 'auto';
  paymentModal.classList.add('hidden');
  
  // Chamar backend para cancelar pedido e restaurar estoque
  try {
    fetch(`${API_URL}/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(res => res.json())
      .then(data => {
        console.log('✅ Pedido cancelado e estoque restaurado:', data);
        notify.success('Pagamento cancelado e estoque restaurado');
      })
      .catch(err => {
        console.error('Erro ao cancelar pedido:', err);
        notify.warning('Pagamento cancelado');
      });
  } catch (e) {
    console.warn('Erro ao chamar API de cancelamento:', e);
    notify.warning('Pagamento cancelado');
  }
}

// Timeout do pagamento
function pixPaymentTimeout(orderId) {
  const modal = document.querySelector('[id^="pix-qr-modal-"]');
  if (modal) modal.remove();
  document.body.style.overflow = 'auto';
  notify.error('Tempo de pagamento expirado. Tente novamente.');
}

// Mostrar confirmação
function showConfirmation(order) {
  document.getElementById('order-id-display').textContent = order.id;
  // Exibir data e hora do pedido (se disponível) no formato DD/MM/YYYY - HH:MM
  try {
    const created = order.created_at || order.createdAt || order.created;
    if (created) {
      const d = new Date(created);
      const dd = String(d.getDate()).padStart(2, '0');
      const MM = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const dateTimeStr = `${dd}/${MM}/${yyyy} - ${hh}:${min}`;
      const dtEl = document.getElementById('order-datetime-display');
      if (dtEl) dtEl.textContent = dateTimeStr;
    }
  } catch (e) {
    console.warn('Erro ao formatar data/hora do pedido:', e);
  }

  confirmationModal.classList.remove('hidden');
  notify.success(`Pedido #${order.id} confirmado! Aguarde atualizações por WhatsApp.`, 4000);

  // Ligar botão WhatsApp no modal de confirmação (inclui hora:minute)
  const whatsappConfirmBtn = document.getElementById('confirmation-whatsapp-btn');
  if (whatsappConfirmBtn) {
    whatsappConfirmBtn.addEventListener('click', () => {
      const created = order.created_at || order.createdAt || order.created;
      let dateTimeStr = '';
      if (created) {
        const d = new Date(created);
        const dd = String(d.getDate()).padStart(2, '0');
        const MM = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        dateTimeStr = ` ${dd}/${MM}/${yyyy} - ${hh}:${min}`;
      }
      const texto = `✅ Pagamento Confirmado!\\n\\nPedido: ${order.id}\\nTotal: R$ ${order.total.toFixed(2)}${dateTimeStr}\\n\\nOlá, segue meu pedido confirmado e pago. Aguardo a entrega!`;
      const url = `https://wa.me/5581987508211?text=${encodeURIComponent(texto)}`;
      window.open(url, '_blank');
    }, { once: true }); // Executar apenas uma vez
  }
}
