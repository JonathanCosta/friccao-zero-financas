#!/bin/bash
# Inicia ambiente de desenvolvimento com mock GAS server
# Uso: ./scripts/start-dev.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Iniciando Mock GAS Server na porta 3100..."
node "$SCRIPT_DIR/mock-gas.js" &
MOCK_PID=$!

# Mata o mock server quando o script for interrompido
trap "kill $MOCK_PID 2>/dev/null; exit" SIGINT SIGTERM EXIT

sleep 1

echo "Iniciando Vite dev server..."
echo ""
IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo "╔════════════════════════════════════════════════════════╗"
echo "║  AMBIENTE DE DESENVOLVIMENTO                         ║"
echo "║                                                      ║"
echo "║  Local:    http://localhost:5173                     ║"
echo "║  Rede:     http://${IP}:5173                         ║"
echo "║  Mock GAS: redirecionado via proxy do Vite           ║"
echo "║                                                      ║"
echo "║  O modo DEV está ATIVO:                              ║"
echo "║  - Qualquer chave de instalação é aceita             ║"
echo "║  - Sync envia dados para o mock GAS (proxy)          ║"
echo "║  - Dados do mock salvos em mock-gas-data.json        ║"
echo "║                                                      ║"
echo "║  Acesse do celular pelo IP da Rede ↑                 ║"
echo "║                                                      ║"
echo "║  Pressione Ctrl+C para parar tudo                    ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

cd "$PROJECT_DIR/frontend" && npx vite --port 5173
