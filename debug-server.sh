#!/bin/bash
# Script de diagnostic pour le serveur Hetzner

echo "=== 1. Liste des containers ==="
docker ps

echo ""
echo "=== 2. Test nginx dans le container ==="
docker exec $(docker ps -q -f name=frontend) wget -qO- http://localhost/ 2>&1 | head -20

echo ""
echo "=== 3. Labels Traefik du container ==="
docker inspect $(docker ps -q -f name=frontend) | grep -A 30 '"Labels"'

echo ""
echo "=== 4. Réseaux du container ==="
docker inspect $(docker ps -q -f name=frontend) | grep -A 10 '"Networks"'

echo ""
echo "=== 5. Test curl direct sur le container ==="
CONTAINER_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $(docker ps -q -f name=frontend))
echo "IP du container: $CONTAINER_IP"
curl -s http://$CONTAINER_IP/ | head -20
