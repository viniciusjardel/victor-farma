# Victor Farma - Delivery de Farmácia

Projeto full-stack de delivery para farmácia com painel administrativo.

## 🏗️ Arquitetura

```
victor-farma/
├── backend/          # API Node.js + Express
├── frontend/         # Site do cliente
└── admin/           # Painel administrativo
```

## 📋 Funcionalidades

### Frontend (Cliente)
- ✅ Visualizar catálogo de produtos
- ✅ Adicionar produtos ao carrinho
- ✅ Finalizar pedido com dados de entrega
- ✅ Pagamento via PIX (QR Code)
- ✅ Confirmação de pedido

### Backend (API REST)
- ✅ Gerenciar produtos (CRUD)
- ✅ Gerenciar carrinho de compras
- ✅ Processar pedidos
- ✅ Gerar QR Code PIX
- ✅ Atualizar status de pedidos
- ✅ Relatórios de vendas
- ✅ Produtos mais vendidos
- ✅ Produtos com estoque baixo

### Admin (Painel Administrativo)
- ✅ Dashboard com métricas
- ✅ CRUD de produtos
- ✅ Gerenciar pedidos (ver detalhes e atualizar status)
- ✅ Relatórios de vendas
- ✅ Produtos mais vendidos
- ✅ Alerta de estoque baixo

## 🛠️ Stack Tecnológico

**Backend:**
- Node.js
- Express.js
- PostgreSQL
- UUID
- CORS

**Frontend:**
- HTML5
- CSS3
- JavaScript Vanilla

## 🚀 Como Começar

### 1. Clonar o Projeto
```bash
cd "Victor Farma do zero"
```

### 2. Configurar Database (PostgreSQL no Render)

1. Criar conta em https://render.com
2. Criar banco de dados PostgreSQL
3. Copiar a connection string
4. No arquivo `backend/.env`:
```
DATABASE_URL=postgresql://user:password@host/dbname
NODE_ENV=development
PORT=3000
```

5. Executar script SQL para criar tabelas:
```bash
# Copiar conteúdo de backend/db/init.sql
# Executar no banco de dados do Render
```

### 3. Instalar e Rodar Backend

```bash
cd backend
npm install
npm run dev
```

O backend estará rodando em: `http://localhost:3000`

### 4. Abrir Frontend

```bash
# Em outro terminal, abra o arquivo no navegador
cd frontend
# Ou simplesmente abra index.html no navegador
```

Frontend estará em: `http://localhost:5500` (se usar Live Server)

### 5. Abrir Admin

```bash
# Em outro terminal
cd admin
# Ou simplesmente abra index.html no navegador
```

Admin estará em: `http://localhost:5501` (se usar Live Server)

## 📝 Endpoints da API

### Produtos
- `GET /api/products` - Listar todos os produtos
- `GET /api/products/:id` - Obter produto específico
- `POST /api/products` - Criar produto (admin)
- `PUT /api/products/:id` - Atualizar produto (admin)
- `DELETE /api/products/:id` - Deletar produto (admin)

### Carrinho
- `GET /api/cart/:userId` - Obter carrinho do usuário
- `POST /api/cart/:userId/add` - Adicionar ao carrinho
- `PUT /api/cart/:userId/item/:itemId` - Atualizar quantidade
- `DELETE /api/cart/:userId/item/:itemId` - Remover do carrinho
- `DELETE /api/cart/:userId/clear` - Limpar carrinho

### Pedidos
- `POST /api/orders` - Criar pedido
- `GET /api/orders/:orderId` - Obter detalhes do pedido
- `GET /api/orders/user/:userId` - Listar pedidos do usuário
- `PATCH /api/orders/:orderId/status` - Atualizar status
- `POST /api/orders/:orderId/confirm-payment` - Confirmar pagamento

### Admin
- `GET /api/admin/dashboard` - Dados do dashboard
- `GET /api/admin/orders` - Listar todos os pedidos
- `GET /api/admin/orders/:orderId` - Detalhes do pedido
- `GET /api/admin/reports/sales` - Relatório de vendas
- `GET /api/admin/reports/top-products` - Produtos mais vendidos

## 🗄️ Schema do Banco de Dados

### users
- id (UUID)
- name (VARCHAR)
- email (VARCHAR)
- phone (VARCHAR)
- created_at (TIMESTAMP)

### products
- id (UUID)
- name (VARCHAR)
- description (TEXT)
- price (DECIMAL)
- stock (INT)
- image_url (VARCHAR)
- category (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### cart_items
- id (UUID)
- user_id (UUID)
- product_id (UUID)
- quantity (INT)
- created_at (TIMESTAMP)

### orders
- id (UUID)
- user_id (UUID)
- customer_name (VARCHAR)
- customer_phone (VARCHAR)
- delivery_address (TEXT)
- total (DECIMAL)
- payment_method (VARCHAR)
- status (VARCHAR)
- observations (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### order_items
- id (UUID)
- order_id (UUID)
- product_id (UUID)
- quantity (INT)
- price (DECIMAL)
- created_at (TIMESTAMP)

## 📊 Status de Pedidos

- `pending` - Pendente (aguardando pagamento)
- `confirmed` - Confirmado (pagamento recebido)
- `preparing` - Preparando (farmácia separando produtos)
- `out_for_delivery` - Em entrega
- `delivered` - Entregue
- `cancelled` - Cancelado

## 🔄 Fluxo de Compra

1. **Cliente acessa o site** → Vê produtos
2. **Adiciona ao carrinho** → Itens armazenados localmente
3. **Clica em "Finalizar Compra"** → Preenche dados de entrega
4. **Recebe QR Code PIX** → Escaneia e paga
5. **Pagamento confirmado** → Pedido vai para admin
6. **Admin prepara pedido** → Atualiza status
7. **Entregador leva** → Status "em entrega"
8. **Entregue** → Pedido finalizado

## 🎨 Customizações Futuras

Após as funcionalidades funcionarem:
- [ ] Adicionar estilização e design responsivo
- [ ] Integração real com QR Code PIX
- [ ] Sistema de autenticação
- [ ] Histórico de pedidos do cliente
- [ ] Notificações em tempo real
- [ ] Sistema de avaliação
- [ ] Cupons e promoções
- [ ] Chat com suporte

## 📝 Notas Importantes

- O userId do cliente é gerado automaticamente e armazenado no localStorage
- O QR Code PIX é simulado, em produção integrar com API real
- Não há autenticação no admin ainda (adicionar depois)
- As imagens de produtos devem ser URLs válidas

## 🆘 Troubleshooting

**Backend não conecta ao banco:**
- Verificar DATABASE_URL em .env
- Testar conexão no terminal: `psql [DATABASE_URL]`

**Frontend não encontra API:**
- Verificar se backend está rodando em http://localhost:3000
- Verificar CORS no backend

**Produtos não aparecem:**
- Verificar se dados foram inseridos no banco
- Checar console do navegador (F12) para erros

## 📞 Suporte

Para mais informações, verificar logs no console do navegador (F12) e terminal.
