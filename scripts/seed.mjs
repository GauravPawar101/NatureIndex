/**
 * Seed Nature Index with demo users, posts, and comments.
 *
 * Prerequisites:
 *   1. Run supabase/schema.sql in the Supabase SQL Editor
 *   2. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *      and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Usage: npm run seed
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = (process.env.NEXT_PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SEED_PASSWORD = 'NatureIndex2026!';
const SEED_EMAIL_DOMAIN = '@natureindex.test';

const img = (file) => `/posts/${file}`;

const USERS = [
  {
    email: `eco_alex${SEED_EMAIL_DOMAIN}`,
    username: 'eco_alex',
    full_name: 'Alex Chen',
    bio: 'Climate policy researcher documenting frontline adaptation stories.',
    avatar_url: '/globe.svg',
  },
  {
    email: `river_maya${SEED_EMAIL_DOMAIN}`,
    username: 'river_maya',
    full_name: 'Maya Okonkwo',
    bio: 'Hydrologist focused on watershed restoration and community water rights.',
    avatar_url: '/globe.svg',
  },
  {
    email: `green_sam${SEED_EMAIL_DOMAIN}`,
    username: 'green_sam',
    full_name: 'Sam Rivera',
    bio: 'Urban sustainability advocate writing about low-impact living.',
    avatar_url: '/globe.svg',
  },
  {
    email: `wild_jordan${SEED_EMAIL_DOMAIN}`,
    username: 'wild_jordan',
    full_name: 'Jordan Blake',
    bio: 'Wildlife photographer and conservation field correspondent.',
    avatar_url: '/globe.svg',
  },
  {
    email: `climate_nina${SEED_EMAIL_DOMAIN}`,
    username: 'climate_nina',
    full_name: 'Nina Petrov',
    bio: 'Atmospheric scientist translating climate data into public action.',
    avatar_url: '/globe.svg',
  },
  {
    email: `forest_leo${SEED_EMAIL_DOMAIN}`,
    username: 'forest_leo',
    full_name: 'Leo Nakamura',
    bio: 'Forestry ecologist studying reforestation and biodiversity corridors.',
    avatar_url: '/globe.svg',
  },
  {
    email: `ocean_priya${SEED_EMAIL_DOMAIN}`,
    username: 'ocean_priya',
    full_name: 'Priya Sharma',
    bio: 'Marine biologist covering coral reef recovery and coastal resilience.',
    avatar_url: '/globe.svg',
  },
  {
    email: `earth_kai${SEED_EMAIL_DOMAIN}`,
    username: 'earth_kai',
    full_name: 'Kai Morrison',
    bio: 'Environmental engineer writing about clean energy and pollution control.',
    avatar_url: '/globe.svg',
  },
];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const POSTS = [
  {
    author: 'eco_alex',
    slug: 'arctic-ice-at-the-tipping-point',
    title: 'Arctic Ice at the Tipping Point',
    topic: 'Climate Change',
    image_url: img('climate.jpg'),
    views: 4820,
    daysAgo: 2,
    excerpt: 'New satellite data reveals accelerating melt rates across Greenland and the Canadian Arctic Archipelago.',
    content: `## A Faster Than Expected Decline

Satellite altimetry from the past eighteen months shows ice loss outpacing every IPCC mid-range projection from 2021. Coastal communities that planned for 2040 timelines are now revising adaptation budgets for 2030.

## What Field Teams Are Seeing

Glaciologists report **melt ponds forming weeks earlier** than historical averages. That darkens the surface, absorbs more heat, and triggers a feedback loop that is difficult to reverse within a single season.

## Why It Matters for Policy

When ice sheets destabilize, sea-level rise is not linear — it accelerates. Cities from Miami to Manila need updated risk models that account for these new melt curves.`,
  },
  {
    author: 'climate_nina',
    slug: 'heat-domes-and-health-emergencies',
    title: 'Heat Domes and Health Emergencies',
    topic: 'Climate Change',
    image_url: img('climate.jpg'),
    views: 3150,
    daysAgo: 8,
    excerpt: 'Record-breaking heat domes are turning urban centers into public health crises. Here is what hospitals are learning.',
    content: `## Urban Heat Is a Silent Emergency

Emergency departments across the Pacific Northwest documented a **300% spike** in heat-related admissions during the latest dome event. The patients are disproportionately elderly, unhoused, and outdoor workers.

## Infrastructure Gaps

Many cities lack sufficient cooling centers, tree canopy, and reflective roofing mandates. Nina's team mapped surface temperatures block-by-block and found a 12°C difference between shaded and exposed neighborhoods.

## Actionable Steps

1. Expand urban forestry programs
2. Require cool roofs on new commercial builds
3. Fund community hydration stations during heat advisories`,
  },
  {
    author: 'wild_jordan',
    slug: 'return-of-the-gray-wolf',
    title: 'Return of the Gray Wolf',
    topic: 'Wildlife Conservation',
    image_url: img('wildlife.jpg'),
    views: 2890,
    daysAgo: 5,
    excerpt: 'After decades of absence, gray wolves are recolonizing former range — and rewriting local ecosystems.',
    content: `## A Keystone Returns

Trail cameras in the northern Rockies captured wolf packs moving through valleys they had not occupied since the 1930s. Their presence is already shifting deer browsing patterns, allowing riparian vegetation to recover.

## Coexistence Challenges

Ranchers face legitimate livestock losses, but **non-lethal deterrent programs** — fladry, guard dogs, and early-warning collars — have reduced conflicts by up to 70% in pilot counties.

## The Bigger Picture

Top predators regulate ecosystems in ways we are only beginning to quantify. Protecting their corridors is as much a land-use question as a species question.`,
  },
  {
    author: 'wild_jordan',
    slug: 'community-led-poaching-patrols',
    title: 'Community-Led Poaching Patrols',
    topic: 'Wildlife Conservation',
    image_url: img('wildlife.jpg'),
    views: 1740,
    daysAgo: 22,
    excerpt: 'Local rangers and village cooperatives are outperforming top-down enforcement in three African conservancies.',
    content: `## Trust Beats Surveillance

When communities co-manage wildlife revenue — through ecotourism and sustainable harvest — reporting illegal activity increases dramatically. Patrol teams embedded in villages detect poaching networks faster than aerial surveys alone.

## Tools That Work

- Shared radio networks
- Rapid-reward tip lines
- Transparent revenue sharing ledgers

Conservation succeeds when people living beside wildlife see direct benefit from protecting it.`,
  },
  {
    author: 'earth_kai',
    slug: 'offshore-wind-at-grid-scale',
    title: 'Offshore Wind at Grid Scale',
    topic: 'Renewable Energy',
    image_url: img('renewable.jpg'),
    views: 2210,
    daysAgo: 11,
    excerpt: 'The newest offshore arrays are producing baseload-equivalent output — if storage and transmission keep pace.',
    content: `## Capacity Factors Are Climbing

Modern turbines with 15 MW ratings and floating foundations are unlocking deep-water sites previously considered uneconomical. Capacity factors above 50% rival many gas plants on annual averages.

## The Bottleneck Is the Grid

Interconnection queues stretch years in some regions. Without streamlined permitting and upgraded HVDC lines, turbines will spin while cities still burn coal.

## Storage Pairing

Developers are co-locating battery farms with offshore substations to smooth output and provide frequency regulation — a model worth replicating globally.`,
  },
  {
    author: 'earth_kai',
    slug: 'solar-microgrids-for-rural-clinics',
    title: 'Solar Microgrids for Rural Clinics',
    topic: 'Renewable Energy',
    image_url: img('renewable.jpg'),
    views: 980,
    daysAgo: 35,
    excerpt: 'Distributed solar is keeping vaccine cold chains alive where central grids fail.',
    content: `## Power Saves Lives

In sub-Saharan pilot sites, clinic solar microgrids reduced vaccine spoilage by **90%** during rainy seasons when diesel deliveries were unreliable.

## Design Principles

Systems must be maintainable by local technicians, not dependent on imported specialists. Modular inverters, standardized battery packs, and SMS-based performance monitoring keep uptime high.

## Scaling Up

Development banks are bundling clinic electrification into broader rural infrastructure loans — a shift from one-off charity installs to sustained programs.`,
  },
  {
    author: 'earth_kai',
    slug: 'microplastics-in-drinking-water',
    title: 'Microplastics in Drinking Water',
    topic: 'Pollution',
    image_url: img('pollution.jpg'),
    views: 3670,
    daysAgo: 4,
    excerpt: 'New filtration studies confirm microplastic particles in municipal supplies worldwide — and point to fixes.',
    content: `## Ubiquitous, Invisible, Measurable

Researchers detected plastic fibers in **94% of tap water samples** across a 12-country study. Particles originate from tire wear, synthetic textiles, and degraded packaging.

## Health Implications

Long-term effects remain under study, but inflammatory responses in lab models justify precaution. Treatment plants designed for bacteria are not optimized for polymer particles.

## Policy Levers

Extended producer responsibility, tire abrasion standards, and upgraded filtration media can reduce load at source and at tap.`,
  },
  {
    author: 'river_maya',
    slug: 'restoring-the-ganges-delta',
    title: 'Restoring the Ganges Delta',
    topic: 'Pollution',
    image_url: img('pollution.jpg'),
    views: 1420,
    daysAgo: 19,
    excerpt: 'Sediment diversion and mangrove replanting are reversing decades of delta erosion.',
    content: `## Land Building Again

Strategic sediment diversions mimic natural flooding pulses, depositing silt on sinking islands. Combined with mangrove belts, communities gain storm buffers and fisheries habitat.

## Community Science

Village teams measure salinity, track fish returns, and report illegal dumping through mobile apps — data that feeds adaptive management cycles every season.`,
  },
  {
    author: 'green_sam',
    slug: 'zero-waste-kitchen-guide',
    title: 'Zero-Waste Kitchen Guide',
    topic: 'Sustainable Living',
    image_url: img('sustainable.jpg'),
    views: 2560,
    daysAgo: 7,
    excerpt: 'Practical swaps that cut household food waste by half without expensive gadgets.',
    content: `## Start With Visibility

Most households waste food they forgot they bought. A simple **FIFO shelf system** and weekly use-first bin cut Sam's own waste 52% in two months.

## Low-Cost Wins

- Glass jars for bulk dry goods
- Composting even in small apartments via bokashi
- Meal plans built around overlapping ingredients

Sustainability should save money, not require a luxury budget.`,
  },
  {
    author: 'green_sam',
    slug: 'repair-culture-is-back',
    title: 'Repair Culture Is Back',
    topic: 'Sustainable Living',
    image_url: img('sustainable.jpg'),
    views: 890,
    daysAgo: 41,
    excerpt: 'Community repair cafes are diverting tons of electronics from landfill — and teaching skills.',
    content: `## Fix Before You Replace

Monthly repair events in Portland and Berlin report **average 3.2 kg diverted per attendee** per session. Volunteers troubleshoot toasters, laptops, and bicycles alongside owners.

## Right to Repair

Legislation mandating spare parts and manuals is accelerating. Manufacturers resisting change face both regulatory pressure and consumer backlash.`,
  },
  {
    author: 'forest_leo',
    slug: 'amazon-reforestation-corridors',
    title: 'Amazon Reforestation Corridors',
    topic: 'Deforestation',
    image_url: img('forest.jpg'),
    views: 3340,
    daysAgo: 6,
    excerpt: 'Connecting fragmented forest patches lets wide-ranging species survive in degraded landscapes.',
    content: `## Corridors Are Lifelines

Jaguars and harpy eagles need continuous canopy. Leo's team mapped minimum corridor widths using movement telemetry and is working with farmers to retire marginal pasture strips.

## Native Species Mix

Replanting monoculture teak fails ecologically. Mixed native palettes rebuild soil fungi, pollinator networks, and resilience to drought.`,
  },
  {
    author: 'forest_leo',
    slug: 'satellite-monitoring-of-illegal-logging',
    title: 'Satellite Monitoring of Illegal Logging',
    topic: 'Deforestation',
    image_url: img('deforestation.jpg'),
    views: 1980,
    daysAgo: 14,
    excerpt: 'Near-real-time radar can detect logging roads within 24 hours — if governments act on alerts.',
    content: `## Seeing Through Cloud Cover

Optical satellites miss activity during monsoon season; SAR radar does not. Alert systems now ping rangers when new access roads appear inside protected zones.

## Enforcement Gap

Technology without prosecution capacity creates alert fatigue. The best programs pair satellite feeds with funded rapid-response teams and judicial follow-through.`,
  },
  {
    author: 'ocean_priya',
    slug: 'coral-bleaching-recovery-signs',
    title: 'Coral Bleaching Recovery Signs',
    topic: 'Ocean Conservation',
    image_url: img('ocean.jpg'),
    views: 4100,
    daysAgo: 3,
    excerpt: 'Some reef sections are bouncing back faster than models predicted — heat tolerance may be evolving.',
    content: `## Not All Reefs Bleach Equally

Sites with strong water exchange and healthy parrotfish populations show **partial recovery within 18 months** after mild bleaching events. Priya's dive logs compare symbiont diversity across zones.

## Assisted Evolution

Selective breeding of heat-tolerant corals is controversial but progressing. Outplanting must avoid genetic bottlenecks that weaken reef resilience long-term.`,
  },
  {
    author: 'ocean_priya',
    slug: 'ghost-nets-and-cleanup-drones',
    title: 'Ghost Nets and Cleanup Drones',
    topic: 'Ocean Conservation',
    image_url: img('ocean.jpg'),
    views: 1650,
    daysAgo: 27,
    excerpt: 'Autonomous surface drones are retrieving abandoned fishing gear before it shreds more habitat.',
    content: `## Entanglement Never Stops

Ghost nets continue catching fish and cetaceans for years. Drone fleets guided by AI object detection removed **14 tons of gear** in a North Sea pilot season.

## Prevention First

Gear marking, deposit schemes, and port-side collection points keep nets accountable to owners — cleanup alone cannot keep pace with discard rates.`,
  },
  {
    author: 'river_maya',
    slug: 'dam-removal-river-rebirth',
    title: 'Dam Removal and River Rebirth',
    topic: 'Water Resources',
    image_url: img('water.jpg'),
    views: 2780,
    daysAgo: 9,
    excerpt: 'Two dam removals on the Penobscot River restored migratory fish runs within a single spawning cycle.',
    content: `## Sediment Moves, Life Returns

Within months of breaching, alewife and shad pushed upstream into habitat blocked for a century. Sediment pulses rebuilt downstream gravel bars essential for spawning.

## Planning Matters

Uncontrolled releases cause spikes in turbidity. Drawdown schedules, fish bypass monitoring, and downstream community alerts make removals safer for everyone.`,
  },
  {
    author: 'river_maya',
    slug: 'groundwater-depletion-in-agriculture',
    title: 'Groundwater Depletion in Agriculture',
    topic: 'Water Resources',
    image_url: img('water.jpg'),
    views: 1120,
    daysAgo: 33,
    excerpt: 'Aquifer drawdown is outpacing recharge across major breadbaskets — precision irrigation offers a path out.',
    content: `## Pumping Faster Than Rain

In parts of the High Plains, water tables drop meters per decade. Crop yields hold only because deeper wells delay the reckoning.

## Smart Water Accounting

Soil moisture sensors, deficit irrigation scheduling, and crop switching to drought-tolerant varieties reduced pumping **30%** in cooperative pilot farms without yield loss.`,
  },
  {
    author: 'eco_alex',
    slug: 'youth-climate-courts-update',
    title: 'Youth Climate Courts Update',
    topic: 'Climate Change',
    image_url: img('climate.jpg'),
    views: 760,
    daysAgo: 55,
    excerpt: 'A roundup of landmark youth-led climate cases moving through courts on three continents.',
    content: `## Legal Precedent Builds

Courts in Europe and Latin America increasingly recognize government duty-of-care obligations to future generations. Cases hinge on quantified emissions pathways and enforceable remedies.

## Beyond Symbolism

When judgments mandate revised national plans, they create leverage civil society can monitor — turning courtroom wins into measurable emission cuts.`,
  },
  {
    author: 'green_sam',
    slug: 'public-transit-as-climate-policy',
    title: 'Public Transit as Climate Policy',
    topic: 'Sustainable Living',
    image_url: img('sustainable.jpg'),
    views: 1340,
    daysAgo: 16,
    excerpt: 'Free fare pilots reduced car trips more than congestion pricing alone in mid-size cities.',
    content: `## Mode Shift at Scale

When buses and trams are fast, frequent, and affordable, households shed second cars. Emission reductions compound as land once used for parking converts to housing and green space.

## Funding Models

Employer payroll taxes, congestion fees, and land-value capture near stations can fund operations without regressive sales taxes.`,
  },
];

const COMMENTS = [
  { post_slug: 'arctic-ice-at-the-tipping-point', author: 'climate_nina', content: 'The albedo feedback section is spot on — we measured similar patterns in Labrador last season.' },
  { post_slug: 'arctic-ice-at-the-tipping-point', author: 'river_maya', content: 'Coastal cities need to tie this data to their zoning updates immediately.', parent_index: 0 },
  { post_slug: 'return-of-the-gray-wolf', author: 'forest_leo', content: 'Riparian recovery data from Yellowstone parallels what we see with wolf reintroduction in managed forests.' },
  { post_slug: 'offshore-wind-at-grid-scale', author: 'eco_alex', content: 'Grid interconnection reform is the unsung hero policy here. Without it, capacity factors do not matter.' },
  { post_slug: 'microplastics-in-drinking-water', author: 'ocean_priya', content: 'Marine sources feed back into municipal intake — this is a watershed-to-tap problem, not just a treatment plant fix.' },
  { post_slug: 'coral-bleaching-recovery-signs', author: 'wild_jordan', content: 'Parrotfish protection should be mandatory in every recovery plan. They keep algae in check better than any diver team.' },
  { post_slug: 'coral-bleaching-recovery-signs', author: 'green_sam', content: 'Are there citizen science protocols tourists can follow without damaging reefs?', parent_index: 4 },
  { post_slug: 'coral-bleaching-recovery-signs', author: 'ocean_priya', content: 'Yes — Reef Check and Coral Watch both have snorkeler-friendly surveys. Link in my profile bio.', parent_index: 5 },
  { post_slug: 'zero-waste-kitchen-guide', author: 'green_sam', content: 'Update: bokashi bran is now available at our local co-op for under $15/month.' },
  { post_slug: 'dam-removal-river-rebirth', author: 'wild_jordan', content: 'Fish counters upstream reported record shad numbers. Incredible to see in one year.' },
  { post_slug: 'amazon-reforestation-corridors', author: 'eco_alex', content: 'Carbon credit markets finally pricing biodiversity co-benefits would accelerate these corridor deals.' },
  { post_slug: 'heat-domes-and-health-emergencies', author: 'river_maya', content: 'Hydration stations saved lives in our county — worth every dollar of the public health budget.' },
];

async function clearSeedData() {
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;

  const seedUsers = (listData?.users || []).filter((u) => u.email?.endsWith(SEED_EMAIL_DOMAIN));
  for (const user of seedUsers) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) console.warn(`Could not delete ${user.email}:`, error.message);
  }

  if (seedUsers.length) {
    console.log(`Removed ${seedUsers.length} existing seed user(s).`);
  }
}

async function createSeedUsers() {
  const userIds = {};

  for (const user of USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: SEED_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: user.full_name,
        avatar_url: user.avatar_url,
      },
    });

    if (error) throw new Error(`Failed to create ${user.email}: ${error.message}`);

    const userId = data.user.id;
    userIds[user.username] = userId;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        username: user.username,
        full_name: user.full_name,
        bio: user.bio,
        avatar_url: user.avatar_url,
      })
      .eq('id', userId);

    if (profileError) throw new Error(`Failed to update profile for ${user.username}: ${profileError.message}`);
    console.log(`Created user @${user.username}`);
  }

  return userIds;
}

async function createPosts(userIds) {
  const postIds = {};

  for (const post of POSTS) {
    const row = {
      user_id: userIds[post.author],
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      image_url: post.image_url,
      topic: post.topic,
      views: post.views,
      published: true,
      date: daysAgo(post.daysAgo),
    };

    const { data, error } = await supabase.from('posts').insert(row).select('id, slug').single();
    if (error) throw new Error(`Failed to insert post "${post.slug}": ${error.message}`);

    postIds[post.slug] = data.id;
    console.log(`Created post: ${post.title}`);
  }

  return postIds;
}

async function createComments(userIds, postIds) {
  const insertedCommentIds = [];

  for (const comment of COMMENTS) {
    const postId = postIds[comment.post_slug];
    const userId = userIds[comment.author];
    if (!postId || !userId) continue;

    const parentId =
      comment.parent_index != null ? insertedCommentIds[comment.parent_index] : null;

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content: comment.content,
        parent_id: parentId,
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to insert comment on ${comment.post_slug}: ${error.message}`);
    insertedCommentIds.push(data.id);
  }

  console.log(`Created ${insertedCommentIds.length} comments (including replies).`);
}

async function main() {
  console.log('Seeding Nature Index database...\n');

  await clearSeedData();
  const userIds = await createSeedUsers();
  const postIds = await createPosts(userIds);
  await createComments(userIds, postIds);

  console.log('\nSeed complete.');
  console.log(`\nLogin with any seed account, e.g. eco_alex${SEED_EMAIL_DOMAIN}`);
  console.log(`Password: ${SEED_PASSWORD}`);
  console.log(`\nSite URL for images: ${siteUrl}`);
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
});
