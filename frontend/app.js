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
});

// Buscar produtos
async function loadProducts() {
  try {
    const response = await fetch(`${API_URL}/products`);
    const data = await response.json();
    products = data;
    displayProducts(products);
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    productsContainer.innerHTML = '<p class="loading">Erro ao carregar produtos. Tente novamente.</p>';
  }
}

// Exibir produtos
function displayProducts(productsToDisplay) {
  if (productsToDisplay.length === 0) {
    productsContainer.innerHTML = '<p class="col-span-full text-center text-gray-500 py-12">Nenhum produto encontrado</p>';
    return;
  }

  productsContainer.innerHTML = productsToDisplay.map(product => `
    <div class="bg-white rounded-lg shadow hover:shadow-lg product-card overflow-hidden flex flex-col">
      <div class="bg-gradient-to-br from-green-100 to-green-50 h-32 sm:h-40 flex items-center justify-center overflow-hidden">
        ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}" class="w-full h-full object-cover">` : '<span class="text-gray-400 text-sm text-center px-2">Sem imagem</span>'}
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
            ${product.stock === 0 ? '❌ Fora de estoque' : '➕ Entrega'}
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
  try {
    const response = await fetch(`${API_URL}/cart/${userId}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity: 1 })
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.error || 'Erro ao adicionar ao carrinho');
      return;
    }

    alert('Produto adicionado ao carrinho!');
    loadCart();
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao adicionar ao carrinho');
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
      loadCart();
    } else {
      alert('Erro ao atualizar quantidade');
    }
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao atualizar quantidade');
  }
}

// Remover do carrinho
async function removeFromCart(itemId) {
  try {
    const response = await fetch(`${API_URL}/cart/${userId}/item/${itemId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      loadCart();
    } else {
      alert('Erro ao remover item');
    }
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao remover item');
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
      alert(error.error || 'Erro ao criar pedido');
      return;
    }

    const data = await response.json();
    currentOrder = data.order;

    // Gerar PIX real do Mercado Pago
    generatePixPayment(data.order.id, data.order.total);
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao processar pedido');
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
      alert(error.error || 'Erro ao gerar PIX');
      return;
    }

    const pixData = await response.json();
    loadingDiv.remove();

    console.log('generatePixPayment - resposta do backend:', pixData);

    // Exibir modal com QR code (com fallback para diferentes campos retornados)
    displayPixQrModal(pixData, amount, orderId);

    // Iniciar polling para verificar status
    const paymentId = pixData.paymentId || pixData.id || pixData.payment_id;
    console.log('Iniciando polling com paymentId:', paymentId, 'orderId:', orderId);
    startPaymentPolling(paymentId, orderId);

  } catch (error) {
    console.error('Erro ao gerar PIX:', error);
    const loading = document.getElementById('pix-loading');
    if (loading) loading.remove();
    alert('Erro ao gerar PIX');
  }
}

