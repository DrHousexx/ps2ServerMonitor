# PS2 Monitor

Initial read-only monitoring API for the PS2 Server.

## Current endpoints

- GET /health
- GET /api/v1/status
- GET /api/v1/tasks
- GET /api/v1/boinc/status
- GET /api/v1/boinc/project

The API reads BOINC through `docker exec boinc-lab boinccmd ...`.

## Deploy

```bash
docker compose up -d --build
curl http://localhost:8080/api/v1/status
curl http://localhost:8080/api/v1/tasks
```

## Architecture

```text
Arduino LCD 4x16 ─┐
                  ├──> PS2 Monitor API ──> BOINC/PrimeGrid
HP Prime ─────────┘
```

The HP Prime is planned as the future PS2 Server administration console.

## Security

This first version mounts `/var/run/docker.sock`, which is highly privileged.
Keep it LAN/private for now. Before exposing the API externally or adding
administrative endpoints, replace this access path with BOINC GUI RPC and
implement authentication/authorization.

## Roadmap

1. BOINC/PrimeGrid monitoring
2. CPU/RAM/disk/IP metrics
3. Arduino LCD 4x16
4. HP Prime read-only client
5. BOINC RPC
6. Authentication/authorization
7. Docker monitoring
8. Job management
9. HP Prime administration console
