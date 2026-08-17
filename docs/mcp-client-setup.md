# Connecting an MCP client

How to point any MCP client — human-configured or AI agent — at this server. Tool contract lives in [docs/mcp-tools.md](./mcp-tools.md); read that too, since connecting only gets you to the tool list, not what each tool does.

## What you're connecting to

- **Transport**: Streamable HTTP (`spring.ai.mcp.server.protocol: STREAMABLE`)
- **Endpoint**: `https://omnidiagram.tonkla.studio/mcp` in production; `http://localhost:8090/mcp` against a local `docker compose up` stack
- **Auth**: a single static API key, sent as `Authorization: Bearer <MCP_API_KEY>` on every request to `/mcp/*`. This is **not** OAuth — the MCP spec's usual remote-server auth flow doesn't apply here; there is no discovery endpoint, no client registration, just one shared secret (see [`McpApiKeyFilter`](../backend/src/main/java/dev/omnidiagram/backend/mcp/McpApiKeyFilter.java) and [ADR-0001](./adr/0001-no-auth-shareable-link-sharing.md))
- **Where the key lives**: the `MCP_API_KEY` value in the server operator's `.env` file (see [deployment.md](./deployment.md)). If you're not the operator, you need them to hand it to you out of band — there's no self-service way to obtain it.

## Path 1 — command / config file (works for a human copy-pasting, or an agent running it directly)

**Claude Code CLI:**

```bash
claude mcp add --transport http omnidiagram https://omnidiagram.tonkla.studio/mcp \
  --header "Authorization: Bearer <MCP_API_KEY>"
```

**Raw JSON, for any client that reads an `mcpServers` config block** (Claude Desktop's `claude_desktop_config.json`, a project's `.mcp.json`, etc.):

```json
{
  "mcpServers": {
    "omnidiagram": {
      "type": "http",
      "url": "https://omnidiagram.tonkla.studio/mcp",
      "headers": {
        "Authorization": "Bearer <MCP_API_KEY>"
      }
    }
  }
}
```

Replace `<MCP_API_KEY>` with the real value from `.env` in both cases — there is nowhere else it comes from.

## Path 2 — GUI setup (for a human whose client only offers a settings screen)

Claude Desktop:

1. Open **Settings → Developer**
2. Click **Edit Config** — this opens `claude_desktop_config.json` in your system's file editor
3. Add the `omnidiagram` block from the JSON above (merge it into any existing `mcpServers` object rather than replacing the file)
4. Save and restart Claude Desktop

Menu labels drift between app versions faster than this doc gets updated — if a step doesn't match what you see, fall back to Path 1 and edit the config file directly; the file format is what actually matters.

An agent cannot drive either of these UI steps — Path 2 is for a human only, with no agent-executable equivalent, since there's nothing to script.

## Verify the connection

**Connectivity and auth, without needing an MCP client** — the filter checks the header before anything else runs, so a bare `POST` is enough to prove the key is wired up correctly:

```bash
# No key: expect 401
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://omnidiagram.tonkla.studio/mcp

# Correct key: expect anything but 401 (400/406/200 are all fine here — this only proves the key was accepted)
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://omnidiagram.tonkla.studio/mcp \
  -H "Authorization: Bearer <MCP_API_KEY>"
```

If the second call still returns `401`, the key is wrong, missing the `Bearer ` prefix, or doesn't match `MCP_API_KEY` on the server — not a client bug.

**Functional check, once connected through a real client:** call `list_diagrams`. It takes no parameters and returns every Diagram (an empty array on a fresh install is correct, not an error). See [docs/mcp-tools.md](./mcp-tools.md) for the rest of the tool surface.
