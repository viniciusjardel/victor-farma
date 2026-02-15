# 📦 Sistema de Decrementação Automática de Estoque

## ✅ Implementação Concluída

O sistema agora decrementa automaticamente o estoque dos produtos quando o **pagamento é aprovado**. Esta funcionalidade foi integrada em todos os pontos onde um pagamento pode ser confirmado.

---

## 🎯 Como Funciona

### 1. **Função Core: `decrementarEstoqueDosPedido()`**

Localização: [backend/routes/orders.js](backend/routes/orders.js#L6-L54)

Esta função:
- ✅ Busca todos os itens do pedido com suas quantidades
- ✅ Valida se há estoque suficiente para cada produto
- ✅ Decrementa o estoque de forma segura
- ✅ Registra logs detalhados de cada operação

```javascript
// Exemplo de uso
await decrementarEstoqueDosPedido(orderId, client);
```

**Proteções integradas:**
- ❌ Rejeita se não houver estoque suficiente
- 🔄 Usa transações para garantir integridade dos dados
- 📊 Valida estoque antes de fazer qualquer alteração

---

## 📍 Pontos de Integração

### 1. **Webhook de Pagamento** (PIX/Mercado Pago)
**Endpoint:** `POST /webhook/payment`  
**Função:** Processa confirmação de pagamento vindo do serviço PIX

```
Fluxo:
1. Serviço backend-pix envia webhook com status='approved'
2. Sistema verifica se já foi processado (evita duplicação)
3. Atualiza payment_status para 'aprovado'
4. Decrementa estoque automaticamente
```

---

### 2. **Confirmação Manual de Pagamento**
**Endpoint:** `POST /:orderId/confirm-payment`  
**Função:** Permite confirmar pagamento manualmente (ex: transferência bancária)

```
Fluxo:
1. Admin confirma pagamento via essa rota
2. payment_status muda para 'aprovado'
3. Se não era 'aprovado' antes, estoque é decrementado
4. Transação garante integridade
```

✨ **Melhorado nesta implementação**: Agora decrementa estoque automaticamente!

---

### 3. **Atualização Genérica de Status**
**Endpoint:** `PATCH /:orderId`  
**Função:** Atualiza qualquer status (pedido ou pagamento)

```json
BODY: {
  "payment_status": "aprovado"
}
```

✨ **Funcionalidade:** Se `payment_status` mudar para 'aprovado' e não era antes, estoque é decrementado automaticamente.

---

### 4. **Atualização de Status de Pagamento**
**Endpoint:** `PATCH /:orderId/payment-status`  
**Função:** Atualiza apenas o status de pagamento

```json
BODY: {
  "novoStatus": "aprovado"
}
```

✨ **Funcionalidade:** Decrementa estoque quando confirmado.

---

### 5. **Teste/Simulação de Webhook**
**Endpoint:** `POST /test-webhook/:orderId`  
**Função:** Simula um webhook de pagamento para testes

```
✨ Melhorado nesta implementação: Agora também decrementa estoque!
```

---

## 🔒 Proteções e Validações

### ✅ Evita Duplicação
- Verifica se pagamento já foi processado antes
- Se `payment_status` já é 'aprovado', não decrementa novamente

### ✅ Transações ACID
- Utiliza `BEGIN/COMMIT/ROLLBACK` do PostgreSQL
- Se algo falhar, **tudo é desfeito** (rollback)
- Garante que ou o estoque é decrementado por completo ou não é decrementado nada

### ✅ Validação de Estoque
- Antes de decrementar, verifica se há quantidade suficiente
- Se faltar, retorna erro **SEM alterar nada**

### ✅ Logs Detalhados
```
🔄 [DECREMENT] Iniciando decrementação para pedido XXXXXXX
📦 Itens encontrados: 2
  📉 Decrementando produto_123: 5 unidades (estoque atual: 20)
  ✅ Estoque: Dipirona -5 unidades (novo total: 15)
  ✅ Estoque: Vitamina C -3 unidades (novo total: 17)
✅ Estoque do pedido XXXXXXX decrementado com sucesso!
```

---

## 🔄 Fluxo Completo de um Pedido

```
1. Cliente cria pedido
   ├─ Status do pedido: "em preparação"
   ├─ Status de pagamento: "pendente" (cartão) ou "aprovado" (PIX imediato)
   └─ Estoque: NÃO É DECREMENTADO YET ⏳

2. Cliente realiza pagamento
   ├─ Via PIX: Webhook chega com aprovação
   ├─ Via Cartão: Admin confirma pagamento
   └─ Via Outro: Admin usa endpoint `/payment-status`

3. Sistema recebe confirmação
   ├─ payment_status muda para "aprovado"
   ├─ 🎯 DECREMENTA ESTOQUE AUTOMATICAMENTE
   └─ Pedido pronto para ser preparado

4. Produto é separado/preparado
   └─ Estoque já foi reduzido na etapa anterior ✅

5. Pedido é entregue
   └─ Estoque permanece reduzido ✅
```

---

## 🛠️ Como Testar

### Teste Local (Desenvolvimento)

```bash
# 1. Criar um pedido
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "items": [{"productId": "prod-123", "quantity": 2}],
    "customerName": "João",
    "customerPhone": "11999999999",
    "deliveryAddress": "Rua X, 123",
    "paymentMethod": "cartao"
  }'

# Copiar o ID do pedido (orderId)

# 2. Confirmar pagamento (vai decrementar estoque)
curl -X POST http://localhost:3000/orders/{orderId}/confirm-payment

# 3. Verificar estoque do produto
curl http://localhost:3000/products/prod-123

# Deve mostrar stock reduzido ✅
```

---

## ⚠️ Casos Especiais

### When PIX is Approved Immediately
```
PIX com QR code lido → Pagamento aprovado imediatamente
↓
Sistema recebe webhook com status='approved'
↓
Estoque é decrementado automaticamente
```

### When Admin Confirms Manually
```
Cartão/Transferência → Admin confirma via dashboard
↓
PUT /payment-status com novoStatus='aprovado'
↓
Estoque é decrementado automaticamente
```

### When Cancelling an Order
```
Se pedido foi confirmado (estoque já decrementado)
↓
POST /:orderId/cancel
↓
Estoque é RESTAURADO automaticamente
```

---

## 📊 Banco de Dados

### Tabela `order_items`
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL
);
```

### Tabela `products`
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock INTEGER NOT NULL,  -- ← Decrementado automaticamente
  image_url TEXT,
  category VARCHAR(100)
);
```

