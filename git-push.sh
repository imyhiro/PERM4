#!/bin/bash

# Script para hacer commit y push rápido a GitHub
# Uso: ./git-push.sh "mensaje del commit"

if [ -z "$1" ]; then
  echo "❌ Error: Debes proporcionar un mensaje de commit"
  echo "Uso: ./git-push.sh \"tu mensaje aquí\""
  exit 1
fi

echo "📝 Agregando cambios..."
git add .

echo "💾 Creando commit..."
git commit -m "$1"

echo "🚀 Subiendo a GitHub..."
git push

echo "✅ ¡Cambios subidos exitosamente!"
