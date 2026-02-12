🔄 FLUXO DE DADOS - VICTOR FARMA
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Cliente)                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 1. PÁGINA DE PRODUTOS (index.html)                       │ │
│  │                                                           │ │
│  │  GET /api/products                                       │ │
│  │  ↓                                                        │ │
│  │  [Exibe lista com imagem, nome, preço, estoque]         │ │
│  │  [Filtro por: busca e categoria]                        │ │
│  │  [Botão: Adicionar ao Carrinho]                         │ │
│  └──────────────────────────────────────────────────────────┘ │
│                         ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 2. CARRINHO (Modal)                                      │ │
│  │                                                           │ │
│  │  POST /api/cart/:userId/add                             │ │
│  │  PUT /api/cart/:userId/item/:itemId (atualizar qty)     │ │
│  │  DELETE /api/cart/:userId/item/:itemId (remover)        │ │
│  │  GET /api/cart/:userId (carregar carrinho)              │ │
│  │  ↓                                                        │ │
│  │  [Exibe itens com: nome, preço, quantidade]             │ │
│  │  [Botões: +, -, Remover]                                │ │
│  │  [Total calculado automaticamente]                      │ │
│  │  [Botão: Finalizar Compra]                              │ │
│  └──────────────────────────────────────────────────────────┘ │
│                         ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 3. CHECKOUT (Modal)                                      │ │
│  │                                                           │ │
│  │  [Formulário com:]                                       │ │
│  │  • Nome completo                                         │ │
│  │  • Telefone                                              │ │
│  │  • Endereço de entrega                                   │ │
│  │  [Botão: Prosseguir para Pagamento]                      │ │
│  │  ↓                                                        │ │
│  │  POST /api/orders (cria pedido)                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                         ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 4. PAGAMENTO PIX (Modal)                                 │ │
│  │                                                           │ │
│  │  [Exibe:]                                                │ │
│  │  • QR Code para escanear                                 │ │
│  │  • Valor do pedido                                       │ │
│  │  • ID do pedido                                          │ │
│  │  [Botão: Confirmar Pagamento]                            │ │
│  │  ↓                                                        │ │
│  │  POST /api/orders/:orderId/confirm-payment               │ │
│  └──────────────────────────────────────────────────────────┘ │
│                         ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 5. CONFIRMAÇÃO (Modal)                                   │ │
│  │                                                           │ │
│  │  ✓ Pedido Realizado com Sucesso!                        │ │
│  │  • Número do Pedido: [ID]                               │ │
│  │  • Mensagem: Você receberá atualizações por telefone    │ │
│  │  [Botão: Voltar para Produtos]                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  localStorage (dados persistidos):                             │
│  • userId (gerado automaticamente)                            │
│  • carrinho (itens adicionados)                               │
├─────────────────────────────────────────────────────────────────┤
│                    HTTP/JSON (via app.js)                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓↑
              ┌──────────────────────────────┐
              │      API REST (Backend)      │
              │   Node.js + Express.js       │
              │    PORT 3000                 │
              └──────────────────────────────┘
                              ↓↑
┌─────────────────────────────────────────────────────────────────┐
│              PostgreSQL Database (Render)                       │
│                                                                 │
│  ┌────────────┐ ┌──────────────┐ ┌──────────────────────┐     │
│  │   USERS    │ │  PRODUCTS    │ │    CART_ITEMS        │     │
│  ├────────────┤ ├──────────────┤ ├──────────────────────┤     │
│  │ id         │ │ id           │ │ user_id (FK)         │     │
│  │ name       │ │ name         │ │ product_id (FK)      │     │
│  │ email      │ │ price        │ │ quantity             │     │
│  │ phone      │ │ stock        │ │                      │     │
│  └────────────┘ │ category     │ └──────────────────────┘     │
│                 │ image_url    │                               │
│                 └──────────────┘                               │
│                                                                 │
│  ┌──────────────────────────────┐  ┌────────────────────────┐ │
│  │       ORDERS                 │  │    ORDER_ITEMS        │ │
│  ├──────────────────────────────┤  ├────────────────────────┤ │
│  │ id                           │  │ order_id (FK)          │ │
│  │ user_id (FK)                 │  │ product_id (FK)        │ │
│  │ customer_name                │  │ quantity               │ │
│  │ customer_phone               │  │ price                  │ │
│  │ delivery_address             │  └────────────────────────┘ │
│  │ total                        │                              │
│  │ payment_method (pix)         │                              │
│  │ status (pending...)          │                              │
│  │ created_at                   │                              │
│  └──────────────────────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
                              ↑↓
