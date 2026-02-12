```
Victor Farma do zero/
│
├── 📄 README.md                    # Documentação principal
├── 📄 QUICKSTART.md                # Guia rápido de instalação
├── 📄 API_DOCUMENTATION.md         # Documentação completa da API
├── 📄 docker-compose.yml           # Configuração Docker (opcional)
├── 📄 .gitignore                   # Git ignore rules
├── 📄 install.sh                   # Script de instalação
│
├── 📁 backend/                     # API Node.js + Express
│   ├── 📄 package.json             # Dependências do Node
│   ├── 📄 server.js                # Arquivo principal do servidor
│   ├── 📄 .env.example             # Template do arquivo .env
│   ├── 📄 .gitignore               # Git ignore do backend
│   ├── 📄 Dockerfile               # Container Docker
│   │
│   ├── 📁 routes/                  # Rotas da API
│   │   ├── products.js             # CRUD de produtos
│   │   ├── cart.js                 # Gerenciamento de carrinho
│   │   ├── orders.js               # Criação e gerencimento de pedidos
│   │   └── admin.js                # Dashboard e relatórios
│   │
│   └── 📁 db/                      # Scripts do banco de dados
│       ├── init.sql                # Script de criação (TABELAS)
│       └── seed.sql                # Dados de exemplo para testes
│
├── 📁 frontend/                    # Site do cliente
│   ├── 📄 index.html               # Página principal
│   ├── 📄 styles.css               # Estilos (sem design ainda)
│   ├── 📄 app.js                   # Lógica e funcionalidades
│   │   ├── Listar produtos
│   │   ├── Adicionar ao carrinho
│   │   ├── Gerenciar carrinho
│   │   ├── Checkout
│   │   ├── Pagamento PIX
│   │   └── Confirmação de pedido
│   │
│   └── Funcionalidades:
│       ✅ Catálogo de produtos
│       ✅ Carrinho de compras
│       ✅ Finalizar pedido
│       ✅ QR Code PIX
│       ✅ Confirmação de pedido
│
├── 📁 admin/                       # Painel administrativo
│   ├── 📄 index.html               # Página do admin
│   ├── 📄 styles.css               # Estilos do admin
│   ├── 📄 app.js                   # Lógica do admin
│   │   ├── Dashboard
│   │   ├── CRUD de produtos
│   │   ├── Gerencimento de pedidos
│   │   ├── Relatórios
│   │   └── Produtos mais vendidos
│   │
│   └── Funcionalidades:
│       ✅ Dashboard com métricas
│       ✅ Gerenciar produtos
│       ✅ Acompanhar pedidos
│       ✅ Atualizar status
│       ✅ Relatórios de vendas
│       ✅ Alertas de estoque baixo
│
└── 📁 .github/                    # Configurações do GitHub
    └── (será preenchido depois)
```

## 📊 Fluxo de Dados

```
Cliente (Frontend)
    ↓
Adiciona ao carrinho (localStorage + API)
    ↓
Finaliza pedido (envia para backend)
    ↓
Backend cria pedido no PostgreSQL
    ↓
Gera QR Code PIX
    ↓
Admin recebe notificação (via dashboard)
    ↓
Admin atualiza status → Cliente vê no histórico
```

## 🗄️ Diagrama do Banco de Dados

```
┌─────────────┐
│   USERS     │
├─────────────┤
│ id (PK)     │
│ name        │
│ email       │
│ phone       │
│ created_at  │
└─────────────┘
      ↑
      │ has many
      │
┌─────────────────────────┐         ┌──────────────┐
│   ORDERS                │ has  ←→  │  PRODUCTS    │
├─────────────────────────┤ many    ├──────────────┤
│ id (PK)                 │         │ id (PK)      │
│ user_id (FK)            │         │ name         │
│ customer_name           │         │ description  │
│ customer_phone          │         │ price        │
│ delivery_address        │         │ stock        │
│ total                   │         │ category     │
│ payment_method          │         │ image_url    │
│ status                  │         │ created_at   │
│ created_at              │         │ updated_at   │
└─────────────────────────┘         └──────────────┘
      │
      │ has many
      ↓
┌──────────────────────┐
│  ORDER_ITEMS         │
├──────────────────────┤
│ id (PK)              │
│ order_id (FK)        │
│ product_id (FK)      │
│ quantity             │
│ price                │
│ created_at           │
└──────────────────────┘

┌────────────────────────────┐
│   CART_ITEMS               │
├────────────────────────────┤
│ id (PK)                    │
│ user_id (FK) → USERS       │
│ product_id (FK) → PRODUCTS │
│ quantity                   │
│ created_at                 │
└────────────────────────────┘
```

## 🔄 Status de Pedidos

```
PENDING (Pendente)
    ↓ [Usuário pagou com PIX]
CONFIRMED (Confirmado)
    ↓ [Admin iniciou preparação]
PREPARING (Preparando)
    ↓ [Entregador pegou o pedido]
OUT_FOR_DELIVERY (Em entrega)
    ↓ [Entregador entregou]
DELIVERED (Entregue)

OU em qualquer momento:
CANCELLED (Cancelado) ✗
```

## 🎯 Endpoints Principais

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/products` | Listar produtos |
| POST | `/products` | Criar produto (admin) |
| GET/PUT/DELETE | `/products/:id` | Operações produto |
| GET | `/cart/:userId` | Ver carrinho |
| POST | `/cart/:userId/add` | Adicionar ao carrinho |
| POST | `/orders` | Criar pedido |
| PATCH | `/orders/:id/status` | Atualizar status |
| GET | `/admin/dashboard` | Dashboard |
| GET | `/admin/reports/sales` | Relatório de vendas |

## ✨ Tecnologias

**Backend:**
- Node.js + Express.js
- PostgreSQL (Render)
- UUID para IDs
- JSON Web Services

**Frontend:**
- HTML5 (sem framework)
- CSS3 Vanilla
- JavaScript ES6+
- localStorage para carrinho

**DevOps:**
- Docker (opcional)
- Render (banco de dados)
- GitHub (versionamento)

## 🚀 Pronto para Começar?

1. Veja: **QUICKSTART.md** para setup rápido
2. Leia: **README.md** para documentação completa
3. Consulte: **API_DOCUMENTATION.md** para detalhes de endpoints
