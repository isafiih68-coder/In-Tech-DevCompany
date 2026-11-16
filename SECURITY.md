# Security Policy

## Reporting a Vulnerability

Please do not disclose suspected security vulnerabilities in public issues.

Use the repository's private vulnerability reporting feature when available. Otherwise, contact the project maintainer through an official private contact channel.

Include a clear description of the issue and safe reproduction steps where possible.

Never include real credentials, secret keys, private databases, or personal information in a security report.

## Security Practices

In.Tech uses:

- Environment variables for administrator credentials
- Werkzeug password hashing
- Session-based authentication
- CSRF protection
- HTTP-only session cookies
- SameSite session cookie configuration
- Installation-specific secret keys and SQLite databases

## Installation Recommendations

- Use a unique administrator password of at least 12 characters.
- Keep `.env` and `instance/` private.
- Never publish secret keys, databases, or private backups.
- Use HTTPS for network deployments.
- Set `DEVCOMPANY_COOKIE_SECURE=1` when using HTTPS.
- Use a production WSGI server for deployment.
- Keep dependencies updated and review security advisories.
