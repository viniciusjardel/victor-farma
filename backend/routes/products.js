const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // Listar todos os produtos
  router.get('/', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM products ORDER BY name');
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
  });

  // Buscar produto por ID
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar produto' });
    }
  });

  // Criar produto (admin)
  router.post('/', async (req, res) => {
    try {
      const { name, description, price, stock, image_url, category } = req.body;
      const result = await pool.query(
        'INSERT INTO products (name, description, price, stock, image_url, category) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [name, description, price, stock, image_url, category]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar produto' });
    }
  });

  // Atualizar produto (admin)
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, price, stock, image_url, category } = req.body;
      const result = await pool.query(
        'UPDATE products SET name = $1, description = $2, price = $3, stock = $4, image_url = $5, category = $6 WHERE id = $7 RETURNING *',
        [name, description, price, stock, image_url, category, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
  });

  // Deletar produto (admin)
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }
      res.json({ message: 'Produto deletado com sucesso' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao deletar produto' });
    }
  });

  return router;
};
