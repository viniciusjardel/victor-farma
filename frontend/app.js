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
    productsContainer.innerHTML = '<p class="loading">Nenhum produto encontrado</p>';
    return;
  }

  productsContainer.innerHTML = productsToDisplay.map(product => `
    <div class="product-card">
      <div class="product-image">
        ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}">` : 'Sem imagem'}
      </div>
      <h3 class="product-name">${product.name}</h3>
      <p class="product-description">${product.description || ''}</p>
      <p class="product-price">R$ ${parseFloat(product.price).toFixed(2)}</p>
      <p class="product-stock ${product.stock < 10 ? 'low' : ''}">Estoque: ${product.stock} un</p>
      <button class="add-to-cart-btn" ${product.stock === 0 ? 'disabled' : ''} onclick="addToCart('${product.id}')">
        ${product.stock === 0 ? 'Fora de estoque' : 'Adicionar ao carrinho'}
      </button>
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
    cartItemsDiv.innerHTML = '<p class="empty-cart">Seu carrinho está vazio</p>';
    checkoutBtn.disabled = true;
    cartTotalSpan.textContent = 'R$ 0.00';
    return;
  }

  checkoutBtn.disabled = false;
  let total = 0;

  cartItemsDiv.innerHTML = cart.map(item => {
    total += parseFloat(item.subtotal);
    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">R$ ${parseFloat(item.price).toFixed(2)}</div>
        </div>
        <div class="cart-item-controls">
          <button class="quantity-btn" onclick="updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
          <span class="quantity-display">${item.quantity}</span>
          <button class="quantity-btn" onclick="updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
          <button class="remove-btn" onclick="removeFromCart('${item.id}')">Remover</button>
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
    loadingDiv.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: white; padding: 40px; border-radius: 10px; 
      box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 1000;
    `;
    loadingDiv.innerHTML = '<p style="font-size: 18px;">Gerando QR Code PIX...</p>';
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
  overlay.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background: rgba(0,0,0,0.6) !important;
    z-index: 2147483647 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    margin: 0 !important;
    padding: 20px !important;
    box-sizing: border-box !important;
    font-family: Arial, sans-serif !important;
  `;

  // Container do card
  const card = document.createElement('div');
  card.style.cssText = `
    background: white !important;
    border-radius: 15px !important;
    padding: 40px !important;
    text-align: center !important;
    max-width: 500px !important;
    width: 100% !important;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important;
    box-sizing: border-box !important;
    margin: 0 !important;
  `;

  // Conteúdo HTML
  card.innerHTML = `
    <h2 style="margin: 0 0 20px 0 !important; color: #333 !important; font-size: 24px !important;">Escaneie o QR Code PIX</h2>
    ${base64 ? `<img src="data:image/png;base64,${base64}" alt="QR PIX" style="max-width: 100% !important; width: 280px !important; height: 280px !important; margin: 20px auto !important; border: 2px solid #ddd !important; border-radius: 10px !important; display: block !important;">` : ''}
    <p style="color: #666 !important; margin: 12px 0 !important; font-size: 16px !important;">Valor: <strong style="color: #e74c3c !important;">R$ ${valorNumerico.toFixed(2)}</strong></p>
    ${brcode ? `
      <label style="display: block !important; margin-top: 20px !important; font-size: 14px !important; color: #666 !important;">Código (copia & cola)</label>
      <textarea id="pix-brcode" readonly style="width: 100% !important; min-height: 100px !important; padding: 10px !important; margin-top: 10px !important; border-radius: 6px !important; border: 1px solid #ddd !important; font-size: 12px !important; font-family: monospace !important; box-sizing: border-box !important; resize: vertical !important;">${brcode}</textarea>
      <button id="pix-copy" style="margin-top: 12px !important; padding: 10px 20px !important; background: #3498db !important; color: white !important; border: none !important; border-radius: 5px !important; cursor: pointer !important; font-size: 14px !important; font-weight: bold !important;">📋 Copiar código</button>
    ` : ''}
    <p style="color: #999 !important; font-size: 14px !important; margin: 10px 0 !important;">Aguardando confirmação do pagamento...</p>
    <p style="color: #27ae60 !important; font-size: 14px !important; margin-top: 20px !important;">✓ Verifique seu app de banco e confirme o pagamento</p>
    <button id="pix-cancel" style="margin-top: 20px !important; padding: 12px 30px !important; background: #e74c3c !important; color: white !important; border: none !important; border-radius: 5px !important; cursor: pointer !important; font-size: 16px !important; font-weight: bold !important;">Cancelar</button>
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
