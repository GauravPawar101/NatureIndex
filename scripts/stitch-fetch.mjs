/**
 * Fetch Stitch projects/screens via MCP HTTP (local helper).
 * Reads API key from ~/.cursor/mcp.json — does not print the key.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';

const MCP_URL = 'https://stitch.googleapis.com/mcp';
const OUT_DIR = resolve(process.cwd(), 'stitch-export');

function loadApiKey() {
  const mcpPath = resolve(homedir(), '.cursor', 'mcp.json');
  const raw = readFileSync(mcpPath, 'utf8');
  const config = JSON.parse(raw);
  const key = config?.mcpServers?.stitch?.headers?.['X-Goog-Api-Key'];
  if (!key) throw new Error('Stitch API key not found in ~/.cursor/mcp.json');
  return key;
}

let requestId = 1;

async function mcpCall(apiKey, method, params = {}) {
  const body = {
    jsonrpc: '2.0',
    id: requestId++,
    method,
    params,
  };

  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response: ${text.slice(0, 500)}`);
  }
}

async function mcpTool(apiKey, toolName, args = {}) {
  return mcpCall(apiKey, 'tools/call', {
    name: toolName,
    arguments: args,
  });
}

async function main() {
  const apiKey = loadApiKey();
  mkdirSync(OUT_DIR, { recursive: true });

  console.log('Calling Stitch MCP...');

  const toolsList = await mcpCall(apiKey, 'tools/list', {});
  writeFileSync(resolve(OUT_DIR, 'tools-list.json'), JSON.stringify(toolsList, null, 2));
  console.log('Wrote stitch-export/tools-list.json');

  const projects = await mcpTool(apiKey, 'list_projects', {});
  writeFileSync(resolve(OUT_DIR, 'projects.json'), JSON.stringify(projects, null, 2));
  console.log('Wrote stitch-export/projects.json');

  const projectId =
    projects?.result?.content?.[0]?.text &&
    (() => {
      try {
        const parsed = JSON.parse(projects.result.content[0].text);
        return parsed?.projects?.[0]?.name?.split('/').pop() || parsed?.[0]?.id;
      } catch {
        return null;
      }
    })();

  if (projectId) {
    const screens = await mcpTool(apiKey, 'list_screens', { project_id: projectId });
    writeFileSync(resolve(OUT_DIR, 'screens.json'), JSON.stringify(screens, null, 2));
    console.log(`Wrote stitch-export/screens.json (project ${projectId})`);

    let screenId;
    try {
      const parsed = JSON.parse(screens?.result?.content?.[0]?.text || '{}');
      const list = parsed?.screens || parsed;
      screenId = list?.[0]?.name?.split('/').pop() || list?.[0]?.id;
    } catch {
      /* ignore */
    }

    if (screenId) {
      const screen = await mcpTool(apiKey, 'get_screen', {
        project_id: projectId,
        screen_id: screenId,
      });
      writeFileSync(resolve(OUT_DIR, 'screen-detail.json'), JSON.stringify(screen, null, 2));
      console.log(`Wrote stitch-export/screen-detail.json (screen ${screenId})`);
    }
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
