const fs = require('fs');
const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://victor_farma_db_user:TUlZhTUI9VpXUfERQ0smcMzWcF3ZuONM@dpg-d63s4q0gjchc739a91o0-a/victor_farma_db';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDatabase() {
  try {
    console.log('📂 Lendo arquivo init.sql...');
    const sql = fs.readFileSync('./backend/db/init.sql', 'utf8');
    
    console.log('🔗 Conectando ao banco de dados...');
    const client = await pool.connect();
    
    console.log('📝 Executando SQL...');
    await client.query(sql);
    
    client.release();
    console.log('✅ Banco de dados inicializado com sucesso!');
    console.log('📊 Tabelas criadas: users, products, cart_items, orders, order_items');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error.message);
    process.exit(1);
  }
}

initDatabase();
