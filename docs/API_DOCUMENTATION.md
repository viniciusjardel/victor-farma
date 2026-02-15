# 📚 Documentação da API - Victor Farma

## Base URL
```
http://localhost:3000/api
```

---

## 🛍️ PRODUTOS

### Listar todos os produtos
```http
GET /products
```

**Resposta:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Dipirona 500mg",
    "description": "Analgésico e antitérmico",
    "price": "5.99",
    "stock": 50,
    "image_url": "https://...",
    "category": "medicamentos",
    "created_at": "2026-02-07T10:00:00Z",
    "updated_at": "2026-02-07T10:00:00Z"
  }
]
```

### Obter produto específico
```http
GET /products/:id
```

### Criar produto (Admin)
```http
POST /products
Content-Type: application/json

{
  "name": "Novo Produto",
  "description": "Descrição",
  "price": 19.99,
  "stock": 100,
  "category": "medicamentos",
  "image_url": "https://..."
}
```

### Atualizar produto (Admin)
```http
PUT /products/:id
Content-Type: application/json

{
  "name": "Novo Nome",
  "description": "Nova Descrição",
  "price": 19.99,
  "stock": 100,
  "category": "medicamentos",
  "image_url": "https://..."
}
```

### Deletar produto (Admin)
```http
DELETE /products/:id
```

---

## 🛒 CARRINHO

### Obter carrinho do usuário
```http
GET /cart/:userId
```

**Resposta:**
```json
[
  {
    "id": "cart_item_id",
    "product_id": "product_id",
    "name": "Dipirona 500mg",
    "price": "5.99",
    "quantity": 2,
    "subtotal": "11.98"
  }
]
```

### Adicionar ao carrinho
```http
POST /cart/:userId/add
Content-Type: application/json

{
  "productId": "550e8400-e29b-41d4-a716-446655440001",
  "quantity": 2
}
```

### Atualizar quantidade no carrinho
```http
PUT /cart/:userId/item/:itemId
Content-Type: application/json

{
  "quantity": 3
}
```

### Remover do carrinho
```http
DELETE /cart/:userId/item/:itemId
```

### Limpar carrinho
```http
DELETE /cart/:userId/clear
```

---

## 📦 PEDIDOS

### Criar pedido
```http
POST /orders
Content-Type: application/json

{
  "userId": "user_123",
  "items": [
    {
      "productId": "product_1",
      "quantity": 2
    },
    {
      "productId": "product_2",
      "quantity": 1
    }
  ],
  "customerName": "João Silva",
  "customerPhone": "11999999999",
  "deliveryAddress": "Rua das Flores, 123 - São Paulo, SP",
  "paymentMethod": "pix"
}
```

**Resposta:**
```json
{
  "order": {
    "id": "order_uuid",
    "user_id": "user_123",
    "customer_name": "João Silva",
    "customer_phone": "11999999999",
    "delivery_address": "Rua das Flores, 123 - São Paulo, SP",
    "total": "45.99",
    "payment_method": "pix",
    "status": "pending",
    "created_at": "2026-02-07T10:00:00Z"
  },
  "pixQRCode": {
    "qrCodeUrl": "https://api.qrserver.com/v1/create-qr-code/...",
    "amount": 45.99,
    "orderId": "order_uuid"
  }
}
```

### Obter detalhes do pedido
```http
GET /orders/:orderId
```

### Listar pedidos do usuário
```http
GET /orders/user/:userId
```

### Atualizar status do pedido
```http
PATCH /orders/:orderId/status
Content-Type: application/json

{
  "status": "confirmed"
}
```

**Status válidos:**
- `pending` - Pendente
- `confirmed` - Confirmado
- `preparing` - Preparando
- `out_for_delivery` - Em entrega
- `delivered` - Entregue
- `cancelled` - Cancelado

### Confirmar pagamento
```http
POST /orders/:orderId/confirm-payment
```

---

## 📊 ADMIN

### Dashboard
```http
GET /admin/dashboard
```

**Resposta:**
```json
{
  "totalOrders": 15,
  "totalRevenue": 450.50,
  "totalProducts": 25,
  "lowStockProducts": [
    {
      "id": "product_id",
      "name": "Produto com Estoque Baixo",
      "stock": 5
    }
  ]
}
```

### Listar todos os pedidos
```http
GET /admin/orders
```

### Detalhes do pedido
```http
GET /admin/orders/:orderId
```

### Relatório de vendas (últimos 30 dias)
```http
GET /admin/reports/sales
```

**Resposta:**
```json
[
  {
    "date": "2026-02-07",
    "orders": 5,
    "revenue": "120.50"
  }
]
```

### Produtos mais vendidos
```http
GET /admin/reports/top-products
```

**Resposta:**
```json
[
  {
    "id": "product_id",
    "name": "Dipirona 500mg",
    "total_sold": 150,
    "times_sold": 45
  }
]
```

---

## 🏥 Health Check

### Verificar status do servidor
```http
GET /health
```

**Resposta:**
```json
{
  "status": "OK"
}
```

---

## ⚠️ Códigos de Erro

- `200` - OK
- `201` - Criado com sucesso
- `400` - Requisição inválida
- `404` - Não encontrado
- `500` - Erro do servidor

---

## 🧪 Exemplos com cURL

### Listar produtos
```bash
curl http://localhost:3000/api/products
```

### Criar produto
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Novo Produto",
    "price": 19.99,
    "stock": 100,
    "category": "medicamentos"
  }'
```

### Adicionar ao carrinho
```bash
curl -X POST http://localhost:3000/api/cart/user_123/add \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product_id",
    "quantity": 2
  }'
```

### Criar pedido
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "items": [{"productId": "product_1", "quantity": 2}],
    "customerName": "João Silva",
    "customerPhone": "11999999999",
    "deliveryAddress": "Rua das Flores, 123",
    "paymentMethod": "pix"
  }'
```

---

## 📝 Notas

- Todos os endpoints retornam JSON
- Use `Content-Type: application/json` para POST/PUT/PATCH
- O userId é gerado automaticamente no frontend
- Os UUIDs são gerados automaticamente pelo backend
