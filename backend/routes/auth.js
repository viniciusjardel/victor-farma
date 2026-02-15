const express = require('express');
const router = express.Router();

// ============================================
// 🔐 ROTAS DE AUTENTICAÇÃO DO PAINEL ADMIN
// ============================================

// Credenciais do admin (em produção, isso viria de um .env seguro)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admvictorfarma@outlook.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Vicguto1402';

// Header de resposta para evitar cache
const noCacheHeaders = (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });
  next();
};

router.use(noCacheHeaders);

// ============= LOGIN =============
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ LOG para debug (remover em produção)
    console.log(`🔐 Tentativa de login. Email: ${email}`);

    // Validar entrada
    if (!email || !password) {
      console.warn('❌ Faltam credenciais');
      return res.status(400).json({ 
        error: 'Email e senha são obrigatórios' 
      });
    }

    // Validar credenciais (AQUI NO BACKEND, não no cliente!)
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      console.warn(`❌ Credenciais inválidas para: ${email}`);
      
      // Esperar um pouco para evitar brute force
      setTimeout(() => {
        res.status(401).json({ 
          error: 'Email ou senha incorretos' 
        });
      }, 500);
      return;
    }

    // ✅ SUCESSO: Gerar token de sessão
    console.log(`✅ Login bem-sucedido para: ${email}`);
    
    // Token simples com timestamp (em produção, usar JWT)
    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');

    res.json({
      success: true,
      token,
      email,
      message: 'Login realizado com sucesso',
      expiresIn: 3600 // 1 hora em segundos
    });

  } catch (error) {
    console.error('❌ Erro no login:', error.message);
    res.status(500).json({ 
      error: 'Erro ao processar login' 
    });
  }
});

// ============= VERIFICAR SESSÃO =============
router.get('/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      console.warn('❌ Token não fornecido');
      return res.status(401).json({ 
        authenticated: false,
        error: 'Token não fornecido' 
      });
    }

    // Validar token
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [email] = decoded.split(':');

      if (email !== ADMIN_EMAIL) {
        console.warn('❌ Token inválido');
        return res.status(401).json({ 
          authenticated: false,
          error: 'Token inválido' 
        });
      }

      console.log('✅ Token válido');
      res.json({
        authenticated: true,
        email,
        message: 'Token válido'
      });

    } catch (tokenError) {
      console.error('❌ Erro ao decodificar token:', tokenError.message);
      res.status(401).json({ 
        authenticated: false,
        error: 'Token inválido ou expirado' 
      });
    }

  } catch (error) {
    console.error('❌ Erro ao verificar sessão:', error.message);
    res.status(500).json({ 
      error: 'Erro ao verificar sessão' 
    });
  }
});

// ============= LOGOUT =============
router.post('/logout', (req, res) => {
  try {
    console.log('👋 Logout realizado');
    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro no logout:', error);
    res.status(500).json({ error: 'Erro ao fazer logout' });
  }
});

module.exports = router;