┌─────────────────────────────────────────────────────────────────┐
│                   ADMIN PAINEL (Cliente)                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ GET /api/admin/dashboard                                 │ │
│  │ → Total de Pedidos                                       │ │
│  │ → Receita Total                                          │ │
│  │ → Total de Produtos                                      │ │
│  │ → Produtos com Estoque Baixo                             │ │
│  └──────────────────────────────────────────────────────────┘ │
│                         ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ GERENCIAR PRODUTOS                                        │ │
│  │                                                           │ │
│  │ GET /api/products (listar)                               │ │
│  │ POST /api/products (criar novo)                          │ │
│  │ PUT /api/products/:id (editar)                           │ │
│  │ DELETE /api/products/:id (deletar)                       │ │
│  │                                                           │ │
│  │ [Lista com: nome, descrição, preço, estoque]            │ │
│  │ [Botões: Editar, Deletar, + Novo Produto]               │ │
│  └──────────────────────────────────────────────────────────┘ │
│                         ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ GERENCIAR PEDIDOS                                         │ │
│  │                                                           │ │
│  │ GET /api/admin/orders (listar)                           │ │
│  │ GET /api/admin/orders/:id (detalhe)                      │ │
│  │ PATCH /api/orders/:id/status (atualizar status)          │ │
│  │                                                           │ │
│  │ [Lista com: ID, cliente, total, status, data]           │ │
│  │ [Filtro por status]                                      │ │
│  │ [Botões: Ver, Atualizar Status]                          │ │
│  │                                                           │ │
│  │ Em "Ver Detalhes":                                       │ │
│  │ • Info do pedido (cliente, telefone, endereço)          │ │
│  │ • Lista de itens comprados                              │ │
│  │ • Selector para novo status                             │ │
│  │ • Botão: Atualizar Status                               │ │
│  └──────────────────────────────────────────────────────────┘ │
│                         ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ RELATÓRIOS                                                │ │
│  │                                                           │ │
│  │ GET /api/admin/reports/sales (vendas últimos 30 dias)   │ │
│  │ GET /api/admin/reports/top-products (mais vendidos)      │ │
│  │                                                           │ │
│  │ [Exibe:]                                                 │ │
│  │ • Gráfico vendas por data                                │ │
│  │ • Produtos mais vendidos com quantidade                 │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════
📊 FLUXO DETALHADO DE UM PEDIDO
═══════════════════════════════════════════════════════════════════

CLIENTE (Frontend):
  1. Visualiza produtos
     GET /api/products → [lista de produtos]

  2. Adiciona ao carrinho (pode adicionar vários)
     POST /api/cart/:userId/add {productId, quantity}
     → Verifica estoque
     → Adiciona ou atualiza quantidade

  3. Clica em "Carrinho"
     GET /api/cart/:userId → [itens do carrinho]

  4. Clica em "Finalizar Compra"
     → Abre modal de checkout
     → Preenche: nome, telefone, endereço

  5. Clica em "Prosseguir para Pagamento"
     POST /api/orders {
       userId, items, customerName, 
       customerPhone, deliveryAddress, paymentMethod
     }
     → Backend CRIA PEDIDO no banco
     → Retorna ORDEM com QR Code PIX
     → Atualiza estoque (diminui)
     → Limpa carrinho
     → Retorna pixQRCode

  6. Escaneia QR Code ou clica "Confirmar"
     POST /api/orders/:orderId/confirm-payment
     → Status muda de "pending" para "confirmed"
     → Retorna confirmação


