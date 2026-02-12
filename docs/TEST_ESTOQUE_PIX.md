# ✅ Teste do Fluxo de Estoque com PIX

## 📋 Fluxo Implementado

Quando um cliente finaliza o pedido com PIX, agora o sistema:

1. **Cria o pedido** → Itens adicionados como "pendente"
2. **Gera o QR Code PIX** → Aguardando pagamento
3. **PIX é confirmado** → Webhook recebe `status: 'approved'`
4. **Estoque é decrementado automaticamente** ✅
   - Valida se há estoque suficiente
   - Usa transação para garantir integridade
   - Registra todas as operações

---

## 🧪 Como Testar

### 1️⃣ Verificar Estoque Inicial
```bash
curl -X GET http://localhost:3000/api/products/SEU_PRODUCT_ID
```

**Resposta esperada:**
```json
{
  "id": "product-123",
  "name": "Dipirona 500mg",
  "price": 15.50,
  "stock": 4
}
```

---

### 2️⃣ Criar Pedido com PIX

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "items": [
      {
        "productId": "product-123",
        "quantity": 3
      }
    ],
    "customerName": "João Silva",
    "customerPhone": "11999999999",
    "deliveryAddress": "Rua A, 100",
    "paymentMethod": "pix"
  }'
```

**Resposta esperada:**
```json
{
  "order": {
    "id": "order-456",
    "status": "em preparação",
    "payment_status": "pendente",
    "total": 46.50
  },
  "message": "Pedido criado com sucesso"
}
```

**Guarde o `order-456` para os próximos passos!**

---

### 3️⃣ Gerar PIX QR Code

```bash
curl -X POST http://localhost:3000/api/orders/order-456/generate-pix
```

**Resposta esperada:**
```json
{
  "paymentId": "pix-789",
  "qrCode": "00020126360014br.gov.bcb.brcode...",
  "status": "pending",
  "valor": 46.50
}
```

---

### 4️⃣ Simular Confirmação de Pagamento PIX

```bash
curl -X POST http://localhost:3000/api/orders/webhook/payment \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "pix-789",
    "status": "approved",
    "orderId": "order-456"
  }'
```

**Resposta esperada:**
```json
{
  "message": "Webhook processado com sucesso",
  "order": {
    "id": "order-456",
    "payment_status": "aprovado"
  }
}
```

---

### 5️⃣ Verificar Estoque APÓS Pagamento

```bash
curl -X GET http://localhost:3000/api/products/product-123
```

**Resultado esperado:**
```json
{
  "id": "product-123",
  "name": "Dipirona 500mg",
  "price": 15.50,
  "stock": 1  ✅ // Era 4, agora é 1 (diminuiu 3)
}
```

---

## ✨ Melhorias Implementadas

| Feature | Status | Descrição |
|---------|--------|-----------|
| Transações ACID | ✅ | Garante que ou tudo é processado ou nada é |
| Validação de Estoque | ✅ | Verifica se há estoque antes de decrementar |
| Proteção contra Duplicação | ✅ | Não processa mesmo webhook 2 vezes |
| Log Detalhado | ✅ | Rastreia cada operação de estoque |
| Rollback Automático | ✅ | Desfaz tudo se algo falhar |

---

## 🔍 Comportamentos Importantes

### ✅ Cenário 1: Pagamento Aprovado
- Estoque é **DECREMENTADO** automaticamente
- Status do pedido permanece em "em preparação"
- Webhook retorna sucesso

### ✅ Cenário 2: Estoque Insuficiente
- Webhook retorna erro 400
- Transação é desfeita (ROLLBACK)
- Estoque permanece inalterado
- Pedido permanece como "pendente"

### ✅ Cenário 3: Webhook Recebido Novamente
- Sistema detecta que já foi processado
- Não incrementa/decrementa novamente
- Retorna sucesso silenciosamente

---

## 📊 Monitoramento em Tempo Real

Abra o terminal e veja os logs:

```bash
# Terminal 1: Rodando o backend
npm start
```

Durante o teste, você verá logs como:

```
✅ Webhook PIX: Pedido order-456 - payment_status atualizado para: aprovado
📦 Decrementando estoque para pedido order-456...
  ✅ Produto product-123: -3 unidades (total: 1)
✅ Estoque decrementado com sucesso para pedido order-456
```

---

## ⚠️ Se Algo Não Funcionar

1. **Verificar logs do backend** → Procure por `❌` ou `⚠️`
2. **Banco de dados conectado?** → Olhe para `🔌 Conectando ao banco...`
3. **Tabelas existem?** → Execute queries no database
4. **Webhook não recebido?** → Verifique se PIX_API_URL está correto

---

## 🚀 Próximos Passos Opcionais

- [ ] Adicionar notificação SMS/Email quando estoque zera
- [ ] Implementar alertas para estoque baixo
- [ ] Criar relatório de estoque
- [ ] Historico de movimentação de estoque
