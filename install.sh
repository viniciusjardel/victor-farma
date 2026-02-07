#!/bin/bash

# Script de instalação rápida - Victor Farma

echo "🏥 Victor Farma - Instalação"
echo "================================"

# Backend
echo ""
echo "📦 Instalando Backend..."
cd backend
npm install
echo "✅ Backend instalado"

# Voltar ao root
cd ..

echo ""
echo "================================"
echo "✅ Instalação completa!"
echo ""
echo "Próximos passos:"
echo ""
echo "1. Configure o banco de dados PostgreSQL no Render"
echo "2. Copie a connection string para backend/.env"
echo "3. Execute o SQL do arquivo backend/db/init.sql"
echo ""
echo "Para iniciar:"
echo "  cd backend && npm run dev"
echo ""
echo "Depois abra no navegador:"
echo "  frontend/index.html   (Site do cliente)"
echo "  admin/index.html      (Painel Admin)"
echo ""
