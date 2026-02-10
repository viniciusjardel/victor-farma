# Sistema de Notificações e Toast Messages

## 📌 Visão Geral

Um novo sistema de notificações elegante foi implementado para substituir os `alert()` básicos. As notificações aparecem no canto superior direito com animações suaves e auto-dismiss.

## 🎨 Tipos de Notificação

### 1. **Success (Sucesso)** ✓
- **Cor**: Verde
- **Ícone**: ✓
- **Auto-dismiss**: 3 segundos
- **Casos de uso**:
  - Produto adicionado ao carrinho
  - Pagamento confirmado
  - Pedido criado com sucesso

```javascript
notify.success('Produto adicionado ao carrinho');
```

### 2. **Error (Erro)** ✕
- **Cor**: Vermelho
- **Ícone**: ✕
- **Auto-dismiss**: 5 segundos
- **Clique para fechar**: Sim
- **Casos de uso**:
  - Falha em adicionar ao carrinho
  - Erro de conexão
  - Falha ao gerar PIX

```javascript
notify.error('Erro ao adicionar ao carrinho');
```

### 3. **Warning (Aviso)** ⚠
- **Cor**: Amarelo/Laranja
- **Ícone**: ⚠
- **Auto-dismiss**: 4 segundos
- **Clique para fechar**: Sim
- **Casos de uso**:
  - Pagamento cancelado
  - Estoque baixo
  - Limite atingido

```javascript
notify.warning('Pagamento cancelado');
```

### 4. **Info (Informação)** ℹ
- **Cor**: Azul
- **Ícone**: ℹ
- **Auto-dismiss**: 3 segundos
- **Casos de uso**:
  - Quantidade atualizada
  - Item removido
  - Ações confirmadas

```javascript
notify.info('Quantidade atualizada');
```

## 🔧 API de Uso

### Método Básico
```javascript
notify.show(mensagem, tipo, duracao, callback);
```

**Parâmetros**:
- `mensagem` (string): Texto a exibir
- `tipo` (string): 'success' | 'error' | 'warning' | 'info'
- `duracao` (number): Tempo em ms (0 = nunca fecha automaticamente)
- `callback` (function): Executado ao fechar (opcional)

### Métodos Helpers (Recomendado)

```javascript
// Sucesso
notify.success('Operação realizada!', duracao, callback);

// Erro
notify.error('Algo deu errado!', duracao, callback);

// Aviso
notify.warning('Cuidado!', duracao, callback);

// Info
notify.info('Informação importante', duracao, callback);
```

### Métodos Adicionais

```javascript
// Fechar notificação específica
notify.close(notificationId);

// Fechar todas as notificações
notify.closeAll();
```

## 📍 Posicionamento

- **Posição**: Canto superior direito (20px do topo, 20px da direita)
- **Stack**: Máximo 5 notificações simultâneas
- **Responsivo**: Adapta-se para mobile (tela inteira com 10px margen)

## ✨ Recursos

✅ **Animações suaves**: Slide in/out com transição de 300ms
✅ **Auto-dismiss**: Cada tipo tem duração padrão otimizada
✅ **Clique para fechar**: Especialmente em errors/warnings
✅ **Callback customizado**: Execute código ao fechar
✅ **Prevenção XSS**: HTML é escapado automaticamente
✅ **Mobile-friendly**: Layout responsive
✅ **Acessibilidade**: ARIA labels e estrutura semântica

## 🎯 Exemplos no Código

### Adicionar ao Carrinho (Sucesso + Animação)
```javascript
notify.success(`✓ ${product.name} adicionado ao carrinho`);
```

### Atualizar Quantidade
```javascript
notify.info('Quantidade atualizada');
```

### Remover do Carrinho
```javascript
notify.info('Produto removido do carrinho');
```

### Erros de Validação
```javascript
notify.error('Nome é obrigatório');
notify.error('Telefone inválido');
notify.error('Endereço incompleto');
```

### Pagamento
```javascript
notify.success('Pagamento PIX confirmado!', 3000);
notify.warning('Pagamento cancelado');
notify.error('Erro ao gerar PIX');
notify.error('Tempo de pagamento expirado');
```

## 🎨 Customização

### Cores Padrão
```css
/* Success */
background: #d4edda;
color: #155724;
border-left: #28a745;

/* Error */
background: #f8d7da;
color: #721c24;
border-left: #dc3545;

/* Warning */
background: #fff3cd;
color: #856404;
border-left: #ffc107;

/* Info */
background: #d1ecf1;
color: #0c5460;
border-left: #17a2b8;
```

Para customizar, edite os estilos em `styles.css`:
```css
.notification-success {
  background-color: #d4edda;
  color: #155724;
  border-left: 4px solid #28a745;
}
```

## 📱 Comportamento Mobile

- Container reposiciona para usar espaço disponível
- Notificações expandem para ocupar a largura (com margem)
- Ícones e texto redimensionam para telas pequenas
- Funciona em orientação portrait e landscape

## 🚀 Integração com Backend

O sistema pode ser facilmente integrado com respostas do servidor:

```javascript
// Sucesso na API
const response = await fetch(url);
if (response.ok) {
  notify.success('Operação realizada com sucesso!');
}

// Erro na API
if (!response.ok) {
  const error = await response.json();
  notify.error(error.message || 'Erro ao processar');
}
```

## 📊 Estatísticas

- **Arquivo principal**: `notifications.js` (~200 linhas)
- **Estilos**: `styles.css` (~150 linhas)
- **Tamanho**: ~8KB (minificado)
- **Dependências**: Nenhuma (vanilla JS)

## 🔄 Próximas Melhorias Sugeridas

1. **Persistência**: Salvar logs de notificações no localStorage
2. **Áudio**: Som de notificação (especialmente para erros)
3. **Temas**: Dark mode para notificações
4. **Ações**: Botões customizáveis nas notificações
5. **Histórico**: Painel de notificações recentes
