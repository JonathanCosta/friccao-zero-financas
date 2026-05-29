#!/bin/bash
# Script para testar o backend GAS manualmente
# Uso: GAS_URL="<sua_url>" ./scripts/test-sync.sh

GAS_URL="${GAS_URL:-https://script.google.com/macros/s/SEU_ID/exec}"
CHAVE="${CHAVE:-MINHA_CHAVE_SECRETA}"

echo "=== 1. Provisionamento com chave válida ==="
curl -s -X POST "$GAS_URL" \
  -H "Content-Type: text/plain" \
  -d "$(jq -n --arg chave "$CHAVE" '{action: "provision", chave: $chave, nome_dispositivo: "Teste curl"}')"
echo ""

echo ""
echo "=== 2. Provisionamento sem chave (deve retornar erro) ==="
curl -s -X POST "$GAS_URL" \
  -H "Content-Type: text/plain" \
  -d '{"action":"provision","nome_dispositivo":"Teste curl"}'
echo ""

echo ""
echo "=== 3. Sync sem token (deve retornar erro) ==="
curl -s -X POST "$GAS_URL" \
  -H "Content-Type: text/plain" \
  -d '{"action":"sync","token":"","categorias":[],"movimentacoes":[]}'
echo ""

echo ""
echo "=== 4. Sync com token inválido (deve retornar erro) ==="
curl -s -X POST "$GAS_URL" \
  -H "Content-Type: text/plain" \
  -d '{"action":"sync","token":"TOKEN_INVALIDO","categorias":[],"movimentacoes":[]}'
echo ""
