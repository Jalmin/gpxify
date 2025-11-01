#!/bin/bash
# Vérifier les logs du container frontend

echo "=== Logs du container frontend ==="
docker logs $(docker ps -q -f name=frontend) --tail 50

echo ""
echo "=== Vérifier si nginx écoute sur le port 80 ==="
docker exec $(docker ps -q -f name=frontend) netstat -tlnp 2>/dev/null || docker exec $(docker ps -q -f name=frontend) ss -tlnp 2>/dev/null || echo "netstat/ss not available"

echo ""
echo "=== Vérifier les processus dans le container ==="
docker exec $(docker ps -q -f name=frontend) ps aux
