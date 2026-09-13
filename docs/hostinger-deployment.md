# Hostinger deployment prerequisites

Removal Work must not be deployed with a root password shared in chat.

## Required before deployment

1. Rotate the exposed root password in Hostinger.
2. Create a non-root `deploy` user with sudo access.
3. Install a newly generated client public key in `/home/deploy/.ssh/authorized_keys`.
4. Provide the matching private key through an approved secure deployment channel, never chat.
5. Point a domain to the server and enable HTTPS. Google Business Profile OAuth will not use a bare production IP callback.
6. Supply production runtime secrets directly on the server. Do not commit them to this repository.

## Runtime requirements

- Bun-compatible Linux runtime
- Reverse proxy with TLS
- A supervised application process
- Health checks and restart policy
- Firewall allowing only SSH, HTTP, and HTTPS

The current production database remains authoritative until a separate, backed-up migration is verified. Deployment must not copy or overwrite production records blindly.