// Exibir modal com QR Code PIX
function displayPixQrModal(pixData, amount, orderId) {
  const valorNumerico = parseFloat(amount);
  
  // Remover qualquer modal anterior
  const existing = document.getElementById('pix-qr-modal');
  if (existing) existing.remove();

  // Determinar fonte do QR
  const base64 = pixData.qrCodeBase64 || pixData.qr_code_base64 || null;
  const qrUrl = pixData.qrCodeUrl || pixData.qr_code_url || null;
  const brcode = pixData.qrCode || pixData.qr_code || pixData.qr || null;

  console.log('displayPixQrModal - fontes detectadas:', { base64, qrUrl, brcode });

  // Criar overlay (escurecimento)
  const overlay = document.createElement('div');
  overlay.id = 'pix-qr-modal';
  overlay.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-5 z-[2147483647]';
  overlay.style.zIndex = '2147483647 !important';

  // Container do card
  const card = document.createElement('div');
  card.className = 'bg-white rounded-2xl p-10 text-center max-w-md w-full shadow-2xl';

  // Conteúdo HTML
  card.innerHTML = `
    <h2 class="text-2xl font-bold text-gray-800 mb-5">Escaneie o QR Code PIX</h2>
    ${base64 ? `<img src="data:image/png;base64,${base64}" alt="QR PIX" class="block mx-auto w-72 h-72 my-5 border-2 border-gray-300 rounded-lg">` : ''}
    <p class="text-gray-600 text-base my-3">Valor: <strong class="text-red-600 font-bold">R$ ${valorNumerico.toFixed(2)}</strong></p>
    ${brcode ? `
      <label class="block mt-5 text-sm text-gray-600">Código (copia & cola)</label>
      <textarea id="pix-brcode" readonly class="w-full min-h-24 p-3 mt-2 border border-gray-300 rounded-lg text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-green-500">${brcode}</textarea>
      <button id="pix-copy" class="mt-3 px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold cursor-pointer transition-colors">📋 Copiar código</button>
    ` : ''}
    <p class="text-gray-500 text-sm my-2">Aguardando confirmação do pagamento...</p>
    <p class="text-green-600 text-sm mt-5 font-semibold">✓ Verifique seu app de banco e confirme o pagamento</p>
    <button id="pix-cancel" class="mt-5 px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold cursor-pointer transition-colors text-base">Cancelar</button>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  console.log('Modal QR criado. overlay rect:', overlay.getBoundingClientRect());

  // Ligar botões
  const copyBtn = document.getElementById('pix-copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      const ta = document.getElementById('pix-brcode');
      ta.select();
      document.execCommand('copy');
      this.textContent = '✓ Copiado!';
      setTimeout(() => { this.textContent = '📋 Copiar código'; }, 2000);
    });
  }

  const cancelBtn = document.getElementById('pix-cancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      cancelPixPayment(orderId);
    });
  }

  paymentModal.classList.add('hidden');
}

// Fazer polling para verificar status do pagamento
function startPaymentPolling(paymentId, orderId) {
  let attempts = 0;
  const maxAttempts = 120; // 10 minutos (cda 5 segundos)

  paymentPollingInterval = setInterval(async () => {
    attempts++;

    try {
      const response = await fetch(`${API_URL}/orders/${orderId}`);
      if (!response.ok) return;

      const data = await response.json();
      const order = data.order;

      // Se pagamento foi confirmado (webhook atualiza status)
      if (order.status === 'confirmed' && order.payment_status === 'approved') {
        clearInterval(paymentPollingInterval);
        completePixPayment(order);
        return;
      }

    } catch (error) {
      console.error('Erro ao verificar pagamento:', error);
    }

    // Timeout após 10 minutos
    if (attempts >= maxAttempts) {
      clearInterval(paymentPollingInterval);
      pixPaymentTimeout(orderId);
    }
  }, 5000); // Verificar a cada 5 segundos
}

// PIX confirmado com sucesso
function completePixPayment(order) {
  const modal = document.getElementById('pix-qr-modal');
  if (modal) modal.remove();
  document.body.style.overflow = 'auto';

  currentOrder = order;
  showConfirmation(order);
}

// Cancelar pagamento PIX
function cancelPixPayment(orderId) {
  clearInterval(paymentPollingInterval);
  const modal = document.getElementById('pix-qr-modal');
  if (modal) modal.remove();
  document.body.style.overflow = 'auto';
  paymentModal.classList.add('hidden');
  alert('Pagamento cancelado');
}

// Timeout do pagamento
function pixPaymentTimeout(orderId) {
  const modal = document.getElementById('pix-qr-modal');
  if (modal) modal.remove();
  document.body.style.overflow = 'auto';
  alert('Tempo de pagamento expirado. Tente novamente.');
}

// Mostrar confirmação
function showConfirmation(order) {
  document.getElementById('order-id-display').textContent = order.id;
  confirmationModal.classList.remove('hidden');
}
