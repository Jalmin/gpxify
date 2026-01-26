# Scripts Utilitaires

Scripts de developpement et debug pour GPXIFY.

## Liste des Scripts

| Script | Usage |
|--------|-------|
| `test-upload.sh` | Test manuel d'upload GPX vers l'API |
| `debug-server.sh` | Debug du serveur backend |
| `check-logs.sh` | Consultation des logs Docker |
| `check-containers.sh` | Verification des conteneurs Docker |

## Utilisation

```bash
# Rendre executable
chmod +x scripts/*.sh

# Executer
./scripts/test-upload.sh
```

## Notes

Ces scripts sont pour le developpement local uniquement.
Non utilises en CI/CD.
