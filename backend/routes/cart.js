const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // Registrar/criar usuário se não existir
  const ensureUserExists = async (userId) => {
    try {
      await pool.query(
        'INSERT INTO users (id, name, email, phone) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        [userId, `User ${userId}`, null, null]
      );
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
    }
  };

  // Obter carrinho do usuário
  router.get('/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      // Garantir que usuário existe
      await ensureUserExists(userId);

      const result = await pool.query(
        `SELECT ci.id, ci.product_id, p.name, p.price, ci.quantity, (p.price * ci.quantity) as subtotal
         FROM cart_items ci
         JOIN products p ON ci.product_id = p.id
         WHERE ci.user_id = $1`,
        [userId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar carrinho' });
    }
  });

  // Adicionar produto ao carrinho
  router.post('/:userId/add', async (req, res) => {
    try {
      const { userId } = req.params;
      const { productId, quantity } = req.body;

      // Garantir que usuário existe
      await ensureUserExists(userId);

      // Verificar se produto existe e tem estoque
      const productCheck = await pool.query('SELECT stock FROM products WHERE id = $1', [productId]);
      if (productCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }
      if (productCheck.rows[0].stock < quantity) {
        return res.status(400).json({ error: 'Estoque insuficiente' });
      }

      // Verificar se item já está no carrinho
      const existingItem = await pool.query(
        'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
        [userId, productId]
      );

      if (existingItem.rows.length > 0) {
        // Atualizar quantidade
        const newQuantity = existingItem.rows[0].quantity + quantity;
        if (productCheck.rows[0].stock < newQuantity) {
          return res.status(400).json({ error: 'Estoque insuficiente' });
        }
        await pool.query(
          'UPDATE cart_items SET quantity = $1 WHERE id = $2',
          [newQuantity, existingItem.rows[0].id]
        );
      } else {
        // Criar novo item no carrinho
        await pool.query(
          'INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)',
          [userId, productId, quantity]
        );
      }

      res.json({ message: 'Produto adicionado ao carrinho' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao adicionar ao carrinho' });
    }
  });

  // Atualizar quantidade do item no carrinho
  router.put('/:userId/item/:itemId', async (req, res) => {
    try {
      const { userId, itemId } = req.params;
      const { quantity } = req.body;

      if (quantity <= 0) {
        await pool.query('DELETE FROM cart_items WHERE id = $1 AND user_id = $2', [itemId, userId]);
        return res.json({ message: 'Item removido do carrinho' });
      }

      await pool.query(
        'UPDATE cart_items SET quantity = $1 WHERE id = $2 AND user_id = $3',
        [quantity, itemId, userId]
      );

      res.json({ message: 'Quantidade atualizada' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar carrinho' });
    }
  });

  // Remover item do carrinho
  router.delete('/:userId/item/:itemId', async (req, res) => {
    try {
      const { userId, itemId } = req.params;
      await pool.query('DELETE FROM cart_items WHERE id = $1 AND user_id = $2', [itemId, userId]);
      res.json({ message: 'Item removido do carrinho' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao remover item' });
    }
  });

  // Limpar carrinho
  router.delete('/:userId/clear', async (req, res) => {
    try {
      const { userId } = req.params;
      await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
      res.json({ message: 'Carrinho limpo' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao limpar carrinho' });
    }
  });

  return router;
};
