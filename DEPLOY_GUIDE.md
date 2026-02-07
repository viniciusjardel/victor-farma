📱 FRONTEND - Deploy no Netlify
════════════════════════════════════════════════

1. PREPARAR FRONTEND PARA DEPLOY:

   ✅ Estrutura:
   frontend/
   ├── index.html           (site cliente)
   ├── admin/
   │   ├── index.html       (painel admin)
   │   ├── styles.css
   │   └── app.js
   ├── app.js
   ├── styles.css
   └── netlify.toml

2. FAZER DEPLOY NO NETLIFY:

   a) Conectar GitHub ao Netlify:
      • Ir em: https://app.netlify.com
      • Clicar em "New site from Git"
      • Selecionar repositório
      • Branch: main (ou seu branch)
   
   b) Configurar build:
      • Build command: (deixar vazio ou "echo ok")
      • Publish directory: frontend/
      • Deploy!

   c) Variáveis de ambiente (IMPORTANTE):
      No Netlify, ir em: Site settings → Build & deploy → Environment
      Adicionar: API_URL = sua-api-url-do-render.onrender.com/api

3. FRONTEND ESTARÁ EM:
   https://seu-site.netlify.app/


═════════════════════════════════════════════════════════════════════

🖥️ BACKEND - Deploy no Render
════════════════════════════════════════════════════════════════════

1. PREPARAR BACKEND:

   ✅ package.json está configurado
   ✅ Procfile criado
   ✅ .env.example existe
   ✅ start.sh pronto

2. FAZER DEPLOY NO RENDER:

   a) Criar serviço PostgreSQL:
      • Ir em: https://render.com
      • Novo → PostgreSQL
      • Nome: victor-farma-db
      • Copiar: External Database URL

   b) Criar serviço Web:
      • Novo → Web Service
      • Conectar GitHub repo
      • Build command: npm install
      • Start command: node server.js
      • Variáveis de ambiente:
        DATABASE_URL = (colar URL do PostgreSQL)
        NODE_ENV = production

   c) Deploy automático!

3. BACKEND ESTARÁ EM:
   https://seu-backend-render.onrender.com


═════════════════════════════════════════════════════════════════════

🔧 APÓS DEPLOY - PRÓXIMOS PASSOS
════════════════════════════════════════════════════════════════════

1. Atualizar URLs no código:
   
   frontend/app.js (linha ~1):
   Substituir: https://seu-backend-render.onrender.com/api
   Por: URL real do Render
   
   frontend/admin/app.js (linha ~1):
   Substituir: https://seu-backend-render.onrender.com/api
   Por: URL real do Render
   
   frontend/netlify.toml (linha ~9):
   Substituir: https://seu-backend-render.onrender.com/api
   Por: URL real do Render

2. Executar init.sql no banco:
   • Ir no Render → PostgreSQL
   • Query
   • Copiar conteúdo de backend/db/init.sql
   • Executar

3. Testar fluxo:
   • Abrir frontend
   • Adicionar produto ao carrinho
   • Finalizar pedido
   • Ver no admin


═════════════════════════════════════════════════════════════════════

📋 CHECKLIST FINAL
════════════════════════════════════════════════════════════════════

ANTES DE DEPLOY:
  ☐ Backend: npm install executado ✅
  ☐ Database URL obtido do Render
  ☐ init.sql preparado
  ☐ Procfile pronto ✅
  ☐ .env criado ✅

FRONTEND:
  ☐ Frontend estrutura ok ✅
  ☐ Admin movido para frontend/ ✅
  ☐ netlify.toml criado ✅
  ☐ URLs da API atualizadas ✅

BACKEND:
  ☐ Render PostgreSQL criado
  ☐ Render Web Service criado
  ☐ DATABASE_URL configurado
  ☐ init.sql executado no banco

PÓS-DEPLOY:
  ☐ Frontend está online
  ☐ Backend está online
  ☐ Produtos aparecem
  ☐ Consegue fazer pedido
  ☐ Admin carrega
  ☐ Pedidos aparecem no admin


═════════════════════════════════════════════════════════════════════
