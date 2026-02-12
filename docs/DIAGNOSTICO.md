# 🔧 GUIA DE DIAGNÓSTICO - Pagamento PIX não confirma

## Passo 1: Recarregue o site e gere PIX
1. Abra https://victor-farma-frontend.netlify.app (ou localhost)
2. Pressione **F12** para abrir Developer Tools
3. Vá para a aba **Console**
4. Selecione um produto e clique em "Adicionar"
5. Clique em "Checkout"
6. Preencha os dados e clique em "Gerar PIX"

## Passo 2: Procure pelo OrderId no Console
Na aba Console, você verá logs assim:
```
⏳ Iniciando polling para orderId: abc-123-def-456
   paymentId: 144702089977
   maxAttempts: 120
```

**Copie o `orderId`** (exemplo: `abc-123-def-456`)

## Passo 3: Teste o Webhook Manualmente
Abra o PowerShell e execute:

```powershell
cd "d:\JD\Trabalho\Projetos Reais\Projetos Em Andamento\Victor Farma do zero"
.\simulate-webhook.ps1
```

Quando pedido, cole o OrderId que você copiou.

## Passo 4: Observe o Console do Navigator
Volte ao navegador e monitore o Console. Você DEVE ver:

```
🔍 [Polling 1/120] Verificando status de abc-123-def-456...
📦 Status atual: status='confirmed', payment_status='approved'
✅ CONFIRMADO! Atualizando visual...
✅ Pagamento confirmado via polling!
```

## Passo 5: Interpretação de Resultados

### ✅ Se FUNCIONOU com webhook manual:
- O problema é que a **Provider PIX não está chamando o webhook automaticamente**
- Solução: Integrar com a API real de uma provider (Mercado Pago, Braspag, etc.)

### ❌ Se NÃO funcionou:
1. **Verifique o PowerShell**: O script retornou erro?
   - Se sim: Problema no backend webhook
   - Se não: O payload chegou, mas o backend não atualizou

2. **Verifique o Console do Browser**: Qual era o status retornado?
   - Se `status='pending'`: Webhook não atualizou nada
   - Se `status='confirmed'`: Webhook funcionou mas modal não atualizou

## 🐛 Logs esperados no Console:

```
✓ Resposta recebida: 200
✓ Produtos carregados: [{…}]
✓ Total de produtos: 1
generatePixPayment - resposta do backend: {...}
displayPixQrModal - fontes detectadas: {...}
✅ Overlay PIX criado: pix-qr-modal-XXXXX
⏳ Iniciando polling para orderId: ...
   paymentId: ...
   maxAttempts: 120

🔍 [Polling 1/120] Verificando status de ...
📦 Status atual: status='pending', payment_status='null'
```

Esse é o comportamento correto! O status muda após você executar o webhook.

## 🎯 Próximas Ações

Execute os passos acima e compartilhe comigo:
1. O que apareceu no PowerShell (sucesso ou erro)
2. Os logs do Console (copie e cole os últimos 10 linhas)
3. Se viu "✅ Pagamento confirmado!" no modal

Assim consigo identificar exatamente onde está o problema!
