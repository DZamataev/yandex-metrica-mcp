# yandex-metrica-mcp

[![CI](https://github.com/DZamataev/yandex-metrica-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/DZamataev/yandex-metrica-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

> **This is a personal fork** of
> [BoxLab-Ltd/yandex-metrica-mcp](https://github.com/BoxLab-Ltd/yandex-metrica-mcp).
> It installs from **this fork's** Git repo (and its forked
> [`yandex-mcp-core`](https://github.com/DZamataev/yandex-mcp-core)), not from
> the upstream npm packages, so no upstream release can change what runs on your
> machine without you pulling it. Nothing here is published to npm or the MCP
> registry.

**Ask your Yandex Metrica analytics in plain language — from Claude, Cursor, or
any MCP client.**

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for
**Yandex Metrica**. It lets an AI agent query your web-analytics data — traffic,
sources, landing pages, conversions, geography, devices and trends — through a
small set of flexible, read-only tools.

This fork also covers **[AppMetrica](#appmetrica-mobile-apps)** (Yandex's mobile
app analytics — a separate product with its own API and OAuth scope).

> Read-only by design, no secrets stored in the package: interactive login uses
> a built-in public OAuth client with PKCE, and the server talks only to Yandex.

> Status: early development (v0.1, work in progress). General-purpose: SEO is
> one of many use cases, not the focus.

## Demo

Point an AI agent at your counter and ask about your traffic — the server queries
Yandex Metrica and hands back real, read-only data, no dashboards. Here the
`run_report` tool answers a “traffic sources, last 7 days” question against a live
counter:

![yandex-metrica-mcp querying live Yandex Metrica traffic sources, read-only](docs/demo.gif)

## Quickstart

**1. Add the server to your MCP client** (e.g. Claude Desktop) — no token
required up front; you log in interactively in step 2:

```json
{
    "mcpServers": {
        "yandex-metrica": {
            "command": "npx",
            "args": ["-y", "github:DZamataev/yandex-metrica-mcp"],
            "env": { "YANDEX_METRIKA_COUNTER_ID": "12345678" }
        }
    }
}
```

`npx` clones this fork, builds it (a `prepare` script runs `tsc`), and runs the
result — so the first start takes a few seconds. Pin a specific commit or tag by
appending it, e.g. `github:DZamataev/yandex-metrica-mcp#v0.3.0`.

**2. Log in once — one command, no app registration, no secret stored:**

```bash
npx -y github:DZamataev/yandex-metrica-mcp auth
```

Approve access in the browser and you're done — the code is handed back
automatically over a local redirect, no copy-paste. The login uses
authorization-code + PKCE, so **no client secret ever touches your machine**; the
token is cached (mode 0600) and valid for ~1 year.

**3. Ask your agent** about traffic, sources, conversions, geography, devices, or
trends — see [Examples](#examples) for prompts.

Prefer a static token (CI / non-interactive) or your own OAuth app? See
[Authentication](#authentication).

### Or install as a Claude Code plugin

The repo doubles as a plugin marketplace, so you can install the server through
Claude Code's plugin system instead of the config above:

```bash
/plugin marketplace add DZamataev/yandex-metrica-mcp
/plugin install yandex-metrica-mcp@dzamataev
```

Then run `npx -y github:DZamataev/yandex-metrica-mcp auth` once to log in.

### Or install as a Claude Desktop extension (.mcpb)

For a one-click install with no JSON, download the `.mcpb` from the
[latest release of this fork](https://github.com/DZamataev/yandex-metrica-mcp/releases/latest)
and open it with Claude Desktop (or drag it into Settings → Extensions). It asks
for an optional default counter id; then sign in from the chat with the `login`
tool (or run `npx -y github:DZamataev/yandex-metrica-mcp auth`).

### Or connect it to Hermes

Add an entry under `mcp_servers:` in `~/.hermes/config.yaml`:

```yaml
mcp_servers:
    yandex-metrica:
        command: npx
        args:
            - '-y'
            - 'github:DZamataev/yandex-metrica-mcp'
        env:
            YANDEX_METRIKA_COUNTER_ID: '12345678' # optional
```

Then restart Hermes and sign in once — either run
`npx -y github:DZamataev/yandex-metrica-mcp auth` in a terminal, or just ask the
agent to run the `login` tool.

**Recommended: a fixed local checkout.** The `npx` form re-resolves the Git ref
on every start, so a fresh push changes what runs without you doing anything —
which defeats half the point of running from a fork. Clone it, build it, and
point Hermes at the built entry point:

```bash
git clone git@github.com:DZamataev/yandex-metrica-mcp.git
cd yandex-metrica-mcp && bun install && bun run build
```

```yaml
mcp_servers:
    yandex-metrica:
        command: /Users/you/.hermes/node/bin/node
        args:
            - '/absolute/path/to/yandex-metrica-mcp/dist/index.js'
```

Use an absolute path to `node` (Hermes ships its own at
`~/.hermes/node/bin/node`) — a GUI-launched client does not always inherit your
shell `PATH`.

Hermes refuses agent writes to `config.yaml`, so edit it yourself or use the
CLI:

```bash
hermes config set mcp_servers.yandex-metrica.command ~/.hermes/node/bin/node
hermes config set mcp_servers.yandex-metrica.args '["/absolute/path/to/yandex-metrica-mcp/dist/index.js"]'
```

Working on the server itself? The entry above runs the **built** output, so the
edit loop is:

```bash
bun run build   # then restart Hermes to reload the server
```

To smoke-test a change without restarting anything, drive it over stdio
directly — this prints the tool list:

```bash
printf '%s\n%s\n%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"probe","version":"1"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | node dist/index.js 2>/dev/null | tail -1
```

### Or connect it to Claude Code

Claude Code has its own CLI for this:

```bash
claude mcp add yandex-metrica -- npx -y github:DZamataev/yandex-metrica-mcp
```

## Why

There is no official Yandex Metrica MCP server, and existing community ones are
mostly thin, unmaintained, or dump raw data straight into the model's context.
This server aims to be the well-engineered, well-maintained, open option:
flexible report tools, strict token/context discipline, read-only by default.

## Features (v0.1)

- `run_report` — flexible wrapper over the Reporting API (`/stat/v1/data`).
- `run_comparison` — compare two periods with absolute and percentage deltas.
- `run_drilldown` — drill down through a dimension tree.
- `run_timeseries` — metrics split into a time series (`/bytime`) for trends.
- `get_metadata` — discover the counters on your account and a catalog of common
  dimensions/metrics (and Logs API fields) so the model queries with real names.
- `describe_counter` — read one counter's configuration (goals, segments,
  filters, operations, access grants) via an `include` selector. The goals
  section gives the goal ids needed for conversion metrics in `run_report`.
- `logs_request` / `logs_status` / `logs_download` / `logs_clean` — Logs API:
  export raw, un-sampled session (`visits`) or hit (`hits`) rows. Async lifecycle
  (request → poll → download → clean); `logs_download` returns a bounded sample
  inline by default, or streams the full export to a file — never dumping raw
  rows into the model's context.
- `appmetrica_list_apps` / `appmetrica_get_metadata` / `appmetrica_describe_app`
  / `appmetrica_run_report` / `appmetrica_run_timeseries` /
  `appmetrica_run_drilldown` — **AppMetrica** (mobile app analytics). See
  [AppMetrica](#appmetrica-mobile-apps) — it needs your own OAuth app.
- `login` / `submit_code` — sign in to Yandex Metrica from your MCP client, no
  terminal needed: `login` opens the browser and captures the code over a local
  redirect, or hands back a URL and takes the pasted code via `submit_code`.
- Built-in context control: field selection on by default, low default row
  limits, and sampling/quota surfaced back to the model.

Planned for later: Streamable HTTP transport, write tools (behind an explicit
flag).

## Requirements

- Node.js >= 18
- Yandex Metrica credentials with the `metrika:read` scope (see
  **Authentication**). Whoever the credentials belong to must have access to the
  counters you query.

## Authentication

**Recommended: interactive login.** No app registration needed — the server
ships a built-in public OAuth client. Run once:

```bash
npx -y github:DZamataev/yandex-metrica-mcp auth   # or, in a clone: bun run auth
```

It opens the Yandex consent page in your browser; after you approve, the code is
returned automatically over a loopback redirect (`http://127.0.0.1:53682`) — no
copy-paste. If that port is taken, it falls back to showing a code you paste in
(force that flow with `auth --oob`, or change the port with
`YANDEX_OAUTH_LOOPBACK_PORT`). The token is cached at
`~/.config/yandex-metrica-mcp/token.json` (mode 0600) and is valid for ~1 year;
re-run `auth` when it expires. The login uses authorization-code + PKCE, so **no
client secret is stored anywhere**. A cached login takes precedence over
`YANDEX_METRIKA_TOKEN`.

**From your MCP client (no terminal).** Not signed in yet? The server still
starts — ask your agent to run the `login` tool and it does the same browser
flow in-process (or returns a URL and takes the code via `submit_code`). Handy
for GUI clients like Claude Desktop, where there is no terminal to run `auth`. Get a token for an app with the `metrika:read`
scope at <https://oauth.yandex.ru> and pass it as `YANDEX_METRIKA_TOKEN` — handy
for CI or non-interactive use.

**Own OAuth app (optional).** To use your own app instead of the built-in one,
set `YANDEX_OAUTH_CLIENT_ID`; add `YANDEX_OAUTH_CLIENT_SECRET` to also enable
automatic token refresh.

## What leaves your machine

Audited on this fork; worth knowing before you point an agent at production
analytics:

- **Network egress is Yandex-only.** The server talks to
  `api-metrika.yandex.net`, `api.appmetrica.yandex.ru` (only when an
  `appmetrica_*` tool is called) and `oauth.yandex.com`. All are overridable via
  `YANDEX_METRIKA_BASE_URL` / `YANDEX_APPMETRICA_BASE_URL` /
  `YANDEX_OAUTH_BASE_URL` — there is no telemetry, analytics, or
  error-reporting endpoint of any kind.
- **AppMetrica credentials are stripped.** Its apps endpoint returns
  `api_key128` and `import_token` (write credentials for the app); this server
  removes them before the response reaches the model.
- **Tokens stay local.** The OAuth token is written to
  `~/.config/yandex-metrica-mcp/token.json` with mode `0600` in a `0700`
  directory, and is sent only as an `Authorization` header to the Yandex API. It
  is never logged or included in tool output. Sign-in uses authorization-code +
  PKCE, so no client secret exists to leak.
- **The real exposure is your agent's context, not the network.** Every tool is
  read-only, but the data they return — and especially the Logs API (`ym:s:*`
  / `ym:pv:*` raw rows) — can contain visitor IPs, `ClientID`s, referrers and
  full URLs. Whatever a tool returns goes to your LLM provider. `logs_download`
  defaults to a bounded inline sample and flags personal fields in its output;
  use `mode: "file"` to stream the full export to disk so raw rows never enter
  the model's context, and run `logs_clean` afterwards.
- **`logs_download` writes files.** With `mode: "file"` it writes to
  `YANDEX_METRIKA_LOGS_DIR` (default: a folder under the OS temp dir), or to an
  `outputPath` the agent chooses — an agent-controlled path on your filesystem.
  Set `YANDEX_METRIKA_LOGS_DIR` if you want those exports somewhere predictable.
- **Least privilege.** The requested scope is `metrika:read` only. The built-in
  OAuth client is a public client shared by all users of the upstream project;
  set `YANDEX_OAUTH_CLIENT_ID` to your own registered app if you would rather
  the consent screen and app identity be yours.

## AppMetrica (mobile apps)

**AppMetrica is a separate Yandex product from Yandex Metrica.** Metrica reports
on websites (`counterId`, `ym:s:`/`ym:pv:` fields); AppMetrica reports on mobile
apps (`appId`, `ym:ge:`/`ym:ce:` fields) on a different API host. A Yandex
account can own apps in one and no counters in the other — if `get_metadata`
returns zero counters but you can see data at `appmetrica.yandex.com`, this
section is what you want.

The `appmetrica_*` tools cover the app list, app settings, table reports, time
series and drilldowns.

### It requires your own OAuth app

AppMetrica needs the `appmetrica:read` scope. The built-in client shipped with
this server is registered for Metrica only and **cannot** grant it, so you must
register your own Yandex OAuth app once. Without this, every `appmetrica_*` call
fails with `403 access_denied`.

1. Open <https://oauth.yandex.com/client/new> and create an app.
2. Under **Data access**, add both `appmetrica:read` and `metrika:read` (start
   typing the name to find them).
3. Platform: **Web services**. Set the Redirect URI to
   `https://oauth.yandex.com/verification_code`, and — to keep the automatic
   loopback sign-in — also add `http://127.0.0.1:53682/callback`.
4. Copy the **ClientID** (and the secret, if you want automatic token refresh).
5. Point the server at it and sign in again:

```bash
export YANDEX_OAUTH_CLIENT_ID=<your client id>
export YANDEX_OAUTH_CLIENT_SECRET=<your client secret>   # optional
rm -f ~/.config/yandex-metrica-mcp/token.json            # drop the old scope
bun run auth
```

In an MCP client, put those variables in the server's `env` block instead, then
re-run the `login` tool.

### Notes

- **Namespaces don't mix.** One request must use a single prefix — `ym:ge:`
  (general events), `ym:ce:` (custom events), `ym:i:` (installs), `ym:c:`
  (clicks), `ym:s:` (sessions). Only `filters` may reference another prefix.
- **No metadata API.** AppMetrica publishes no endpoint listing valid ids, so
  `appmetrica_get_metadata` returns a curated subset, not the full set. Unknown
  ids fail with 4001 (dimension) or 4002 (metric). For anything outside the
  catalog, open the report in the AppMetrica UI and use
  **Export → Copy table API request** to get exact ids.
- **Crashes live in `ym:cr:`.** Top crashes = `ym:cr:crashes` grouped by
  `ym:cr:crashGroupName` (exception class + source location). Platform filter
  values are lowercase — `ym:cr:operatingSystemInfo=='android'` — even though
  the dimension renders `Android`. There is no crash-free-rate metric; derive
  it from `ym:cr:users ÷ ym:ge:users`. Every crash id in the catalog was
  verified against the live API; see [`docs/API-NOTES.md`](./docs/API-NOTES.md)
  for the ids that look plausible but are rejected.
- **API keys are never returned.** The apps endpoint also carries `api_key128`
  and `import_token` — credentials for writing data into the app. They are
  stripped before anything reaches the model.

## Configuration

The [Quickstart](#quickstart) covers the happy path. For all options — static
token, your own OAuth app, default counter, request tuning, language — see
[`.env.example`](./.env.example). The published package runs on Node (so
`npx`/MCP clients work out of the box); local development uses
[Bun](https://bun.sh).

## Examples

Once connected, an agent can answer questions like:

- “How many visits and users did counter 12345678 get last week, split by traffic
  source?” → `run_report` with `metrics: ["ym:s:visits","ym:s:users"]`,
  `dimensions: ["ym:s:lastsignTrafficSource"]`.
- “Compare this week's organic conversions to last week's.” → `run_comparison`
  (server returns A, B, and the deltas).
- “Which operating systems do my visitors use? Let me drill into Windows
  versions.” → `run_drilldown`, then again with `parentId`.
- “What counters do I have?” → `get_metadata`.
- “List this counter's goals, then show how the ‘Purchase’ goal converted last
  week.” → `describe_counter` (`include: ["goals"]`) for the goal id, then
  `run_report` with `ym:s:goal<id>conversionRate`.
- “Export last month's raw sessions with landing pages and referrers for offline
  analysis.” → `logs_request` (`source: "visits"`), poll `logs_status`, then
  `logs_download` (`mode: "file"`), then `logs_clean` to free the quota.

## Development

This project is Bun-first:

```bash
bun install
bun run dev        # run from source with hot reload
bun run typecheck  # tsc --noEmit
bun run lint       # eslint
bun test           # bun's test runner
bun run build      # emit dist/ with tsc (Node-compatible)
bun run secrets    # gitleaks: scan the full git history for secrets
```

`bun run secrets` needs [gitleaks](https://github.com/gitleaks/gitleaks)
(`brew install gitleaks`). CI runs the same scan on every push and PR, over the
full history — a secret deleted in a later commit is still in the pack, so
depth matters. Rules live in [`.gitleaks.toml`](./.gitleaks.toml): the upstream
default set plus two Yandex-token rules, and a narrow allowlist for the one
documented false positive (the embedded **public** OAuth client id, which ships
by design and has no secret). The allowlist pins that exact value rather than
disabling the rule, so any other key-shaped constant still fails the build.

### Fork layout

The shared auth/HTTP layer lives in a separate package, and this fork consumes
the **forked** copy of it straight from Git:

```json
"@boxlab/yandex-mcp-core": "github:DZamataev/yandex-mcp-core#main"
```

That package builds itself on install via a `prepare` script, which Bun runs
only because it is listed in `trustedDependencies`. To pin it, replace `#main`
with a commit SHA and re-run `bun install`.

### Syncing with upstream

```bash
git remote add upstream https://github.com/BoxLab-Ltd/yandex-metrica-mcp.git   # once
git fetch upstream && git merge upstream/main
```

Do the same in the `yandex-mcp-core` fork. Review incoming changes before
merging — that review is the whole point of running from a fork.

## License

[MIT](./LICENSE) © boxlab, fork maintained by [@DZamataev](https://github.com/DZamataev)
