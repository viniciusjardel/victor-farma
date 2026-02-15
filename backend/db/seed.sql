-- Script para inserir dados de exemplo
-- Execute após rodar o init.sql

-- Inserir produtos de exemplo
INSERT INTO products (id, name, description, price, stock, category, image_url) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Dipirona 500mg', 'Analgésico e antitérmico', 5.99, 50, 'medicamentos', 'https://via.placeholder.com/200?text=Dipirona'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Vitamina C 1000mg', 'Suplemento de vitamina C', 12.99, 35, 'vitaminas', 'https://via.placeholder.com/200?text=Vitamina+C'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Sabonete Neutro', 'Sabonete para limpeza diária', 3.50, 100, 'higiene', 'https://via.placeholder.com/200?text=Sabonete'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Pomada Hidratante', 'Creme hidratante para pele seca', 18.90, 20, 'cosmeticos', 'https://via.placeholder.com/200?text=Pomada'),
  ('550e8400-e29b-41d4-a716-446655440005', 'Xarope Expectorante', 'Xarope para tosse', 8.50, 40, 'medicamentos', 'https://via.placeholder.com/200?text=Xarope'),
  ('550e8400-e29b-41d4-a716-446655440006', 'Vitamina B12', 'Suplemento de vitamina B12', 14.99, 25, 'vitaminas', 'https://via.placeholder.com/200?text=Vitamina+B12'),
  ('550e8400-e29b-41d4-a716-446655440007', 'Álcool 70%', 'Álcool para higienização', 6.99, 60, 'higiene', 'https://via.placeholder.com/200?text=Alcool+70'),
  ('550e8400-e29b-41d4-a716-446655440008', 'Protetor Solar 50+', 'Protetor solar SPF 50+', 25.99, 15, 'cosmeticos', 'https://via.placeholder.com/200?text=Protetor+Solar'),
  ('550e8400-e29b-41d4-a716-446655440009', 'Antácido', 'Antácido para azia', 7.99, 30, 'medicamentos', 'https://via.placeholder.com/200?text=Antacido'),
  ('550e8400-e29b-41d4-a716-446655440010', 'Vitamina D3', 'Suplemento de vitamina D3', 16.99, 22, 'vitaminas', 'https://via.placeholder.com/200?text=Vitamina+D3');

-- Criar um usuário de exemplo
INSERT INTO users (id, name, email, phone) VALUES
  ('user_550e8400-e29b-41d4-a716-446655440001', 'João Silva', 'joao@email.com', '11999999999');

-- Criar um pedido de exemplo
INSERT INTO orders (id, user_id, customer_name, customer_phone, delivery_address, total, payment_method, status) VALUES
  ('550e8400-e29b-41d4-a716-446655440099', 'user_550e8400-e29b-41d4-a716-446655440001', 'João Silva', '11999999999', 'Rua das Flores, 123 - São Paulo, SP', 45.99, 'pix', 'pending');

-- Inserir itens do pedido de exemplo
INSERT INTO order_items (id, order_id, product_id, quantity, price) VALUES
  ('550e8400-e29b-41d4-a716-446655440098', '550e8400-e29b-41d4-a716-446655440099', '550e8400-e29b-41d4-a716-446655440001', 3, 5.99),
  ('550e8400-e29b-41d4-a716-446655440097', '550e8400-e29b-41d4-a716-446655440099', '550e8400-e29b-41d4-a716-446655440002', 2, 12.99);