---

## 🐛 Debug

Se o estoque não estiver sendo decrementado:

### 1. **Verificar logs do servidor**
```bash
# Look for:
# ✅ [DECREMENT] Iniciando decrementação...
# ❌ Erro ao decrementar estoque...
```

### 2. **Verificar status do pedido**
```bash
curl http://localhost:3000/orders/{orderId}
```
Confirme que `payment_status` é realmente 'aprovado'

### 3. **Verificar estoque do produto**
```bash
curl http://localhost:3000/products/{productId}
```
Confirme que o campo `stock` foi reduzido

### 4. **Verificar transações no banco**
```sql
SELECT * FROM orders WHERE id = '{orderId}';
SELECT * FROM order_items WHERE order_id = '{orderId}';
SELECT stock FROM products WHERE id = '{productId}';
```

---

## ✨ Melhorias Futuras

- [ ] Notificação ao cliente quando estoque fica baixo
- [ ] Avisar admin se estoque for insuficiente
- [ ] Relatório de estoque histórico
- [ ] Reserva automática de quantidade até confirmação de pagamento
- [ ] Alerta quando produto atinge estoque mínimo

---

## 📝 Resumo das Mudanças

✅ **Endpoint `/confirm-payment`**: Agora decrementa estoque  
✅ **Endpoint `/test-webhook`**: Agora decrementa estoque e usa transações  
✅ **Todos os endpoints**: Verificam se pagamento já foi processado para evitar duplicação  
✅ **Segurança**: Todas as operações usam transações ACID  

---

**Data da implementação:** 12 de fevereiro de 2026  
**Status:** ✅ Pronto para produção
