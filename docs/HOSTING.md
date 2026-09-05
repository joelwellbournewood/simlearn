# Hosting

## Where the site lives

| Thing | Value |
|---|---|
| Repo | `joelwellbournewood/simlearn`, branch `main` |
| Host | GitHub Pages, serving `main` at the repo root |
| Live URL | https://simlearn.ai |
| Fallback URL | https://joelwellbournewood.github.io/simlearn/ |
| Custom domain | Set by the `CNAME` file at the repo root, which contains `simlearn.ai` |
| Registrar | Namecheap |
| TLS | GitHub issues and renews a Let's Encrypt certificate automatically once the DNS check passes. "Enforce HTTPS" is on. |

There is no build step, no CI, no server. Every file in the repo is served as-is.
Push to `main` and GitHub Pages redeploys within roughly a minute.

## DNS records at Namecheap

Domain List -> simlearn.ai -> Manage -> Advanced DNS:

| Type | Host | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | joelwellbournewood.github.io. |

Those four IPs are GitHub's published Pages addresses. If GitHub ever changes
them the site goes down until the records are updated, so check
https://docs.github.com/pages before assuming a fault is ours.

## Deploying

```
git add -A && git commit -m "..." && git push origin main
```

Authentication is a fine-grained personal access token scoped to this repo only,
Contents read and write, embedded in the remote URL of the sandbox working copy at
`/root/simlearn-pending`. Tokens have expired twice, most recently in run 20. The
symptom is a 401 on push. The fix is a new token from
https://github.com/settings/personal-access-tokens/new, which is a human step.

## Verifying a deploy

```
curl -s https://simlearn.ai/sims/<id>/index.html | grep -c "What am I looking at?"
```

Expect 1. Anything else means the push did not land or the sim is not to standard.

## Things that are NOT set up

- No analytics of any kind.
- No error reporting. A JS exception in a sim is invisible unless someone opens the
  console, which is why `tools/qa.py` checks every sim for zero page errors.
- No staging environment. `main` is production. Test locally first:
  `cd /root/simlearn-pending && python3 -m http.server 8899`.
