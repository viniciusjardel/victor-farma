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
    let client;
    try {
      const { id } = req.params;
      
      // Validar ID
      if (!id || typeof id !== 'string' || id.trim() === '') {
        return res.status(400).json({ error: 'ID do produto inválido' });
      }
      
      console.log(`🗑️ Tentando deletar produto: ${id}`);
      
      // Obter conexão do pool
      client = await pool.connect();
      
      try {
        // Usar transação para garantir integridade
        await client.query('BEGIN');
        
        // Primeiro, deletar itens do carrinho referenciados a este produto
        try {
          const cartDelete = await client.query('DELETE FROM cart_items WHERE product_id = $1', [id]);
          console.log(`  ✓ Deletados ${cartDelete.rowCount} itens do carrinho`);
        } catch (cartErr) {
          console.warn(`  ⚠️ Aviso ao deletar do carrinho: ${cartErr.message}`);
          // Continuar mesmo se houver erro, pois pode ser constraint ou tabela inexistente
        }
        
        // Depois, deletar itens dos pedidos referenciados a este produto
        try {
          const orderDelete = await client.query('DELETE FROM order_items WHERE product_id = $1', [id]);
          console.log(`  ✓ Deletados ${orderDelete.rowCount} itens de pedidos`);
        } catch (orderErr) {
          console.warn(`  ⚠️ Aviso ao deletar de pedidos: ${orderErr.message}`);
          // Continuar mesmo se houver erro
        }
        
        // Por fim, deletar o produto
        const result = await client.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
          await client.query('ROLLBACK');
          console.warn(`⚠️ Produto não encontrado: ${id}`);
          return res.status(404).json({ 
            error: 'Produto não encontrado',
            productId: id
          });
        }
        
        // Confirmar transação
        await client.query('COMMIT');
        
        console.log(`✅ Produto deletado com sucesso:`, result.rows[0].name);
        res.json({ 
          success: true,
          message: 'Produto deletado com sucesso', 
          product: result.rows[0] 
        });
      } catch (txnError) {
        // Se houver erro na transação, fazer rollback
        try {
          await client.query('ROLLBACK');
        } catch (rollbackErr) {
          console.error(`Erro ao fazer rollback: ${rollbackErr.message}`);
        }
        throw txnError;
      }
    } catch (error) {
      console.error(`❌ Erro ao deletar produto [${req.params.id}]:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack
      });
      
      res.status(500).json({ 
        error: 'Erro ao deletar produto',
        message: error.message || 'Erro desconhecido',
        details: error.detail || 'Verifique os logs do servidor'
      });
    } finally {
      // Sempre liberar a conexão
      if (client) {
        try {
          client.release();
          console.log('  ✓ Conexão liberada');
        } catch (releaseErr) {
          console.error(`Erro ao liberar conexão: ${releaseErr.message}`);
        }
      }
    }
  });

  // Endpoint de diagnóstico (DEBUG)
  router.get('/debug/info/:id', async (req, res) => {
    let client;
    try {
      const { id } = req.params;
      
      console.log(`🔍 Diagnóstico do produto: ${id}`);
      
      client = await pool.connect();
      
      // Buscar produto
      const productResult = await client.query('SELECT * FROM products WHERE id = $1', [id]);
      
      let cartDeps = [];
      let orderDeps = [];
      
      try {
        const cartResult = await client.query('SELECT id, user_id, quantity FROM cart_items WHERE product_id = $1', [id]);
        cartDeps = cartResult.rows;
      } catch (e) {
        console.warn('  ⚠️ Erro ao buscar cart_items:', e.message);
      }
      
      try {
        const orderResult = await client.query('SELECT id, order_id, quantity FROM order_items WHERE product_id = $1', [id]);
        orderDeps = orderResult.rows;
      } catch (e) {
        console.warn('  ⚠️ Erro ao buscar order_items:', e.message);
      }
      
      res.json({
        product: productResult.rows[0] || null,
        cartItems: cartDeps.length,
        orderItems: orderDeps.length,
        canDelete: productResult.rows.length > 0,
        dependencies: {
          cartItems: cartDeps,
          orderItems: orderDeps
        }
      });
    } catch (error) {
      console.error('❌ Erro no diagnóstico:', error.message);
      res.status(500).json({
        error: 'Erro ao diagnosticar',
        message: error.message
      });
    } finally {
      if (client) client.release();
    }
  });

  return router;
};
