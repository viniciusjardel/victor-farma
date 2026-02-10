-- Adicionar tabela de receita se ela não existir
CREATE TABLE IF NOT EXISTS revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(order_id)
);

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_revenue_order_id ON revenue(order_id);
CREATE INDEX IF NOT EXISTS idx_revenue_created_at ON revenue(created_at);

-- Se a tabela já existia, limpar dados anteriores (opcional)
-- TRUNCATE TABLE revenue;
