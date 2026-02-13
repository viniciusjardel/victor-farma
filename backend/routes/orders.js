const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

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
  // Criar pedido
  router.post('/', async (req, res) => {
    try {
      const { userId, items, customerName, customerPhone, deliveryAddress, paymentMethod } = req.body;

      // ✅ LOG DETALHADO DOS DADOS RECEBIDOS
      console.log('📥 POST /orders - Dados recebidos:', {
        userId,
        itemsCount: items?.length,
        customerName: `"${customerName}" (tipo: ${typeof customerName}, vazio: ${!customerName || customerName.trim() === ''})`,
        customerPhone: `"${customerPhone}" (tipo: ${typeof customerPhone}, vazio: ${!customerPhone || customerPhone.trim() === ''})`,
        deliveryAddress: `"${deliveryAddress}" (tipo: ${typeof deliveryAddress}, vazio: ${!deliveryAddress || deliveryAddress.trim() === ''})`,
        paymentMethod
      });

      // Validar dados
      if (!userId || !items || items.length === 0 || !customerName || !deliveryAddress) {
        console.error('❌ Validação falhou:', { userId, items: !!items, customerName, deliveryAddress });
        return res.status(400).json({ error: 'Dados inválidos: userId, items, customerName e deliveryAddress são obrigatórios' });
      }

      // 🔍 VALIDAÇÃO ADICIONAL: Dados vazios/whitespace
      if (customerName.trim() === '' || deliveryAddress.trim() === '') {
        console.error('❌ Dados com espaços vazios:', { customerName: customerName.trim(), deliveryAddress: deliveryAddress.trim() });
        return res.status(400).json({ error: 'Dados inválidos: Nome do cliente e endereço não podem ser vazios' });
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
      
      // Definir status de pagamento como 'pendente' para todos os métodos
      // O webhook do Mercado Pago atualiza para 'aprovado' quando pagamento é confirmado
      const paymentStatus = 'pendente';
      
      const orderResult = await pool.query(
        `INSERT INTO orders (id, user_id, customer_name, customer_phone, delivery_address, total, payment_method, status, payment_status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [orderId, userId, customerName.trim(), customerPhone?.trim() || '', deliveryAddress.trim(), total, paymentMethod, 'em preparação', paymentStatus, createdAt]
      );

      // Adicionar itens do pedido (SEM decrementar estoque ainda)
      for (const item of items) {
        const productResult = await pool.query('SELECT price FROM products WHERE id = $1', [item.productId]);
        const price = productResult.rows[0].price;

        await pool.query(
          `INSERT INTO order_items (id, order_id, product_id, quantity, price)
           VALUES ($1, $2, $3, $4, $5)`,
          [uuidv4(), orderId, item.productId, item.quantity, price]
        );

        // ⚠️ NÃO decrementar estoque aqui! Só depois que pagamento for confirmado
      }

      // Limpar carrinho
      await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

      console.log('✅ Pedido criado com sucesso:', {
        orderId,
        customer_name: orderResult.rows[0].customer_name,
        total: orderResult.rows[0].total,
        itemsCount: items.length
      });

      res.status(201).json({
        order: orderResult.rows[0],
        message: 'Pedido criado com sucesso'
      });
    } catch (error) {
      console.error('❌ Erro ao criar pedido:', error.message);
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

      // 🔄 Se tem payment_id, consultar status real da API PIX (Mercado Pago) — COM TIMEOUT
      if (order.payment_id) {
        try {
          const PIX_API_URL = process.env.PIX_API_URL || 'https://pix-victor-farma.onrender.com';
          const pixResponse = await axios.get(`${PIX_API_URL}/status/${order.payment_id}`, { timeout: 5000 });
          
          console.log(`📊 Status do Mercado Pago para ${order.payment_id}:`, pixResponse.data.status);
          
          // Se status mudou para approved, atualizar no banco E DECREMENTAR ESTOQUE
          if (pixResponse.data.status === 'approved' && order.payment_status !== 'aprovado') {
            console.log(`✅ Pagamento ${order.payment_id} confirmado! Atualizando BD e decrementando estoque...`);
            
            const updateResult = await pool.query(
              'UPDATE orders SET payment_status = $1 WHERE id = $2 RETURNING *',
              ['aprovado', orderId]
            );
            
            order = updateResult.rows[0];
            console.log(`✅ Pedido ${orderId} atualizado para aprovado`);
            
            // Inserir na tabela de receita (se ainda não existir)
            try {
              await pool.query(
                `INSERT INTO revenue (order_id, amount, status)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (order_id) DO NOTHING`,
                [orderId, order.total, 'aprovado']
              );
              console.log(`💰 Receita registrada para pedido ${orderId}: R$ ${order.total}`);
            } catch (revErr) {
              console.error(`⚠️ Erro ao inserir receita para pedido ${orderId}:`, revErr.message);
            }

            // 📦 Também decrementar estoque AQUI como fallback (evita webhook demorada)
            try {
              console.log(`📦 Decrementando estoque do pedido via GET endpoint...`);
              await decrementarEstoqueDosPedido(orderId);
              console.log(`✅ Estoque decrementado com sucesso!`);
            } catch (stockError) {
              console.error(`⚠️ Erro ao decrementar estoque no GET:`, stockError.message);
              // Não bloqueia a resposta se falhar
            }
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao consultar API PIX para ${order.payment_id}:`, error.message);
          // Continua com o status do banco local se a API falhar — NÃO bloqueia
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
      console.error('❌ ERRO em GET /orders/:orderId -', error.message);
      console.error('Stack:', error.stack);
      res.status(500).json({ error: 'Erro ao buscar pedido', details: error.message });
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

      // Chamar PIX service para gerar novo PIX (API REAL OBRIGATÓRIA)
      let pixResponse;
      try {
        const PIX_SERVICE_URL = process.env.PIX_API_URL || 'https://pix-victor-farma.onrender.com';
        pixResponse = await axios.post(`${PIX_SERVICE_URL}/pix`, {
          valor: parseFloat(order.total),
          descricao: `Pedido #${orderId.slice(0, 8)}`
        }, { timeout: 10000 });
        console.log('✅ PIX gerado do serviço Mercado Pago real');
      } catch (error) {
        console.error('❌ ERRO CRÍTICO: Não foi possível gerar PIX real via Mercado Pago:', error.message);
        console.error('   Verifique se:');
        console.error('   1. PIX_API_URL está configurado no Render');
        console.error('   2. Serviço backend-pix está rodando (https://pix-victor-farma.onrender.com)');
        console.error('   3. MP_ACCESS_TOKEN está configurado no backend-pix');
        throw new Error('Serviço PIX indisponível. Não é possível gerar pagamento.');
      }

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
      console.error('❌ Erro ao gerar PIX:', error.message);
      console.error('Stack:', error.stack);
      res.status(500).json({ 
        error: 'Erro ao gerar PIX',
        details: error.message,
        hint: 'Verifique se o serviço backend-pix está rodando e se MP_ACCESS_TOKEN está configurado'
      });
    }
  });

  // Webhook: PIX service notifica quando pagamento é confirmado
  router.post('/webhook/payment', async (req, res) => {
    let client;
    try {
      const { paymentId, status, orderId } = req.body;

      console.log(`🔔 [WEBHOOK] Recebido:`, { paymentId, status, orderId });

      if (!paymentId || !status || !orderId) {
        console.warn('Webhook: Dados inválidos -', { paymentId, status, orderId });
        return res.status(400).json({ error: 'Dados inválidos' });
      }

      // Mapear status do Mercado Pago para payment_status
      let paymentStatus = 'pendente';
      if (status === 'approved') {
        paymentStatus = 'aprovado';
      }

      client = await pool.connect();

      try {
        // Iniciar transação para garantir integridade
        await client.query('BEGIN');

        // Buscar o pedido primeiro
        const orderCheckResult = await client.query(
          'SELECT payment_status FROM orders WHERE id = $1 FOR UPDATE',
          [orderId]
        );

        if (orderCheckResult.rows.length === 0) {
          await client.query('ROLLBACK');
          console.warn(`Webhook: Pedido com ID ${orderId} não encontrado`);
          return res.json({ message: 'Processado - Pedido não encontrado' });
        }

        const currentPaymentStatus = orderCheckResult.rows[0].payment_status;

        // Se já foi processado, não processar novamente
        if (currentPaymentStatus === 'aprovado') {
          await client.query('ROLLBACK');
          console.log(`⚠️ Webhook PIX: Pedido ${orderId} já foi processado anteriormente`);
          return res.json({ message: 'Pedido já processado' });
        }

        // Atualizar payment_status, payment_id e status do pedido quando aprovado
        let statusAtualizado = status === 'approved' ? 'confirmed' : 'pending';
        
        const updateResult = await client.query(
          'UPDATE orders SET payment_status = $1, payment_id = $2, status = $3 WHERE id = $4 RETURNING *',
          [paymentStatus, paymentId, statusAtualizado, orderId]
        );

        const order = updateResult.rows[0];
        console.log(`✅ Webhook PIX: Pedido ${orderId} - payment_status atualizado para: ${paymentStatus}, status do pedido: ${statusAtualizado}`);

        // 📦 Se pagamento foi aprovado, decrementar estoque
        if (status === 'approved') {
          console.log(`📦 Decrementando estoque para pedido ${orderId}...`);
          
          try {
            await decrementarEstoqueDosPedido(orderId, client);
          } catch (error) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Erro ao decrementar estoque', details: error.message });
          }
        
          // Inserir registro de receita dentro da mesma transação
          try {
            await client.query(
              `INSERT INTO revenue (order_id, amount, status)
               VALUES ($1, $2, $3)
               ON CONFLICT (order_id) DO NOTHING`,
              [orderId, order.total, 'aprovado']
            );
            console.log(`💰 Receita registrada (webhook) para pedido ${orderId}: R$ ${order.total}`);
          } catch (revErr) {
            // Se falhar na inserção da receita, abortar para garantir consistência
            await client.query('ROLLBACK');
            console.error(`❌ Erro ao inserir receita para pedido ${orderId} no webhook:`, revErr.message);
            return res.status(500).json({ error: 'Erro ao registrar receita', details: revErr.message });
          }
        }

        // Confirmar transação
        await client.query('COMMIT');

        res.json({ 
          message: 'Webhook processado com sucesso',
          order
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Erro no webhook de pagamento:', error.message);
      res.status(500).json({ error: 'Erro ao processar webhook', details: error.message });
    }
  });

  // Atualizar status do pedido (admin)
  router.patch('/:orderId/status', async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      const validStatuses = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'entregue', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Status inválido' });
      }

      // Buscar pedido atual para saber o status anterior
      const currentOrderResult = await pool.query(
        'SELECT * FROM orders WHERE id = $1',
        [orderId]
      );

      if (currentOrderResult.rows.length === 0) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      const currentOrderStatus = currentOrderResult.rows[0].status;
      const orderTotal = currentOrderResult.rows[0].total;

      // Atualizar status do pedido
      const result = await pool.query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, orderId]
      );

        // Se mudou para 'confirmed' ou 'delivered'/'entregue' (e não era antes), adicionar à receita
        if ((status === 'confirmed' || status === 'delivered' || status === 'entregue') && 
          (currentOrderStatus !== 'confirmed' && currentOrderStatus !== 'delivered' && currentOrderStatus !== 'entregue')) {
        
        try {
          // Verificar se já existe receita para este pedido
          const existingRevenue = await pool.query(
            'SELECT id FROM revenue WHERE order_id = $1',
            [orderId]
          );

          // Apenas adicionar se não existir
          if (existingRevenue.rows.length === 0) {
            await pool.query(
              'INSERT INTO revenue (id, order_id, amount, status, created_at) VALUES ($1, $2, $3, $4, NOW())',
              [uuidv4(), orderId, orderTotal, status]
            );
            console.log(`✅ Receita adicionada para pedido ${orderId}: R$ ${orderTotal}`);
          }
        } catch (revenueError) {
          console.error('⚠️ Erro ao adicionar receita:', revenueError);
          // Não bloqueia a atualização de status se houver erro na receita
        }
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar pedido' });
    }
  });

  // Confirmar pagamento PIX
  router.post('/:orderId/confirm-payment', async (req, res) => {
    let client;
    try {
      const { orderId } = req.params;

      client = await pool.connect();

      try {
        // Iniciar transação
        await client.query('BEGIN');

        // Buscar status atual do pedido
        const currentResult = await client.query(
          'SELECT payment_status FROM orders WHERE id = $1 FOR UPDATE',
          [orderId]
        );

        if (currentResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        const statusAnterior = currentResult.rows[0].payment_status;

        // Atualizar status de pagamento
        const result = await client.query(
          'UPDATE orders SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
          ['aprovado', orderId]
        );

        // 📦 Se payment_status mudou para "aprovado" E o status anterior não era "aprovado", decrementar estoque
        if (statusAnterior !== 'aprovado') {
          console.log(`📦 Decrementando estoque para pedido ${orderId}...`);
          
          try {
            await decrementarEstoqueDosPedido(orderId, client);
          } catch (error) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Erro ao decrementar estoque', details: error.message });
          }
        }

        // Confirmar transação
        await client.query('COMMIT');

        res.json({ 
          message: 'Pagamento confirmado e estoque atualizado',
          order: result.rows[0],
          estoqueDecrementado: statusAnterior !== 'aprovado'
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao confirmar pagamento', details: error.message });
    }
  });

  // 🧪 ENDPOINT DE TESTE: Simula webhook de pagamento confirmado (REMOVER EM PRODUÇÃO)
  router.post('/test-webhook/:orderId', async (req, res) => {
    let client;
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
      
      client = await pool.connect();

      try {
        // Iniciar transação
        await client.query('BEGIN');

        // Atualizar status
        const updateResult = await client.query(
          'UPDATE orders SET payment_status = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
          ['aprovado', 'em preparação', orderId]
        );
        
        // Decrementar estoque se o status anterior não era 'aprovado'
        if (order.payment_status !== 'aprovado') {
          console.log(`📦 [TEST] Decrementando estoque do pedido ${orderId}...`);
          
          try {
            await decrementarEstoqueDosPedido(orderId, client);
          } catch (error) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Erro ao decrementar estoque', details: error.message });
          }
        }

        await client.query('COMMIT');
        
        console.log(`✅ [TEST] Pedido ${orderId} atualizado para APROVADO com estoque decrementado`);
        
        res.json({
          message: '✅ Pagamento simulado com sucesso e estoque decrementado',
          order: updateResult.rows[0],
          estoqueDecrementado: order.payment_status !== 'aprovado'
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('❌ Erro no test-webhook:', error);
      res.status(500).json({ error: 'Erro ao processar test-webhook', details: error.message });
    }
  });

  // 🔴 Cancelar pedido e restaurar estoque
  router.post('/:orderId/cancel', async (req, res) => {
    try {
      const { orderId } = req.params;

      // Buscar pedido
      const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      const order = orderResult.rows[0];

      // Se já foi confirmado e o estoque foi decrementado, restaurar
      if (order.status === 'confirmed' || order.payment_status === 'approved') {
        console.log(`🔴 Cancelando pedido ${orderId} e restaurando estoque...`);
        
        const itemsResult = await pool.query(
          'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
          [orderId]
        );

        for (const item of itemsResult.rows) {
          const restoreResult = await pool.query(
            'UPDATE products SET stock = stock + $1 WHERE id = $2 RETURNING stock',
            [item.quantity, item.product_id]
          );
          
          if (restoreResult.rows[0]) {
            console.log(`  ✓ Produto ${item.product_id}: +${item.quantity} unidades restauradas (total: ${restoreResult.rows[0].stock})`);
          }
        }
      }

      // Atualizar status do pedido para "cancelado"
      const cancelResult = await pool.query(
        'UPDATE orders SET status = $1, payment_status = $2 WHERE id = $3 RETURNING *',
        ['cancelado', 'cancelado', orderId]
      );

      console.log(`✅ Pedido ${orderId} cancelado`);

      res.json({
        message: 'Pedido cancelado com sucesso',
        order: cancelResult.rows[0]
      });

    } catch (error) {
      console.error('❌ Erro ao cancelar pedido:', error);
      res.status(500).json({ error: 'Erro ao cancelar pedido' });
    }
  });

  // Obter receita total (de TODOS os pedidos aprovados, não apenas da tabela revenue)
  router.get('/admin/revenue/total', async (req, res) => {
    try {
      // ✅ NOVO: Calcular receita DIRETAMENTE dos pedidos aprovados
      // Inclui todos os pedidos com payment_status = 'aprovado'
      console.log('💰 Buscando receita total de pedidos aprovados...');
      
      const result = await pool.query(`
        SELECT 
          COALESCE(SUM(total), 0) as total_revenue,
          COUNT(*) as transaction_count
        FROM orders
        WHERE payment_status = 'aprovado'
      `);
      
      const totalRevenue = parseFloat(result.rows[0].total_revenue);
      const transactionCount = result.rows[0].transaction_count;

      console.log(`✅ Receita total calculada: R$ ${totalRevenue.toFixed(2)} (${transactionCount} pedidos aprovados)`);

      res.json({
        total_revenue: totalRevenue,
        transaction_count: transactionCount,
        formatted: `R$ ${totalRevenue.toFixed(2)}`
      });
    } catch (error) {
      console.error('❌ Erro ao buscar receita total:', error);
      res.status(500).json({ error: 'Erro ao buscar receita total' });
    }
  });

  // Obter receita por período (de pedidos aprovados)
  router.get('/admin/revenue/period', async (req, res) => {
    try {
      const { start_date, end_date } = req.query;
      
      console.log(`📊 Buscando receita por período: ${start_date} a ${end_date}`);
      
      // ✅ NOVO: Buscar diretamente da tabela orders com payment_status = 'aprovado'
      let query = `
        SELECT 
          COALESCE(SUM(total), 0) as total_revenue,
          COUNT(*) as transaction_count
        FROM orders
        WHERE payment_status = 'aprovado'
      `;
      const params = [];
      let paramCount = 1;

      if (start_date) {
        query += ` AND created_at >= $${paramCount}`;
        params.push(new Date(start_date));
        paramCount++;
      }

      if (end_date) {
        query += ` AND created_at <= $${paramCount}`;
        params.push(new Date(end_date));
        paramCount++;
      }

      const result = await pool.query(query, params);
      
      const totalRevenue = parseFloat(result.rows[0].total_revenue);
      const transactionCount = result.rows[0].transaction_count;

      console.log(`✅ Receita período: R$ ${totalRevenue.toFixed(2)} (${transactionCount} pedidos)`);

      res.json({
        total_revenue: totalRevenue,
        transaction_count: transactionCount,
        formatted: `R$ ${totalRevenue.toFixed(2)}`,
        period: { start_date, end_date }
      });
    } catch (error) {
      console.error('❌ Erro ao buscar receita por período:', error);
      res.status(500).json({ error: 'Erro ao buscar receita por período' });
    }
  });

  // Obter histórico detalhado de receita
  router.get('/admin/revenue/history', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT 
          r.id,
          r.order_id,
          r.amount,
          r.status,
          r.created_at,
          o.customer_name,
          o.payment_method
        FROM revenue r
        JOIN orders o ON r.order_id = o.id
        ORDER BY r.created_at DESC
        LIMIT 100`
      );

      const totalRevenue = result.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);

      res.json({
        history: result.rows,
        total_revenue: totalRevenue,
        transaction_count: result.rows.length,
        formatted: `R$ ${totalRevenue.toFixed(2)}`
      });
    } catch (error) {
      console.error('Erro ao buscar histórico de receita:', error);
      res.status(500).json({ error: 'Erro ao buscar histórico de receita' });
    }
  });

  // ⚠️ TEMPORÁRIO: Deletar todos os pedidos (apenas para desenvolvimento)
  router.delete('/admin/all', async (req, res) => {
    try {
      const { confirm } = req.body;
      
      if (confirm !== true) {
        return res.status(400).json({ error: 'Confirmação necessária. Envie { confirm: true }' });
      }

      // Deletar receitas primeiro (por causa da foreign key)
      await pool.query('DELETE FROM revenue');
      
      // Deletar itens dos pedidos
      await pool.query('DELETE FROM order_items');
      
      // Deletar pedidos
      const result = await pool.query('DELETE FROM orders');

      console.log('🗑️ Todos os pedidos foram deletados!');
      
      res.json({
        message: '✅ Todos os pedidos foram deletados com sucesso',
        deleted_orders: result.rowCount
      });
    } catch (error) {
      console.error('Erro ao deletar todos os pedidos:', error);
      res.status(500).json({ error: 'Erro ao deletar pedidos' });
    }
  });

  // Atualizar ambos os status (pedido e pagamento) simultaneamente
  router.patch('/:orderId', async (req, res) => {
    let client;
    try {
      const { orderId } = req.params;
      const { status, payment_status } = req.body;

      console.log(`📝 [GENERIC PATCH] Atualizando pedido ${orderId} com:`, { status, payment_status });

      // Valores aceitos em português
      const statusValidos = ['em preparação', 'em rota de entrega', 'entregue', 'cancelado'];
      const paymentStatusValidos = ['aprovado', 'pendente', 'cancelado'];

      if (status && !statusValidos.includes(status)) {
        return res.status(400).json({ 
          error: 'Status de pedido inválido',
          statusValidos
        });
      }

      if (payment_status && !paymentStatusValidos.includes(payment_status)) {
        return res.status(400).json({ 
          error: 'Status de pagamento inválido',
          statusValidos: paymentStatusValidos
        });
      }

      client = await pool.connect();

      try {
        // Iniciar transação
        await client.query('BEGIN');

        // Buscar o pedido atual para verificação
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

        let updateQuery = 'UPDATE orders SET';
        let params = [];
        let paramCount = 1;

        if (status) {
          updateQuery += ` status = $${paramCount}`;
          params.push(status);
          paramCount++;
        }

        if (payment_status) {
          if (status) {
            updateQuery += ', ';
          }
          updateQuery += ` payment_status = $${paramCount}`;
          params.push(payment_status);
          paramCount++;
        }

        updateQuery += `, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`;
        params.push(orderId);

        const result = await client.query(updateQuery, params);

        // 🎯 Se payment_status mudou para "aprovado" E o status anterior não era "aprovado", decrementar estoque
        console.log(`🔍 Verificando: payment_status=${payment_status} && statusAnterior=${statusAnterior}`);
        
        if (payment_status === 'aprovado' && statusAnterior !== 'aprovado') {
          console.log(`🛒 ✅ CONFIRMADO! Decrementando estoque do pedido ${orderId}...`);
          
          try {
            await decrementarEstoqueDosPedido(orderId, client);
          } catch (error) {
            console.error(`❌ Erro na decrementação:`, error.message);
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Erro ao decrementar estoque', details: error.message });
          }
        } else {
          console.log(`⚠️ Condição não atendida. payment_status=${payment_status}, statusAnterior=${statusAnterior}`);
        }

        // Confirmar transação
        await client.query('COMMIT');

        console.log(`✅ Pedido ${orderId} atualizado - Status: ${status || 'não alterado'}, Pagamento: ${payment_status || 'não alterado'}`);
        res.json({
          message: 'Status atualizado com sucesso',
          order: result.rows[0],
          estoqueDecrementado: payment_status === 'aprovado' && statusAnterior !== 'aprovado'
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Erro ao atualizar pedido:', error);
      res.status(500).json({ error: 'Erro ao atualizar pedido', details: error.message });
    }
  });

  // Atualizar status do pedido (admin)
  router.patch('/:orderId/status-pedido', async (req, res) => {
    try {
      const { orderId } = req.params;
      const { novoStatus } = req.body;

      const statusValidos = ['em preparação', 'em rota de entrega', 'entregue', 'cancelado'];
      if (!statusValidos.includes(novoStatus)) {
        return res.status(400).json({ 
          error: 'Status inválido',
          statusValidos
        });
      }

      const result = await pool.query(
        'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [novoStatus, orderId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      console.log(`✅ Status do pedido ${orderId} atualizado para: ${novoStatus}`);
      res.json({
        message: 'Status do pedido atualizado com sucesso',
        pedido: result.rows[0]
      });
    } catch (error) {
      console.error('Erro ao atualizar status do pedido:', error);
      res.status(500).json({ error: 'Erro ao atualizar status do pedido' });
    }
  });

  // Atualizar status de pagamento (admin)
  router.patch('/:orderId/payment-status', async (req, res) => {
    let client;
    try {
      const { orderId } = req.params;
      const { novoStatus } = req.body;

      console.log(`📝 [PAYMENT-STATUS] Atualizando pagamento para: ${novoStatus}`);

      const statusValidos = ['aprovado', 'pendente', 'cancelado'];
      if (!statusValidos.includes(novoStatus)) {
        return res.status(400).json({ 
          error: 'Status de pagamento inválido',
          statusValidos
        });
      }

      client = await pool.connect();

      try {
        // Iniciar transação
        await client.query('BEGIN');

        // Buscar status atual do pedido
        const currentResult = await client.query(
          'SELECT payment_status FROM orders WHERE id = $1 FOR UPDATE',
          [orderId]
        );

        if (currentResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        const statusAnterior = currentResult.rows[0].payment_status;
        console.log(`📊 Status anterior: ${statusAnterior}, novo status: ${novoStatus}`);

        // Atualizar status de pagamento
        const result = await client.query(
          'UPDATE orders SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
          [novoStatus, orderId]
        );

        // 🎯 Se payment_status mudou para "aprovado" E o status anterior não era "aprovado", decrementar estoque
        console.log(`🔍 Verificando: novoStatus=${novoStatus} && statusAnterior=${statusAnterior}`);
        
        if (novoStatus === 'aprovado' && statusAnterior !== 'aprovado') {
          console.log(`🛒 ✅ CONFIRMADO! Decrementando estoque do pedido ${orderId}...`);
          
          try {
            await decrementarEstoqueDosPedido(orderId, client);
          } catch (error) {
            console.error(`❌ Erro na decrementação:`, error.message);
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Erro ao decrementar estoque', details: error.message });
          }
        } else {
          console.log(`⚠️ Condição não atendida. novoStatus=${novoStatus}, statusAnterior=${statusAnterior}`);
        }

        // Confirmar transação
        await client.query('COMMIT');

        console.log(`✅ Status de pagamento do pedido ${orderId} atualizado para: ${novoStatus}`);
        res.json({
          message: 'Status de pagamento atualizado com sucesso',
          pedido: result.rows[0],
          estoqueDecrementado: novoStatus === 'aprovado' && statusAnterior !== 'aprovado'
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Erro ao atualizar status de pagamento:', error);
      res.status(500).json({ error: 'Erro ao atualizar status de pagamento', details: error.message });
    }
  });

  return router;
};
