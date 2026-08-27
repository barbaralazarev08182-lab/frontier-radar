# Security Policy

## Reporting a vulnerability

Please do not open a public issue for a suspected security vulnerability, exposed credential, authorization bypass, or data-access problem.

Prefer a **private GitHub Security Advisory** for this repository when that option is available. Include:

- the affected route, file, or component;
- a concise description of the impact;
- reproduction steps or a minimal proof of concept;
- whether the issue appears to affect production data or credentials.

If private security advisories are not available, contact the repository owner privately rather than publishing exploit details in an issue or pull request.

## Credential handling

Frontier Radar uses environment variables for external services and privileged backend access.

Rules for contributors:

- never commit `.env`, `.env.local`, `.env.*.local`, service-role credentials, API keys, cron secrets, access tokens, or private keys;
- use `.env.example` only as a list of variable names and safe defaults;
- keep privileged credentials server-side;
- never log authentication headers or secret values;
- if a credential is accidentally committed, treat it as compromised and rotate/revoke it immediately rather than relying only on deleting the file in a later commit.

## Runtime boundaries

Security-sensitive changes should preserve these principles:

- preview/development environments must not persist production runtime writes;
- privileged database access remains server-side;
- public reads should not require exposing service-role credentials;
- scheduled/cron routes require explicit server-side authorization;
- source data and generated AI analysis remain distinguishable and traceable.

## Supported version

Security fixes are applied to the current `main` branch. Historical checkpoints and old feature branches are not maintained as supported releases.
