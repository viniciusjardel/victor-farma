# 🎯 Configuração PIX Real (Mercado Pago)

## ⚠️ IMPORTANTE
O PIX Mock foi **REMOVIDO COMPLETAMENTE**. Agora o sistema usa **APENAS PIX Real** via Mercado Pago.

---

## 📋 Checklist de Configuração

### 1️⃣ Criar Conta no Mercado Pago
- [ ] Acesse: https://www.mercadopago.com.br
- [ ] Crie uma conta com email e telefone
- [ ] Verifique seu email

### 2️⃣ Obter Access Token do Mercado Pago
- [ ] Acesse: https://www.mercadopago.com.br (já logado)
- [ ] Vá em: **Configurações** → **Credenciais**
- [ ] Copie seu **Access Token** (começa com "APP_")
- [ ] **Guarde em local seguro**

### 3️⃣ Configurar Backend PIX no Render
- [ ] Acesse: https://dashboard.render.com
- [ ] Clique no serviço **"backend-pix"** ou crie um novo Web Service
- [ ] Vá em: **Environment** → **Add Environment Variable**
- [ ] Adicione:
  ```
  MP_ACCESS_TOKEN = (colar aqui o Access Token do Mercado Pago)
  ```
- [ ] Clique **Save**
- [ ] O serviço vai fazer redeploy automaticamente

### 4️⃣ Verificar se Backend PIX está Online
- [ ] Acesse: `https://pix-victor-farma.onrender.com/`
- [ ] Se ver **"API PIX Mercado Pago rodando 🚀"** → ✅ Funcionando!
- [ ] Se ver erro → Verifique os Logs do Render

### 5️⃣ Testar Geração de PIX Real
- [ ] Acesse seu frontend: `https://seu-site.com` ou localhost
- [ ] Adicione um produto ao carrinho
- [ ] Vá para checkout
- [ ] Escolha **"PIX Instantâneo"**
- [ ] Confirme a compra
- [ ] NÃO deve aparecer mensagem de erro
- [ ] QR Code deve ser real (pode fazer scan)

---

## 🐛 Troubleshooting

### ❌ Erro: "Serviço PIX indisponível"

**Causas possíveis:**
1. **Access Token não configurado** no backend-pix
   - Solução: Ir em Render → backend-pix → Environment → Adicionar MP_ACCESS_TOKEN

2. **Access Token inválido**
   - Solução: Copiar novamente em Mercado Pago → Configurações → Credenciais

3. **Backend PIX não está rodando**
   - Solução: Ir em Render → backend-pix → Clicar em **Redeploy**

4. **PIX_API_URL errado no backend principal**
   - Solução: Verificar em Render → victor-farma → Environment
   - Deve ser: `https://pix-victor-farma.onrender.com` (ajustar se seu domínio for diferente)

### 🔍 Verificar Logs
1. Acesse https://dashboard.render.com
2. Clique em **"backend-pix"**
3. Aba **"Logs"**
4. Procure por:
   - ✅ `PIX criado com ID:`
   - ❌ `MP_ACCESS_TOKEN não configurado`
   - ❌ `Erro ao conectar com API do Mercado Pago`

---

## ✅ Status Esperado

Após configuração correta:

```
✅ Backend PIX rodando
✅ Access Token válido
✅ QR Code gerado com dados reais
✅ Pagamentos podem ser feitos
✅ Webhooks recebem notificações
```

---

## 📝 Próximo Passo

Após confirmar que PIX está gerando corretamente:
1. Testar pagamento real (com Mercado Pago em modo teste)
2. Configurar webhook do Mercado Pago para confirmar pagamentos
3. Deploy final em produção
