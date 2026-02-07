// URL da API (configure com a URL do Render em produção)
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api'
  : 'https://seu-backend-render.onrender.com/api'; // Substituir com URL real do Render

let userId = localStorage.getItem('userId') || generateUserId();
let cart = [];
let products = [];
let currentOrder = null;

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

// Event Listeners
cartBtn.addEventListener('click', () => {
  cartModal.classList.remove('hidden');
  loadCart();
});

checkoutBtn.addEventListener('click', () => {
  cartModal.classList.add('hidden');
  checkoutModal.classList.remove('hidden');
});

checkoutForm.addEventListener('submit', handleCheckout);

document.getElementById('confirm-payment-btn').addEventListener('click', confirmPayment);
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

    // Exibir modal de pagamento
    checkoutModal.classList.add('hidden');
    displayPaymentModal(data.pixQRCode, data.order.total, data.order.id);
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

// Confirmar pagamento
async function confirmPayment() {
  try {
    const response = await fetch(`${API_URL}/orders/${currentOrder.id}/confirm-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      alert('Erro ao confirmar pagamento');
      return;
    }

    // Exibir confirmação
    paymentModal.classList.add('hidden');
    showConfirmation(currentOrder);
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao confirmar pagamento');
  }
}

// Mostrar confirmação
function showConfirmation(order) {
  document.getElementById('order-id-display').textContent = order.id;
  confirmationModal.classList.remove('hidden');
}
