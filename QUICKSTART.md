# 🚀 Quick Start - Victor Farma

## ⚡ Setup em 5 minutos

### Passo 1: Preparar o Banco de Dados

1. Acesse https://render.com
2. Faça login/crie conta
3. Clique em "New" → "PostgreSQL"
4. Configure:
   - Name: `victor-farma-db`
   - Database: `victor_farma`
5. Depois de criado, copie a **External Database URL**

### Passo 2: Configurar Environment

```bash
# No backend, crie um arquivo .env com:
DATABASE_URL=postgresql://[seu_usuario]:[sua_senha]@[seu_host]/victor_farma
NODE_ENV=development
PORT=3000
```

### Passo 3: Criar Tabelas no Banco

1. Acesse o Render Dashboard
2. Vá em "Query" no seu banco PostgreSQL
3. Copie todo o conteúdo de `backend/db/init.sql`
4. Cole e execute na query do Render

### Passo 4: Instalar e Rodar Backend

```bash
cd backend
npm install
npm run dev
```

✅ Backend rodando em: `http://localhost:3000`

### Passo 5: Abrir Frontend e Admin

**Opção A: Com Live Server no VS Code**
1. Instale extensão "Live Server"
2. Clique direito em `frontend/index.html` → "Open with Live Server"
3. Faça o mismo para `admin/index.html`

**Opção B: Abrir direto no navegador**
1. Abra `frontend/index.html` no navegador
2. Abra `admin/index.html` em outra aba

## 🧪 Testar a Aplicação

### Adicionar Produtos (pelo Admin)
1. Acesse o Painel Admin
2. Clique em "📦 Produtos"
3. Clique em "+ Novo Produto"
4. Preencha os campos

### Fazer uma Compra (no Frontend)
1. Acesse o Site do Cliente
2. Clique em "🛒 Carrinho"
3. Os produtos aparecerem lá
4. Adicione produtos
5. Clique em "Finalizar Compra"
6. Preencha nome, telefone e endereço
7. Veja o QR Code PIX

### Acompanhar Pedido (no Admin)
1. Vá em "📋 Pedidos"
2. Veja lista de pedidos
3. Clique em "Ver" para detalhes
4. Clique em "Atualizar" para mudar status

## 🛠️ Ferramentas Necessárias

- ✅ Node.js (https://nodejs.org/)
- ✅ PostgreSQL (no Render - online)
- ✅ VS Code ou outro editor
- ✅ Navegador moderno

## 📱 Testar no Celular

Para testar a aplicação no seu celular:

1. Encontre o IP da sua máquina:
   ```bash
   ipconfig  # Windows
   ifconfig  # Mac/Linux
   ```

2. Altere a URL de localhost para seu IP em `app.js`:
   ```javascript
   const API_URL = 'http://[seu_ip]:3000/api';
   ```

3. Acesse de outro dispositivo:
   ```
   http://[seu_ip]:5500 (frontend)
   http://[seu_ip]:5501 (admin)
   ```

## ❌ Problemas Comuns

### "Erro de conexão com banco"
- Verificar DATABASE_URL em `.env`
- Testar se Render está ativo
- Verificar se IP está autorizado

### "Produtos não aparecem"
- Verificar se init.sql foi executado
- Checar se há produtos no banco (admin)
- Abrir F12 e ver console para erros

### "Frontend não encontra API"
- Verificar se backend está rodando (porta 3000)
- Verificar CORS em `server.js`
- Testar: `curl http://localhost:3000/health`

### O PIX é simulado?
Sim! O QR Code é gerado simulado. Para usar real, entrar em contato com provedor PIX.

## 📚 Próximos Passos

1. ✅ Funcionalidades básicas funcionando
2. ⏭️ Adicionar estilização (CSS)
3. ⏭️ Autenticação de admin
4. ⏭️ Sistema de notificações
5. ⏭️ Deploy em produção

## 💡 Dicas

- Use `npm install nodemon -D` para reload automático
- Adicione `console.log()` para debugar
- Teste endpoints com Postman/Insomnia
- Verifique logs no F12 (navegador) e terminal

---

**Precisa de ajuda?** Verifique o README.md completo!
