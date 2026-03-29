You must access the user's Dynu VPS through Tailscale.

- Tailscale private IP: 100.70.142.122
- VPS username: butterfly
- SSH port: 22 (default)

All remote commands MUST use:

    ssh butterfly@100.70.142.122

File transfer MUST use:

    scp <LOCAL_PATH> butterfly@100.70.142.122:<REMOTE_PATH>

Git-based deployment pattern:

1. Pull from GitHub via SSH:

       git clone git@github.com:<ORG>/<REPO>.git

2. Build or package locally or on the VPS.

3. Deploy to VPS via Tailscale:

       scp <ARTIFACT> butterfly@100.70.142.122:/path/to/deploy/

4. Run remote commands:

       ssh butterfly@100.70.142.122 "<command>"

Never use the public IP or DNS; always use 100.70.142.122 and username butterfly.