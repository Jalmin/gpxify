#!/bin/bash
# Script pour vérifier l'état des containers et les logs

echo "=== État des containers ==="
docker ps -a | grep -E "gpxify|frontend|backend|db-uckss8s4w4wcwckkos8ooko8"

echo ""
echo "=== Logs Backend (50 dernières lignes) ==="
docker logs $(docker ps -q -f name=backend) --tail 50 2>&1 || echo "Backend container not found"

echo ""
echo "=== Logs Frontend (30 dernières lignes) ==="
docker logs $(docker ps -q -f name=frontend) --tail 30 2>&1 || echo "Frontend container not found"

echo ""
echo "=== Logs DB (20 dernières lignes) ==="
docker logs $(docker ps -q -f name=db) --tail 20 2>&1 || echo "DB container not found"

echo ""
echo "=== Vérifier les labels Caddy du backend ==="
docker inspect $(docker ps -q -f name=backend) 2>/dev/null | grep -A 10 '"Labels"' | head -20 || echo "Cannot inspect backend"

echo ""
echo "=== Vérifier les labels Caddy du frontend ==="
docker inspect $(docker ps -q -f name=frontend) 2>/dev/null | grep -A 10 '"Labels"' | head -20 || echo "Cannot inspect frontend"
