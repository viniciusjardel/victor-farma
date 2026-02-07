const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // Dashboard - resumo de vendas
  router.get('/dashboard', async (req, res) => {
    try {
      const ordersResult = await pool.query('SELECT COUNT(*) as total_orders FROM orders');
      const revenueResult = await pool.query('SELECT COALESCE(SUM(total), 0) as total_revenue FROM orders WHERE status != $1', ['cancelled']);
      const productsResult = await pool.query('SELECT COUNT(*) as total_products FROM products');
      const lowStockResult = await pool.query('SELECT id, name, stock FROM products WHERE stock < 10 ORDER BY stock');

      res.json({
        totalOrders: ordersResult.rows[0].total_orders,
        totalRevenue: parseFloat(revenueResult.rows[0].total_revenue),
        totalProducts: productsResult.rows[0].total_products,
        lowStockProducts: lowStockResult.rows
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar dashboard' });
    }
  });

  // Listar todos os pedidos
  router.get('/orders', async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT * FROM orders ORDER BY created_at DESC'
      );
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar pedidos' });
    }
  });

  // Buscar detalhes do pedido
  router.get('/orders/:orderId', async (req, res) => {
    try {
      const { orderId } = req.params;
      const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
      
      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      const itemsResult = await pool.query(
        `SELECT oi.id, oi.product_id, p.name, oi.quantity, oi.price
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = $1`,
        [orderId]
      );

      res.json({
        order: orderResult.rows[0],
        items: itemsResult.rows
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar pedido' });
    }
  });

  // Relatório de vendas
  router.get('/reports/sales', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT DATE(created_at) as date, COUNT(*) as orders, COALESCE(SUM(total), 0) as revenue
         FROM orders
         WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(created_at)
         ORDER BY date DESC`
      );
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar relatório' });
    }
  });

  // Produtos mais vendidos
  router.get('/reports/top-products', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT p.id, p.name, SUM(oi.quantity) as total_sold, COUNT(DISTINCT oi.order_id) as times_sold
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         GROUP BY p.id, p.name
         ORDER BY total_sold DESC
         LIMIT 10`
      );
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar produtos mais vendidos' });
    }
  });

  return router;
};