ADMIN (Painel):
  1. Acessa Dashboard
     GET /api/admin/dashboard → métricas

  2. Vai em "Pedidos"
     GET /api/admin/orders → lista de pedidos
     [Status pode filtrar: pending, confirmed, etc]

  3. Clica em "Ver" no pedido
     GET /api/admin/orders/:orderId → detalhes completos
     [Mostra cliente, itens, total, endereço]

  4. Clica em "Atualizar Status"
     [Selector aparece com opções]
     PATCH /api/orders/:orderId/status {status: "preparing"}
     → Status muda no banco
     → Lista atualiza automaticamente

  5. Status progression:
     pending → confirmed → preparing → out_for_delivery → delivered

  6. Acessa Relatórios
     GET /api/admin/reports/sales → vendas por dia
     GET /api/admin/reports/top-products → produtos best sellers


═══════════════════════════════════════════════════════════════════
🔐 STATUS DE PEDIDOS
═══════════════════════════════════════════════════════════════════

pending (Pendente)
  └─ Pedido criado, aguardando pagamento
     → Cliente escaneia QR Code PIX

confirmed (Confirmado)
  └─ Pagamento confirmado
     → Admin vê na listagem
     → Admin muda para "preparing"

preparing (Preparando)
  └─ Farmácia separando produtos
     → Admin informa "saiu para entrega"

out_for_delivery (Em Entrega)
  └─ Entregador pegou pedido
     → Está a caminho do cliente

delivered (Entregue)
  └─ Cliente recebeu
     → Pedido finalizado
     → Status imutável

cancelled (Cancelado)
  └─ Pedido cancelado
     → Estoque restaurado
     → Cliente notificado


═══════════════════════════════════════════════════════════════════
💾 DADOS PERSISTIDOS
═══════════════════════════════════════════════════════════════════

FRONTEND (localStorage):
  • userId: "user_abc123..." (gerado automático)
  • Carrinho: carregado via API a cada sessão

BACKEND (PostgreSQL):
  • Todos os dados de: users, products, orders, etc
  • Backup automático (Render)

ADMIN (Nenhum localStorage):
  • Todos dados vêm da API em tempo real
  • Sem persistência local


═══════════════════════════════════════════════════════════════════
🔗 ENDPOINTS RESUMIDOS
═══════════════════════════════════════════════════════════════════

PRODUTOS:
  GET    /api/products          Listar todos
  GET    /api/products/:id      Detalhes
  POST   /api/products          Criar (admin)
  PUT    /api/products/:id      Editar (admin)
  DELETE /api/products/:id      Deletar (admin)

CARRINHO:
  GET    /api/cart/:userId              Ver carrinho
  POST   /api/cart/:userId/add          Adicionar
  PUT    /api/cart/:userId/item/:id     Atualizar qtd
  DELETE /api/cart/:userId/item/:id     Remover item
  DELETE /api/cart/:userId/clear        Limpar tudo

PEDIDOS:
  POST   /api/orders                    Criar pedido
  GET    /api/orders/:orderId           Detalhes
  GET    /api/orders/user/:userId       Lista do usuário
  PATCH  /api/orders/:orderId/status    Mudar status
  POST   /api/orders/:orderId/confirm-payment  Pagar

ADMIN:
  GET    /api/admin/dashboard           Métricas
  GET    /api/admin/orders              Lista
  GET    /api/admin/orders/:orderId     Detalhes
  GET    /api/admin/reports/sales       Vendas
  GET    /api/admin/reports/top-products Bestsellers

HEALTH:
  GET    /health                        Status servidor


═══════════════════════════════════════════════════════════════════
