#!/bin/bash
set -e
echo '=== Clave Inmobiliaria Deploy ==='
cd ~/proyectos/clave-inmobiliaria

# 1. Pull y rebuild
docker compose build --no-cache
docker compose up -d

# 2. Esperar DB
echo 'Esperando DB...'
sleep 10

# 3. Seed si no hay datos
COUNT=0
if [ $COUNT -eq 0 ]; then
    echo 'Insertando seed data...'
    curl -s -X POST http://localhost:3050/api/scraper/seed
fi

# 4. Status
echo ''
echo '=== Estado final ==='
docker compose ps
curl -s http://localhost:3050/api/scraper/status | python3 -m json.tool
echo ''
echo 'WEB:    http://192.168.1.22:3080'
echo 'ENGINE: http://192.168.1.22:3050/docs'
