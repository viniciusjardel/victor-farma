const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // Função auxiliar para decrementar estoque quando pagamento é aprovado
  const decrementarEstoqueDosPedido = async (orderId, client = null) => {
    const db = client || pool;
    
    console.log(`🔄 [DECREMENT] Iniciando decrementação para pedido ${orderId}`);
    
    try {
      // Buscar todos os itens do pedido com estoque atual dos produtos
      const itemsResult = await db.query(
        `SELECT oi.product_id, oi.quantity, p.name, p.stock 
         FROM order_items oi 
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = $1`,
        [orderId]
      );

      console.log(`📦 Itens encontrados:`, itemsResult.rows.length, itemsResult.rows);

      // Validar se há estoque suficiente para todos os itens
      for (const item of itemsResult.rows) {
        if (item.stock < item.quantity) {
          throw new Error(`Estoque insuficiente para ${item.name}: disponível ${item.stock}, solicitado ${item.quantity}`);
        }
      }

      // Decrementar estoque para cada item
      for (const item of itemsResult.rows) {
        console.log(`  📉 Decrementando ${item.product_id}: ${item.quantity} unidades (estoque atual: ${item.stock})`);
        
        const result = await db.query(
          `UPDATE products 
           SET stock = stock - $1 
           WHERE id = $2
           RETURNING stock, name`,
          [item.quantity, item.product_id]
        );

        if (result.rows[0]) {
          console.log(`  ✅ Estoque: ${result.rows[0].name} -${item.quantity} unidades (novo total: ${result.rows[0].stock})`);
        }
      }

      console.log(`✅ Estoque do pedido ${orderId} decrementado com sucesso!`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao decrementar estoque do pedido ${orderId}:`, error.message);
      throw error;
    }
  };
  // Dashboard - resumo de vendas
  router.get('/dashboard', async (req, res) => {
    try {
      // ✅ Total de pedidos (todos)
      const ordersResult = await pool.query('SELECT COUNT(*) as total_orders FROM orders');
      
      // ✅ NOVO: Receita total apenas de pedidos APROVADOS (payment_status = 'aprovado')
      const revenueResult = await pool.query(
        'SELECT COALESCE(SUM(total), 0) as total_revenue FROM orders WHERE payment_status = $1',
        ['aprovado']
      );
      
      // Total de produtos
      const productsResult = await pool.query('SELECT COUNT(*) as total_products FROM products');
      
      // Produtos com estoque baixo
      const lowStockResult = await pool.query('SELECT id, name, stock FROM products WHERE stock < 10 ORDER BY stock');

      console.log(`📊 Dashboard: ${ordersResult.rows[0].total_orders} pedidos, R$ ${parseFloat(revenueResult.rows[0].total_revenue).toFixed(2)} em receita aprovada`);

      res.json({
        totalOrders: ordersResult.rows[0].total_orders,
        totalRevenue: parseFloat(revenueResult.rows[0].total_revenue),
        totalProducts: productsResult.rows[0].total_products,
        lowStockProducts: lowStockResult.rows
      });
    } catch (error) {
      console.error('❌ Erro ao buscar dashboard:', error);
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

  // Atualizar pedido (aceita status e payment_status) - para painel admin
  router.patch('/orders/:orderId', async (req, res) => {
    let client;
    try {
      const { orderId } = req.params;
      const { status, payment_status } = req.body;

      console.log(`📝 [ADMIN] Atualizando pedido ${orderId} com:`, { status, payment_status });

      const statusValidos = ['em preparação', 'em rota de entrega', 'entregue', 'cancelado'];
      const paymentStatusValidos = ['aprovado', 'pendente', 'cancelado'];

      if (status && !statusValidos.includes(status)) {
        return res.status(400).json({ error: 'Status de pedido inválido', statusValidos });
      }

      if (payment_status && !paymentStatusValidos.includes(payment_status)) {
        return res.status(400).json({ error: 'Status de pagamento inválido', paymentStatusValidos });
      }

      client = await pool.connect();

      try {
        // Iniciar transação
        await client.query('BEGIN');

        const currentResult = await client.query(
          'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
          [orderId]
        );
        
        if (currentResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        const currentOrder = currentResult.rows[0];
        const statusAnterior = currentOrder.payment_status;
        
        console.log(`📊 Status anterior do pagamento: ${statusAnterior}`);

        let updateQuery = 'UPDATE orders SET';
        let params = [];
        let paramCount = 1;

        if (status) {
          updateQuery += ` status = $${paramCount}`;
          params.push(status);
          paramCount++;
        }

        if (payment_status) {
          if (status) updateQuery += ', ';
          updateQuery += ` payment_status = $${paramCount}`;
          params.push(payment_status);
          paramCount++;
        }

        updateQuery += `, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`;
        params.push(orderId);

        const result = await client.query(updateQuery, params);
        let estoqueDecrementado = false;

        // 🎯 Se payment_status mudou para "aprovado" E o status anterior não era "aprovado", decrementar estoque
        console.log(`🔍 Verificando: payment_status=${payment_status} && statusAnterior=${statusAnterior}`);
        
        if (payment_status === 'aprovado' && statusAnterior !== 'aprovado') {
          console.log(`🛒 ✅ CONFIRMADO! Decrementando estoque do pedido ${orderId}...`);
          
          try {
            await decrementarEstoqueDosPedido(orderId, client);
            estoqueDecrementado = true;
          } catch (error) {
            console.error(`❌ Erro na decrementação:`, error.message);
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Erro ao decrementar estoque', details: error.message });
          }
        } else {
          console.log(`⚠️ Condição não atendida para decrementar. payment_status=${payment_status}, statusAnterior=${statusAnterior}`);
        }

        // Confirmar transação
        await client.query('COMMIT');

        res.json({ 
          message: 'Status atualizado com sucesso', 
          order: result.rows[0],
          estoqueDecrementado
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Erro ao atualizar pedido (admin):', error);
      res.status(500).json({ error: 'Erro ao atualizar pedido', details: error.message });
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
