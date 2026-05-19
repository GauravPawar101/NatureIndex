import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, homedir } from 'os';

const MCP_URL = 'https://stitch.googleapis.com/mcp';
const OUT = resolve(process.cwd(), 'stitch-export');

function loadApiKey() {
  const raw = readFileSync(resolve(homedir(), '.cursor', 'mcp.json'), 'utf8');
  return JSON.parse(raw).mcpServers.stitch.headers['X-Goog-Api-Key'];
}

let id = 1;
async function mcpTool(apiKey, name, args = {}) {
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
    body: JSON.stringify({ jsonrpc: '2.0', id: id++, method: 'tools/call', params: { name, arguments: args } }),
  });
  return res.json();
}

const apiKey = loadApiKey();
mkdirSync(OUT, { recursive: true });

// Save design system from first project
const projects = await mcpTool(apiKey, 'list_projects', {});
const projText = projects?.result?.content?.[0]?.text;
const projData = JSON.parse(projText);
const natureProject = projData.projects.find((p) =>
  /nature|conservation|field journal/i.test(p.title || '')
);
const designProject = natureProject || projData.projects[0];
const projectId = designProject.name.split('/').pop();

console.log('Using project:', designProject.title, projectId);

if (designProject.designTheme?.designMd) {
  writeFileSync(resolve(OUT, 'DESIGN.md'), designProject.designTheme.designMd);
  console.log('Wrote stitch-export/DESIGN.md');
}

const prompts = [
  {
    slug: 'blog-listing',
    prompt: `Design a desktop blog listing page for "Nature Index" — a conservation science community platform. Dark immersive UI (deep navy #051424), glassmorphism cards, violet-to-cyan gradient accents on primary CTAs. Header: logo "Nature Index" with leaf icon, nav Home/About/Blog, Login button. Hero: eyebrow "THE FIELD JOURNAL", headline "Stories from the Frontlines", subtitle about conservation. Search bar, topic filter pills, sort dropdown. Article cards with cover image thumbnail, topic tag, title, excerpt, author and date. Match premium editorial nature aesthetic with forest imagery feel. Inter font.`,
  },
  {
    slug: 'blog-article',
    prompt: `Design a desktop blog article page for Nature Index conservation blog. Dark background #051424, glass content card, hero cover image with gradient overlay, topic pill, large headline, author row with avatar, markdown article body area, comments section with threaded replies. Violet (#8B5CF6) and cyan (#06B6D4) accent colors, glass borders rgba(255,255,255,0.1), backdrop blur. Premium readable typography.`,
  },
  {
    slug: 'login',
    prompt: `Design a login/signup page for Nature Index conservation platform. Centered glass card on dark atmospheric background with subtle violet and cyan gradient blobs. Logo, "Welcome to Nature Index", email/password fields with dark glass inputs, primary gradient button Sign In, link to create account. Minimal, premium, nature conservation brand.`,
  },
];

for (const { slug, prompt } of prompts) {
  console.log(`Generating screen: ${slug}...`);
  const gen = await mcpTool(apiKey, 'generate_screen_from_text', {
    project_id: projectId,
    prompt,
    device_type: 'DESKTOP',
  });
  writeFileSync(resolve(OUT, `generate-${slug}.json`), JSON.stringify(gen, null, 2));
  console.log(`Saved generate-${slug}.json`);
}

// List screens after generation
const screens = await mcpTool(apiKey, 'list_screens', { project_id: projectId });
writeFileSync(resolve(OUT, 'screens-after-gen.json'), JSON.stringify(screens, null, 2));
console.log('Done. Check stitch-export/ for outputs.');
