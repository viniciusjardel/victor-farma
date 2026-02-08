const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

module.exports = (pool) => {
  // Criar pedido
  router.post('/', async (req, res) => {
    try {
      const { userId, items, customerName, customerPhone, deliveryAddress, paymentMethod } = req.body;

      // Validar dados
      if (!userId || !items || items.length === 0 || !customerName || !deliveryAddress) {
        return res.status(400).json({ error: 'Dados inválidos' });
      }

      // Calcular total
      let total = 0;
      for (const item of items) {
        const productResult = await pool.query('SELECT price FROM products WHERE id = $1', [item.productId]);
        if (productResult.rows.length === 0) {
          return res.status(404).json({ error: `Produto ${item.productId} não encontrado` });
        }
        total += productResult.rows[0].price * item.quantity;
      }

      // Criar pedido
      const orderId = uuidv4();
      const createdAt = new Date().toISOString();
      
      const orderResult = await pool.query(
        `INSERT INTO orders (id, user_id, customer_name, customer_phone, delivery_address, total, payment_method, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [orderId, userId, customerName, customerPhone, deliveryAddress, total, paymentMethod, 'pending', createdAt]
      );

      // Adicionar itens do pedido
      for (const item of items) {
        const productResult = await pool.query('SELECT price FROM products WHERE id = $1', [item.productId]);
        const price = productResult.rows[0].price;

        await pool.query(
          `INSERT INTO order_items (id, order_id, product_id, quantity, price)
           VALUES ($1, $2, $3, $4, $5)`,
          [uuidv4(), orderId, item.productId, item.quantity, price]
        );

        // Atualizar estoque
        await pool.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [item.quantity, item.productId]
        );
      }

      // Limpar carrinho
      await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

      // Gerar QR Code PIX (simulado)
      const pixQRCode = generatePixQRCode(total, orderId);

      res.status(201).json({
        order: orderResult.rows[0],
        pixQRCode: pixQRCode,
        message: 'Pedido criado com sucesso'
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar pedido' });
    }
  });

  // Buscar pedido por ID
  router.get('/:orderId', async (req, res) => {
    try {
      const { orderId } = req.params;
      const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
      
      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      let order = orderResult.rows[0];

      // 🔄 Se tem payment_id, consultar status real da API PIX (Mercado Pago)
      if (order.payment_id) {
        try {
          const PIX_API_URL = process.env.PIX_API_URL || 'https://pix-project.onrender.com';
          const pixResponse = await axios.get(`${PIX_API_URL}/status/${order.payment_id}`);
          
          console.log(`📊 Status do Mercado Pago para ${order.payment_id}:`, pixResponse.data.status);
          
          // Se status mudou para approved, atualizar no banco
          if (pixResponse.data.status === 'approved' && order.payment_status !== 'approved') {
            console.log(`✅ Pagamento ${order.payment_id} confirmado! Atualizando BD...`);
            
            const updateResult = await pool.query(
              'UPDATE orders SET payment_status = $1, status = $2 WHERE id = $3 RETURNING *',
              ['approved', 'confirmed', orderId]
            );
            
            order = updateResult.rows[0];
            console.log(`✅ Pedido ${orderId} atualizado para CONFIRMED`);
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao consultar API PIX para ${order.payment_id}:`, error.message);
          // Continua com o status do banco local se a API falhar
        }
      }

      const itemsResult = await pool.query(
        `SELECT oi.id, oi.product_id, p.name, oi.quantity, oi.price, (oi.quantity * oi.price) as subtotal
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = $1`,
        [orderId]
      );

      res.json({
        order,
        items: itemsResult.rows
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar pedido' });
    }
  });

  // Listar pedidos do usuário
  router.get('/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await pool.query(
        'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar pedidos' });
    }
  });

  // Gerar PIX para pagamento
  router.post('/:orderId/generate-pix', async (req, res) => {
    try {
      const { orderId } = req.params;

      // Buscar pedido
      const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      const order = orderResult.rows[0];
      
      // Se já tem payment_id, retorna o existente
      if (order.payment_id) {
        return res.json({
          paymentId: order.payment_id,
          status: order.payment_status || 'pending',
          message: 'PIX já gerado'
        });
      }

      // Chamar PIX service para gerar novo PIX
      const pixResponse = await axios.post('https://pix-project.onrender.com/pix', {
        valor: parseFloat(order.total),
        descricao: `Pedido #${orderId.slice(0, 8)}`
      });

      // Salvar payment_id e qr_code no banco
      const updateResult = await pool.query(
        'UPDATE orders SET payment_id = $1, payment_status = $2 WHERE id = $3 RETURNING *',
        [pixResponse.data.id, 'pending', orderId]
      );

      res.json({
        paymentId: pixResponse.data.id,
        qrCode: pixResponse.data.qr_code,
        qrCodeBase64: pixResponse.data.qr_code_base64,
        status: 'pending',
        valor: order.total
      });

    } catch (error) {
      console.error('Erro ao gerar PIX:', error.message);
      res.status(500).json({ error: 'Erro ao gerar PIX' });
    }
  });

  // Webhook: PIX service notifica quando pagamento é confirmado
  router.post('/webhook/payment', async (req, res) => {
    try {
      const { paymentId, status, orderId } = req.body;

      if (!paymentId || !status || !orderId) {
        console.warn('Webhook: Dados inválidos -', { paymentId, status, orderId });
        return res.status(400).json({ error: 'Dados inválidos' });
      }

      // Atualizar status do pagamento no pedido usando orderId
      const updateResult = await pool.query(
        'UPDATE orders SET payment_status = $1, status = $2, payment_id = $3 WHERE id = $4 RETURNING *',
        [status, status === 'approved' ? 'confirmed' : 'pending', paymentId, orderId]
      );

      if (updateResult.rows.length === 0) {
        console.warn(`Webhook: Pedido com ID ${orderId} não encontrado`);
        return res.json({ message: 'Processado' }); // Não retorna erro pro webhook
      }

      const order = updateResult.rows[0];
      console.log(`✅ Webhook PIX: Pedido ${orderId} atualizado para status=${order.status}, payment_status=${order.payment_status}`);

      res.json({ 
        message: 'Webhook processado com sucesso',
        order
      });

    } catch (error) {
      console.error('Erro no webhook de pagamento:', error.message);
      res.status(500).json({ error: 'Erro ao processar webhook' });
    }
  });

  // Atualizar status do pedido (admin)
  router.patch('/:orderId/status', async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      const validStatuses = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Status inválido' });
      }

      const result = await pool.query(
        'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
        [status, orderId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar pedido' });
    }
  });

  // Confirmar pagamento PIX
  router.post('/:orderId/confirm-payment', async (req, res) => {
    try {
      const { orderId } = req.params;
      const result = await pool.query(
        'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
        ['confirmed', orderId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      res.json({ message: 'Pagamento confirmado', order: result.rows[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao confirmar pagamento' });
    }
  });

  // 🧪 ENDPOINT DE TESTE: Simula webhook de pagamento confirmado (REMOVER EM PRODUÇÃO)
  router.post('/test-webhook/:orderId', async (req, res) => {
    try {
      const { orderId } = req.params;
      
      // Buscar pedido para obter payment_id
      const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }
      
      const order = orderResult.rows[0];
      const paymentId = order.payment_id;
      
      if (!paymentId) {
        return res.status(400).json({ error: 'Pedido não tem payment_id' });
      }
      
      console.log(`🧪 [TEST] Simulando webhook para orderId: ${orderId}, paymentId: ${paymentId}`);
      
      // Chamar o webhook como se fosse o serviço PIX
      const updateResult = await pool.query(
        'UPDATE orders SET payment_status = $1, status = $2 WHERE id = $3 RETURNING *',
        ['approved', 'confirmed', orderId]
      );
      
      console.log(`✅ [TEST] Pedido ${orderId} atualizado para CONFIRMED`);
      
      res.json({
        message: '✅ Pagamento simulado com sucesso',
        order: updateResult.rows[0]
      });
      
    } catch (error) {
      console.error('❌ Erro no test-webhook:', error);
      res.status(500).json({ error: 'Erro ao processar test-webhook' });
    }
  });

  return router;
};

// Função para gerar QR Code PIX (simulado - em produção usar biblioteca real)
function generatePixQRCode(amount, orderId) {
  // Simulação de QR Code
  return {
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020126580014br.gov.bcb.brcode01051.0.063047052025502${orderId}5204000053039865406${amount.toFixed(2)}5802BR5913VICTOR FARMA6009SAO PAULO62410503***63047D91`,
    amount: amount,
    orderId: orderId
  };
}
