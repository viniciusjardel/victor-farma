// ============================================
// 🔐 SISTEMA DE AUTENTICAÇÃO DO PAINEL ADMIN
// ============================================

// API URL para autenticação
const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : 'https://victor-farma.onrender.com/api';

// Chave de sessão
const AUTH_KEY = 'victor_farma_admin_auth';
const REMEMBER_ME_KEY = 'victor_farma_remember_me';

// ============= INICIALIZAÇÃO =============
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔐 Inicializando sistema de login...');
  
  // Verificar se já está autenticado
  if (isAuthenticated()) {
    console.log('✅ Usuário já está autenticado. Redirecionando...');
    redirectToAdmin();
    return;
  }

  // Restaurar email se "lembrar-me" estava ativo
  const rememberMe = localStorage.getItem(REMEMBER_ME_KEY);
  if (rememberMe) {
    document.getElementById('email').value = rememberMe;
    document.getElementById('remember-me').checked = true;
  }

  // Setup do formulário
  setupFormListeners();
  console.log('✅ Sistema de login pronto!');
});

// ============= LISTENERS DO FORMULÁRIO =============
function setupFormListeners() {
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  if (!form) return;

  form.addEventListener('submit', handleLogin);

  // Limpar erro quando usuário começa a digitar
  emailInput.addEventListener('input', clearAlert);
  passwordInput.addEventListener('input', clearAlert);

  // Enter no campo de email vai para senha
  emailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      passwordInput.focus();
    }
  });

  // Enter no campo de senha envia o formulário
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  });
}

// ============= HANDLE LOGIN =============
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const rememberMe = document.getElementById('remember-me').checked;

  // Validações locais
  if (!email) {
    showAlert('Email é obrigatório', 'error');
    return;
  }

  if (!password) {
    showAlert('Senha é obrigatória', 'error');
    return;
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showAlert('Por favor, insira um email válido', 'error');
    return;
  }

  // Mostrar loading
  setButtonLoading(true);

  try {
    console.log('🔐 Enviando credenciais para o servidor...');
    
    // ✅ ENVIAR CREDENCIAIS PARA O BACKEND
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      console.warn('❌ Login recusado:', data.error);
      showAlert(data.error || 'Email ou senha incorretos', 'error');
      setButtonLoading(false);
      return;
    }

    console.log('✅ Autenticação bem-sucedida!');

    // Salvar token e preferências
    saveAuth(data.token, rememberMe ? email : null);

    // Mostrar sucesso
    showAlert('✅ Login realizado com sucesso! Redirecionando...', 'success');

    // Redirecionar após 1s
    setTimeout(() => {
      redirectToAdmin();
    }, 800);

  } catch (error) {
    console.error('❌ Erro ao fazer login:', error);
    showAlert('Erro ao conectar com servidor. Verifique sua conexão.', 'error');
    setButtonLoading(false);
  }
}

// ============= AUTENTICAÇÃO =============
function saveAuth(token, emailToRemember = null) {
  // Salvar token na sessionStorage (perdido ao fechar navegador)
  sessionStorage.setItem(AUTH_KEY, token);
  
  // Salvar email se "lembrar-me" foi marcado
  if (emailToRemember) {
    localStorage.setItem(REMEMBER_ME_KEY, emailToRemember);
  } else {
    localStorage.removeItem(REMEMBER_ME_KEY);
  }

  console.log('🔑 Token de autenticação salvo');
}

function isAuthenticated() {
  const token = sessionStorage.getItem(AUTH_KEY);
  return !!token;
}

// ============= LOGOUT =============
function logout() {
  console.log('👋 Fazendo logout...');
  sessionStorage.removeItem(AUTH_KEY);
  window.location.href = 'login.html';
}

// ============= REDIRECIONAMENTO =============
function redirectToAdmin() {
  console.log('📍 Redirecionando para o painel admin...');
  window.location.href = 'index.html';
}

// ============= UI HELPERS =============
function showAlert(message, type = 'error') {
  const alertBox = document.getElementById('alert-box');
  if (!alertBox) return;

  alertBox.textContent = message;
  alertBox.classList.remove('alert-error', 'alert-success', 'show');
  alertBox.classList.add(`alert-${type}`, 'show');

  // Auto-dismiss em 5 segundos para mensagens de sucesso
  if (type === 'success') {
    clearTimeout(alertBox._timeout);
    alertBox._timeout = setTimeout(() => {
      alertBox.classList.remove('show');
    }, 3000);
  }
}

function clearAlert() {
  const alertBox = document.getElementById('alert-box');
  if (alertBox) {
    alertBox.classList.remove('show');
  }
}

function setButtonLoading(loading) {
  const btn = document.getElementById('submit-btn');
  const spinner = document.getElementById('btn-spinner');
  const text = document.getElementById('btn-text');

  if (loading) {
    btn.disabled = true;
    spinner.style.display = 'inline-block';
    text.textContent = 'Autenticando...';
  } else {
    btn.disabled = false;
    spinner.style.display = 'none';
    text.textContent = 'Entrar';
  }
}

// ============= EXPORTS (para uso no admin) =============
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { isAuthenticated, logout, redirectToAdmin };
}
