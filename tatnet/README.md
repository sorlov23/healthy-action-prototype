# Rinlo — TatNet / РФ ingress (staged only)

## Purpose

Build a **Russian-hosted, same-origin** entrypoint for Rinlo 2.0. This is not a
production cutover. It does not transfer or delete Supabase/Neon data.

The target is the branch `rinlo-tatnet-access`, layered on top of
`rinlo-neon-migration` (PR #26). Do not deploy the default `main` branch:
that is a different application.

## What works without any backend credentials

- Node 24 static server serves all Rinlo 2.0 HTML, CSS, JS, icon files.
- `GET /healthz`: readiness.
- `GET /api/status`: which parts of the backend were configured.
- Home uses local-first mode; saved decisions remain on this device.
- `GET /runtime-config.js` is dynamically generated and **disables dead Supabase**
  integration. The old stopped Supabase project is never called from this host.
- An honest Home note explains that AI and cloud sync are not connected.
- AI routes return explicit `503`, not invented recipes.

## Optional Neon Auth / Data API test proxy

The following are **server-side only** TatNet environment variables:

| Variable | Value |
| --- | --- |
| `RINLO_PUBLIC_ORIGIN` | Actual TatNet HTTPS origin, e.g. `https://<assigned-name>.tatnet.app` |
| `RINLO_NEON_AUTH_BASE_URL` | `https://ep-dark-meadow-baxrhac6.neonauth.c-8.eu-central-1.aws.neon.tech/rinlo/auth` (QA branch) |
| `RINLO_NEON_DATA_API_URL` | `https://ep-dark-meadow-baxrhac6.apirest.c-8.eu-central-1.aws.neon.tech/rinlo/rest/v1` (QA branch) |
| `PORT` | `8080` (optional; TatNet may inject it) |

`RINLO_PUBLIC_ORIGIN` must match the actual assigned TatNet domain exactly.
**Do not guess the future hostname or reuse a production Neon Auth URL.**
After the TatNet app exists, add this domain to the `rinlo-auth-qa` Neon Auth
branch's trusted origins. Do not add a wildcard `*.tatnet.app`.

All client calls use `/api/neon/auth/*` or `/api/neon/data/<table>` on the
same TatNet host. The proxy accepts only fixed Neon upstream domains,
requires a same-origin Origin header for writes, strips upstream cookie domains,
rewrites cookie paths, and requires Bearer JWT for Data API.

**This is a QA transport, not a verified production auth migration.**
Existing Supabase Auth sessions cannot automatically become Neon Auth sessions.
Rinlo's main cloud sync remains disabled. Test password/email/Session
restoration on a real iPhone separately; test owner A/B RLS in QA before rollout.

## AI (deliberate blocker)

- No Gemini or TatNet AI secret is embedded in the site.
- There is no unauthenticated public AI endpoint yet.
- To enable generation, implement a TatNet-hosted server AI handler with
  provider credentials held only in TatNet secret env, per-user abuse protection,
  strict output validation, and an integration test for text/photo/voice/Cook.
- TatNet model API is OpenAI-compatible, **not a drop-in** Gemini Edge
  Function response format. Don't swap the URL without adapting parsing.
- The current Neon AI Gateway is not usable on the Neon Free plan.
- Do not show AI-enabled product as complete until this is implemented.

## Deployment

TatNet supports GitHub app source and Dockerfile builds. **TatNet is not
connected to this ChatGPT session yet**, so no app is created and no TatNet URL
is verified.

1. Connect the official TatNet MCP server with write scope:
   `https://mcp.tatnet.cloud/mcp` (OAuth authorization required).
2. Create a **new**, isolated TatNet app from
   `sorlov23/healthy-action-prototype`, branch `rinlo-tatnet-access`.
3. Choose Dockerfile at repository root and the appropriate TatNet backend plan.
   Configure readiness `/healthz`. Use 0 replicas for scale-to-zero testing
   if permitted and cost-sensitive.
4. Capture the actual `*.tatnet.app` hostname; set `RINLO_PUBLIC_ORIGIN`
   using that exact HTTPS origin.
5. Optionally set the QA Neon proxy upstreams and register the domain with
   Neon Auth. Do not connect production users to the QA branch.
6. Deploy and verify `/healthz`, `/rinlo2/`, `/api/status`, then the
   actual page on an iPhone in Russia **without VPN**.
7. From TatNet server verify upstream access to Neon. Only then proceed with
   live Auth/RLS/Gemini tests.

Documentation:
- https://docs.tatnet.ru/docs/platform/apps
- https://docs.tatnet.ru/docs/mcp
- https://docs.tatnet.ru/docs/platform/inference

## Development verification

```bash
node --test tatnet/tests/*.test.mjs
docker build -t rinlo-tatnet-access .
docker run --rm -p 8080:8080 rinlo-tatnet-access
curl http://127.0.0.1:8080/healthz
```

Do not claim that TatNet is reachable from Russia before testing it from
a Russian ISP. The GitHub CI runner tests only container build/start and API
contract, not the Russian network path.
