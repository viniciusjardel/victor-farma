-- Adicionar coluna payment_status à tabela orders
ALTER TABLE orders
ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pendente';

-- Criar índice para payment_status
CREATE INDEX idx_orders_payment_status ON orders(payment_status);

-- Comentário explicativo
-- payment_status valores: 'confirmado' | 'pendente' | 'pedido cancelado'
-- status valores: 'preparando' | 'em rota de entrega' | 'entregue' | 'pedido cancelado'
