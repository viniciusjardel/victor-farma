#!/bin/bash
set -e

echo "🚀 Executando migrations do banco de dados..."
psql $DATABASE_URL < db/init.sql 2>/dev/null || echo "⚠️ Banco de dados já existe"

echo "✅ Iniciando servidor Node.js..."
node server.js
