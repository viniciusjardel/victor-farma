# API PIX - Victor Farma

Serviço de geração de pagamentos PIX integrado com Mercado Pago para o Victor Farma.

## Configuração

### 1. Variáveis de Ambiente

Crie um arquivo `.env` baseado em `.env.example`:

```bash
PORT=3000
MP_ACCESS_TOKEN=seu_access_token_do_mercado_pago
MP_WEBHOOK_SECRET=seu_webhook_secret
```

### 2. Instalação de Dependências

```bash
npm install
```

### 3. Desenvolvimento Local

```bash
npm run dev
```

### 4. Produção

```bash
npm start
```

## Endpoints

### POST /pix
Gera um novo pagamento PIX

**Request:**
```json
{
  "valor": 100.50,
  "descricao": "Pedido #123"
}
```

**Response:**
```json
{
  "id": "12345678",
  "status": "pending",
  "qr_code": "00020126580014br.gov.bcb.pix...",
  "qr_code_base64": "iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### GET /status/:paymentId
Consulta o status de um pagamento

**Response:**
```json
{
  "id": "12345678",
  "status": "approved",
  "valor": 100.50
}
```

### POST /webhook
Recebe notificações do Mercado Pago quando um pagamento é confirmado

## Mercado Pago

Para usar esta API, você precisa:

1. Ter uma conta no [Mercado Pago](https://www.mercadopago.com.br)
2. Obter suas credenciais:
   - Access Token (em Configurações > Credenciais)
   - Webhook Secret (em Configurações > Webhooks)
3. Configurar o webhook no Mercado Pago apontando para: `https://seu-dominio.com/webhook`

## Deploy no Render

1. Conecte este repositório ao Render
2. Crie um novo Web Service apontando para a pasta `backend-pix/`
3. Configure as variáveis de ambiente no painel do Render
4. Deploy automático ativado

## Deploy Local com Docker

```bash
docker build -t victor-farma-pix .
docker run -e MP_ACCESS_TOKEN=seu_token -p 3000:3000 victor-farma-pix
```

## Logs

O serviço gera logs detalhados para debug:

- ✅ PIX criado com sucesso
- ❌ Erro ao gerar PIX
- 📊 Status de pagamentos consultados
- 📩 Webhooks recebidos

## Troubleshooting

### "MP_ACCESS_TOKEN não configurado"
Certifique-se de que a variável de ambiente está configurada no Render ou no arquivo `.env` local.

### "Erro ao conectar com API do Mercado Pago"
Verifique se o token está válido e se você tem acesso à API.

### Webhook não recebe notificações
Configure a URL do webhook no painel do Mercado Pago para apontar para `https://seu-dominio.com/webhook`
