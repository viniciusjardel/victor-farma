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

// Exibir modal com QR Code PIX em iframe isolado
function displayPixQrModal(pixData, amount, orderId) {
  const valorNumerico = parseFloat(amount);
  
  // Remover modal/iframe anterior se existir
  const existingIframe = document.getElementById('pix-qr-iframe');
  if (existingIframe) existingIframe.remove();

  // Determinar fonte do QR: base64, URL ou código BRcode (copia & cola)
  const base64 = pixData.qrCodeBase64 || pixData.qr_code_base64 || null;
  const qrUrl = pixData.qrCodeUrl || pixData.qr_code_url || null;
  const brcode = pixData.qrCode || pixData.qr_code || pixData.qr || null;

  console.log('displayPixQrModal - fontes detectadas:', { base64, qrUrl, brcode });

  // Criar iframe para isolar do CSS da página
  const iframe = document.createElement('iframe');
  iframe.id = 'pix-qr-iframe';
  iframe.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    border: none; z-index: 2147483647; background: rgba(0,0,0,0.6);
  `;

  // HTML do modal dentro do iframe
  const iframeHTML = `
    <!doctype html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>PIX - Victor Farma</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Arial, sans-serif;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
        }
        .modal-content {
          background: white;
          border-radius: 15px;
          padding: 40px;
          text-align: center;
          max-width: 500px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        h2 { margin-bottom: 20px; color: #333; }
        img { max-width: 100%; width: 280px; height: 280px; margin: 20px auto; border: 2px solid #ddd; border-radius: 10px; display: block; }
        p { color: #666; margin: 12px 0; font-size: 16px; }
        .valor { color: #e74c3c; font-weight: bold; }
        .info-text { color: #999; font-size: 14px; margin: 10px 0; }
        .success-text { color: #27ae60; font-size: 14px; margin-top: 20px; }
        textarea {
          width: 100%;
          min-height: 100px;
          padding: 10px;
          margin-top: 10px;
          border-radius: 6px;
          border: 1px solid #ddd;
          font-size: 12px;
          font-family: monospace;
          resize: vertical;
        }
        button {
          margin-top: 12px;
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          color: white;
        }
        #copy-btn { background: #3498db; }
        #copy-btn:hover { background: #2980b9; }
        #cancel-btn { background: #e74c3c; margin-top: 20px; }
        #cancel-btn:hover { background: #c0392b; }
        .label { margin-top: 20px; font-size: 14px; color: #666; display: block; }
      </style>
    </head>
    <body>
      <div class="modal-content">
        <h2>Escaneie o QR Code PIX</h2>
        ${ base64 ? `<img src="data:image/png;base64,${base64}" alt="QR PIX">` : (qrUrl ? `<img src="${qrUrl}" alt="QR PIX">` : '') }
        <p><span class="valor">R$ ${valorNumerico.toFixed(2)}</span></p>
        ${ brcode ? `
          <label class="label">Código (copia & cola)</label>
          <textarea id="brcode-text" readonly>${brcode}</textarea>
          <button id="copy-btn">📋 Copiar código</button>
        ` : '' }
        <p class="info-text">Aguardando confirmação do pagamento...</p>
        <p class="success-text">✓ Verifique seu app de banco e confirme o pagamento</p>
        <button id="cancel-btn">Cancelar</button>
      </div>
      <script>
        document.getElementById('copy-btn')?.addEventListener('click', function() {
          const ta = document.getElementById('brcode-text');
          if (ta) {
            ta.select();
            document.execCommand('copy');
            this.textContent = '✓ Copiado!';
            setTimeout(() => { this.textContent = '📋 Copiar código'; }, 2000);
          }
        });
        document.getElementById('cancel-btn').addEventListener('click', function() {
          window.parent.cancelPixPayment('${orderId}');
        });
      </script>
    </body>
    </html>
  `;

  document.body.appendChild(iframe);
  
  // Escrever conteúdo no iframe
  iframe.onload = () => {
    try {
      iframe.contentDocument.open();
      iframe.contentDocument.write(iframeHTML);
      iframe.contentDocument.close();
      console.log('Pix modal em iframe carregado com sucesso (#pix-qr-iframe)');
    } catch (e) {
      console.error('Erro ao escrever em iframe:', e);
      // Fallback: escrever como string antes de adicionar ao DOM
      iframe.srcdoc = iframeHTML;
    }
  };

  // Fallback para navegadores que não permitem document.write
  iframe.srcdoc = iframeHTML;
  
  paymentModal.classList.add('hidden');
  document.body.style.overflow = 'hidden';
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
  const iframe = document.getElementById('pix-qr-iframe');
  if (iframe) iframe.remove();
  document.body.style.overflow = 'auto';

  currentOrder = order;
  showConfirmation(order);
}

// Cancelar pagamento PIX
function cancelPixPayment(orderId) {
  clearInterval(paymentPollingInterval);
  const iframe = document.getElementById('pix-qr-iframe');
  if (iframe) iframe.remove();
  document.body.style.overflow = 'auto';
  paymentModal.classList.add('hidden');
  alert('Pagamento cancelado');
}

// Timeout do pagamento
function pixPaymentTimeout(orderId) {
  const iframe = document.getElementById('pix-qr-iframe');
  if (iframe) iframe.remove();
  document.body.style.overflow = 'auto';
  alert('Tempo de pagamento expirado. Tente novamente.');
}

// Mostrar confirmação
function showConfirmation(order) {
  document.getElementById('order-id-display').textContent = order.id;
  confirmationModal.classList.remove('hidden');
}
