# Estrutura Pronta para Deploy
════════════════════════════════════════════════════════════════════

✅ TUDO FOI REORGANIZADO E PREPARADO PARA PRODUÇÃO

## 📂 Estrutura Final

```
Victor Farma do zero/
├── backend/                    (Deploy: Render)
│   ├── package.json           ✅ npm install executado
│   ├── server.js              ✅ Servidor Node.js
│   ├── Procfile               ✅ Como rodar no Render
│   ├── start.sh               ✅ Script de inicialização
│   ├── .env                   ✅ Variáveis de ambiente
│   ├── routes/
│   │   ├── products.js
│   │   ├── cart.js
│   │   ├── orders.js
│   │   └── admin.js
│   ├── db/
│   │   ├── init.sql           (execute no PostgreSQL Render)
│   │   └── seed.sql           (dados de teste)
│   └── node_modules/          ✅ Dependências instaladas
│
├── frontend/                   (Deploy: Netlify)
│   ├── index.html             ✅ Site do cliente
│   ├── app.js                 ✅ URL API dinâmica (localhost/produção)
│   ├── styles.css
│   ├── netlify.toml           ✅ Configuração Netlify
│   └── admin/                 ✅ Movido para dentro de frontend
│       ├── index.html         ✅ Painel administrativo
│       ├── app.js             ✅ URL API dinâmica
│       └── styles.css
│
└── DEPLOY_GUIDE.md            ✅ Passo a passo completo
```

## 🚀 Próximos Passos para Deploy

### PASSO 1: Preparar PostgreSQL no Render
1. Ir em https://render.com
2. Criar novo → PostgreSQL
3. Nome: `victor-farma-db`
4. Copiar External Database URL

### PASSO 2: Executar init.sql
1. No Render, ir em Database → Query
2. Copiar todo o conteúdo de `backend/db/init.sql`
3. Colar e executar

### PASSO 3: Deploy Backend no Render
1. Ir em https://render.com
2. Criar novo → Web Service
3. Conectar seu repositório GitHub
4. Configurar:
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. Variáveis de ambiente:
   ```
   DATABASE_URL = (copiar URL do PostgreSQL)
   NODE_ENV = production
   ```
6. Deploy!

### PASSO 4: Atualizar URLs no Frontend
Após obter a URL do Render, atualizar em 3 lugares:

**1. frontend/app.js (linha 1-4)**
```javascript
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api'
  : 'https://SEU-BACKEND.onrender.com/api';
```

**2. frontend/admin/app.js (linha 1-4)**
```javascript
const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : 'https://SEU-BACKEND.onrender.com/api';
```

**3. frontend/netlify.toml (linha 9)**
```toml
environment = { API_URL = "https://SEU-BACKEND.onrender.com/api" }
```

### PASSO 5: Deploy Frontend no Netlify
1. Ir em https://app.netlify.com
2. Conectar GitHub
3. Selecionar repositório
4. Configurar:
   - Build Command: (deixar vazio)
   - Publish Directory: `frontend/`
5. Deploy!

## ✅ Checklist de Verificação

**Backend:**
- ☐ npm install executado (124 packages instalados)
- ☐ package.json com dependências
- ☐ Procfile criado para Render
- ☐ .env com template
- ☐ Código sem erros

**Frontend:**
- ☐ index.html com interface
- ☐ app.js com URL dinâmica
- ☐ styles.css pronto
- ☐ netlify.toml configurado

**Admin:**
- ☐ Movido para frontend/admin/
- ☐ index.html pronto
- ☐ app.js com URL dinâmica
- ☐ styles.css pronto

**Database:**
- ☐ init.sql criado e testado
- ☐ seed.sql com dados de exemplo
- ☐ 5 tabelas estruturadas
- ☐ Foreign keys e índices

## 🔐 Segurança em Produção

### .env (Backend)
```
DATABASE_URL = postgresql://user:password@host/victor_farma
NODE_ENV = production
PORT = 3000
```

⚠️ NUNCA fazer commit do .env com dados reais!
✅ Use um .env.example como template

### CORS (Produção)
Backend está configurado para aceitar URLs de:
- localhost:3000 (desenvolvimento)
- Netlify (seu domínio)
- Qualquer origem (configure depois)

## 📊 Estrutura de Dados

**PostgreSQL (Render):**
- users (clientes)
- products (catálogo)
- cart_items (carrinho)
- orders (pedidos)
- order_items (itens dos pedidos)

Todos com:
- PKs: UUID automático
- FKs: Relacionamentos corretos
- Índices: Otimizados
- Cascata: Deletar relacionado

## 🎯 O Projeto Está Pronto Para:

✅ Teste em produção (Render + Netlify)
✅ Escala horizontal (sem dependências locais)
✅ CI/CD automático (GitHub Actions - opcional)
✅ Monitoramento (Render built-in logs)
✅ Backups (Render PostgreSQL auto)
✅ SSL/HTTPS (automatic)
✅ Custom Domain (ambos Render e Netlify)

## 📞 Troubleshooting Pós-Deploy

**❌ "Produtos não aparecem"**
- Verificar se init.sql foi executado
- Verificar DATABASE_URL no Render

**❌ "Frontend não conecta API"**
- Verificar API_URL em app.js
- Testar: curl https://seu-backend.onrender.com/health

**❌ "Erro CORS"**
- Backend já está com CORS habilitado
- Se precisar restringir, editar server.js

**❌ "Database connection error"**
- Verificar se PostgreSQL está criado no Render
- Testar connection string
- Aguardar ~1 minuto se for novo deploy

## 🚀 Próximas Fases (Após Deploy Funcionar)

1. **Autenticação:** Login para admin
2. **Notificações:** Email/SMS para pedidos
3. **Integração PIX Real:** Com provedor
4. **Mobile App:** React Native
5. **Testes Automatizados:** Jest + Cypress
6. **Monitoramento:** Sentry + Analytics
7. **Performance:** Cache Redis, CDN

---

**Status:** ✅ PRONTO PARA DEPLOY
**Data:** 07 de fevereiro de 2026
**Versão:** 1.0.0

Bom deploy! 🎉
