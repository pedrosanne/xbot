#!/bin/bash

# Script de Configuração Automática para VPS (Ubuntu) - X bot
# Mantém o sistema atualizado, instala Node.js 20, PM2, Nginx, Git e Certbot.

echo "========================================="
echo "   Iniciando Configuração do Servidor    "
echo "========================================="

# 1. Atualizar Pacotes do Sistema
echo "[1/5] Atualizando o sistema operacional..."
sudo apt update && sudo apt upgrade -y

# 2. Instalar Git, Curl e dependências essenciais
echo "[2/5] Instalando ferramentas auxiliares..."
sudo apt install -y curl git build-essential

# 3. Instalar Node.js v20 (LTS)
echo "[3/5] Instalando Node.js v20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalações
echo "Versão do Node.js: $(node -v)"
echo "Versão do NPM: $(npm -v)"

# 4. Instalar PM2 globalmente (Gerenciador de Processos Node)
echo "[4/5] Instalando o PM2..."
sudo npm install -g pm2

# 5. Instalar Nginx e Certbot (Servidor Web e SSL)
echo "[5/5] Instalando Nginx e Certbot (SSL)..."
sudo apt install -y nginx certbot python3-certbot-nginx

# Habilitar Nginx na inicialização
sudo systemctl enable nginx
sudo systemctl start nginx

echo "========================================="
echo "   Configuração concluída com sucesso!   "
echo "========================================="
echo "Próximos passos:"
echo "1. Configure o DNS A do seu domínio na Hostinger para o IP desta VPS."
echo "2. Clone seu repositório Git: git clone <URL>"
echo "3. Crie o arquivo .env e rode o npm install"
echo "========================================="
