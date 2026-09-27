/**
 * Seed dataset for Nature Index.
 *
 * Kept separate from `seed.mjs` (the writer) so the same records can be loaded
 * two ways: into Supabase via the service-role client, and into a throwaway
 * Postgres in CI to prove the data actually satisfies the schema's constraints.
 *
 * Everything here is deterministic. Slugs are derived from titles rather than
 * stamped with `Date.now()` + a random suffix, so re-running the seeder updates
 * the same rows instead of piling up near-duplicate posts.
 *
 * Cover images point at files committed under `public/posts/`, so they render
 * without depending on an external image host being allow-listed.
 */

/** Must satisfy profiles_username_length / profiles_username_chars. */
export const AUTHORS = [
  {
    username: 'elena_vasquez',
    email: 'elena.vasquez@example.com',
    full_name: 'Dr. Elena Vasquez',
    website: 'https://example.com/elena-vasquez',
    bio: 'Tropical forest ecologist. I spend most of the year in the Chocó documenting amphibian decline and writing it up for people who can actually change policy.',
    avatar_url: '/images/default-avatar.svg',
  },
  {
    username: 'tomas_lindqvist',
    email: 'tomas.lindqvist@example.com',
    full_name: 'Tomas Lindqvist',
    website: 'https://example.com/tomas-lindqvist',
    bio: 'Glaciologist working on mass-balance modelling. Interested in making permafrost data legible to non-specialists.',
    avatar_url: '/images/default-avatar.svg',
  },
  {
    username: 'aisha_okafor',
    email: 'aisha.okafor@example.com',
    full_name: 'Aisha Okafor',
    website: 'https://example.com/aisha-okafor',
    bio: 'Marine biologist and open-data advocate. Running a citizen-science tidepool census across 40 km of rocky shore.',
    avatar_url: '/images/default-avatar.svg',
  },
  {
    username: 'kenji_watanabe',
    email: 'kenji.watanabe@example.com',
    full_name: 'Kenji Watanabe',
    website: 'https://example.com/kenji-watanabe',
    bio: 'Reforestation practitioner. Planted 400,000 mangroves and then measured whether any of it survived, which is the interesting part.',
    avatar_url: '/images/default-avatar.svg',
  },
  {
    username: 'priya_raman',
    email: 'priya.raman@example.com',
    full_name: 'Priya Raman',
    website: 'https://example.com/priya-raman',
    bio: 'Atmospheric chemist. I publish the aerosol datasets nobody wants to maintain, because somebody has to.',
    avatar_url: '/images/default-avatar.svg',
  },
  {
    username: 'marcus_obi',
    email: 'marcus.obi@example.com',
    full_name: 'Marcus Obi',
    website: 'https://example.com/marcus-obi',
    bio: 'Conservation hydrologist. Groundwater, mostly, and the people who depend on it.',
    avatar_url: '/images/default-avatar.svg',
  },
  {
    username: 'sara_benali',
    email: 'sara.benali@example.com',
    full_name: 'Sara Benali',
    website: 'https://example.com/sara-benali',
    bio: 'Wildlife corridor planner working across the Atlas range. Interested in the unglamorous land parcels that make corridors possible.',
    avatar_url: '/images/default-avatar.svg',
  },
  {
    username: 'demo_user',
    email: 'demo@example.com',
    full_name: 'Demo Admin User',
    website: 'https://example.com',
    bio: 'Demo account for local development and reviews. Not a real contributor.',
    avatar_url: '/images/default-avatar.svg',
  },
];

/** The demo account's password, printed by seed.mjs so reviewers can log in. */
export const DEMO_PASSWORD = 'DemoPassword123!';

const T = {
  CLIMATE: 'Climate Change',
  WILDLIFE: 'Wildlife Conservation',
  RENEWABLE: 'Renewable Energy',
  POLLUTION: 'Pollution',
  SUSTAINABLE: 'Sustainable Living',
  DEFORESTATION: 'Deforestation',
  OCEAN: 'Ocean Conservation',
  WATER: 'Water Resources',
};

/**
 * These are the only eight values `CreatePostForm` offers as a topic, so the
 * seeded data uses exactly these strings — otherwise the blog page's topic
 * filter would show categories the app itself can't produce.
 */
export const POSTS = [
  {
    author: 'kenji_watanabe',
    title: 'Restoring Mangroves, Then Actually Checking Whether They Survived',
    topic: T.DEFORESTATION,
    image_url: '/posts/deforestation.jpg',
    days_ago: 412,
    views: 18_420,
    content: `Planting a mangrove is easy. Plant is a four-letter word and a sapling costs a few currency units. The hard part is the part that gets left out of the brochures: whether any of it is still alive in three years.

## The survival number nobody publishes

We tracked 400,000 propagules across eleven sites in the Sundarbans transition zone. Two years on, mean survival was **31%**. Not 80%. Not 60%. Thirty-one.

The variance between sites mattered far more than the mean. The two worst sites were both downstream of a shrimp farm whose outboard motors turned the water anoxic at peak tide. Nothing we planted there was going to survive, and we would have known that in week six if we had measured.

> A restoration project that does not publish its survival rate is not reporting a result. It is reporting an intention.

## What actually predicted survival

Three variables, in order:

- **Hydrological regime.** Sites with a genuine tidal prism beat sites that were "functionally" coastal but hydrologically disconnected. Sediment supply mattered less than water movement.
- **Community tenure.** Where villagers held legally recognised harvesting rights over the restored stand, survival was roughly double. Not because they planted better — because nobody removed the saplings for fuelwood.
- **Planting season.** Monsoon onset, not calendar date. Our first year we planted on a fixed date and lost an entire cohort to an early dry spell.

## What we changed

We stopped treating planting as the deliverable. The deliverable is a sapling that is still there at year three. So we moved the measurement crew earlier, added a post-12-month census as a hard gate before releasing the next tranche of funding, and moved two of the worst sites out of the programme entirely.

Two years is not success. But the next cohort went into ground we had already learned to distrust, and the sites we kept are holding at 68%.`,
  },
  {
    author: 'aisha_okafor',
    title: 'A Tidepool Census Is Telling Us More Than the Surveys It Replaced',
    topic: T.OCEAN,
    image_url: '/posts/ocean.jpg',
    days_ago: 38,
    views: 9_712,
    content: `Our rocky shore survey budget was cut by 60% two budget cycles ago. Rather than scale the survey down, we did something that sounded reckless at the time: we gave the survey to the public.

## What we asked volunteers to do

Photograph a marked 1m² quadrat at low tide, upload it with a timestamp and GPS fix, and log which species are visible. No species identification required — that is handled later, by a classifier and then by a human reviewer. This matters: asking untrained people to name species produces confident garbage, whereas asking them to take a photograph produces usable data.

Fourteen months in: **31,400 quadrat photographs** from 412 volunteers, covering 40 km of shoreline.

## What it found that the professional survey did not

The professional survey sampled on a fixed schedule and always found the same eleven species. The volunteer data found three species the paid survey had never recorded on this shore, one of which — *Acanthodoris caerulea*, a large sea slug — is listed as Data Deficient for the whole region.

A second finding was spatial. Anemone abundance on the eastern half of the shore is roughly 3x the western half, and the break falls exactly where a storm drain outfall enters. The professional survey was too sparse to see a gradient; the volunteer data resolves it per-quadrat.

## The failure modes, honestly

Photograph quality is uneven and roughly 12% of uploads are unusable. Repeat volunteers dominate — 8% of people produced 30% of the data. And participation tracks foot traffic, so the data is spatially biased toward places with a car park.

None of that is a reason to stop. It is a reason to publish the bias alongside the result, which is what we do.`,
  },
  {
    author: 'elena_vasquez',
    title: 'Chocó Amphibian Declines: What the Absence Data Actually Shows',
    topic: T.WILDLIFE,
    image_url: '/posts/wildlife.jpg',
    days_ago: 96,
    views: 14_233,
    content: `We have 19 years of amphibian survey data from the Chocó. The headline — *Phyllomedusa* and *Cruziohyla* populations have collapsed — is not in dispute. What is in dispute is how much of the apparent collapse is real decline and how much is sampling drift.

## Why this question matters more than usual

Every number in this dataset was collected by different people, with different protocols, using different effort levels. If you ignore that, you will confidently report a decline that is partly an artefact of who was surveying in which decade.

## The method we used

We built an **occupancy model** that estimates detection probability per species per site per year, rather than comparing raw encounter counts. This is the entire point: a fall in *counts* is not a fall in *abundance* unless detection probability is constant, and it demonstrably is not — wet-night surveys detect 2.4x more than dry-night surveys at the same site.

With detection modelled, the estimated occupancy decline for the four target species is:

- *Phyllomedusa hypochondrialis* — 74% over 19 years
- *Cruziohyla*e — 61%
- *Hyloxalus* sp. — 58%
- *Dendrobates guttulatus* — 31%

The first three are consistent with a real, severe decline. The fourth is not distinguishable from survey noise, and we say so rather than rounding it into the narrative.

## What is causing it

Chytrid fungus (*Bd*) is present across the range. So is illegal gold mining, which is the proximate driver in the two most affected catchments. These are not alternative explanations — the mining is creating the hydrological and soil conditions that make *Bd* lethal.

## The uncomfortable implication

The species that appear to be doing best are the ones nobody was looking for, because they are not traditionally charismatic. If conservation funding follows public attention, the recovery narrative will be written entirely about species that were never at risk.`,
  },
  {
    author: 'tomas_lindqvist',
    title: 'Reading the Retreat of Athabasca: What a Glacier Leaves Behind',
    topic: T.CLIMATE,
    image_url: '/posts/climate.jpg',
    days_ago: 21,
    views: 22_876,
    content: `A glacier is a slow instrument with a fast readout. The ice integrates everything; the terminus responds to decades of forcing, not last winter's snowfall. That is what makes it useful and what makes it frustrating.

## The measurement, stated plainly

Athabasca's terminus has retreated **2.4 km** since we began survey work in 2008, averaging 57 m/yr, with the last three years running at 1.8x the long-term mean. The acceleration is real and is consistent across independent survey methods (photogrammetry, GPS stake networks, and satellite-derived edge detection), which matters because method disagreement is the usual reason a number gets disputed.

## The moraine record

Retreating ice leaves a chronological archive in the moraine: annual dust bands, each one a dated layer. We have been measuring band thickness and lichen cover as a proxy for exposure age. This gives a rough 214-year chronology at the site, which is longer than our instrument record and lets us put the modern rate into a longer frame.

The framing is unflattering. Over the 214-year record, mean retreat is 11 m/yr. We are currently running about five times that.

## The part that is hard to communicate

Absolutes and rates land very differently. "Losing 57 metres a year" is more comprehensible than "losing 0.94% of volume a year" but less honest, because the first implies the glacier will be gone in 40 years, which is not what the model says — the volume loss is accelerating faster than the terminus retreat, and terminus retreat is the visible part.

We now report both, always, and explain the difference in the caption. It takes one extra sentence and it prevents the most common misreading.`,
  },
  {
    author: 'priya_raman',
    title: 'Shipping Haze over the Indian Ocean, and the AERONET Record Nobody Downloaded',
    topic: T.POLLUTION,
    image_url: '/posts/pollution.jpg',
    days_ago: 63,
    views: 7_308,
    content: `An optical depth record is not a news story. That is most of the reason this one went unnoticed for a decade.

## What happened

Between March and July 2024, aerosol optical depth over the northern Indian Ocean exceeded the 2003–2023 baseline for 41 consecutive days. Peak values were 4.2x baseline, which is the range where you start losing surface visibility from aircraft and respiratory function becomes measurably worse on the ground.

## Why nobody noticed

The AERONET data was there. It had been there the whole time. The problem is that nobody was running the retrieval at the right cadence and nobody was diffing against the seasonal baseline, so the signal sat in a public archive until three independent groups found it separately, in order, about a month apart.

This is the failure mode that data archives hide best: not that data is missing, but that **nobody computed the one number that would have mattered.**

## Attribution

We used HYSPLIT back-trajectories to apportion source regions. Roughly 62% of the excess aerosol was traceable to regional biomass burning, 21% to shipping, and the remainder to dust transported from the Arabian peninsula. Ship emissions are usually the scapegoat; here they are a real but secondary contributor.

The biomass-burning share is the actionable finding, and it points at a set of agricultural-residue burning practices that are, in principle, straightforward to change with existing extension services.

## The boring recommendation

Stand up a scheduled baseline-diff on the AERONET network. It costs almost nothing and it would have produced this finding in April rather than September.`,
  },
  {
    author: 'marcus_obi',
    title: 'Groundwater is Being Managed as a Bank Account Nobody Made a Deposit Into',
    topic: T.WATER,
    image_url: '/posts/water.jpg',
    days_ago: 154,
    views: 11_540,
    content: `Every aquifer abstraction model in this district assumes a historical baseline of recharge. That baseline is the problem.

## The arithmetic

The regional model assumes recharge of 41 mm/yr. Best current estimates, from a re-analysis of 30 years of GRACE and 200 borehole logs, put mean effective recharge closer to **24 mm/yr** — a 41% overestimate.

Abstract that error over twenty years and you get a permitted withdrawal volume the aquifer has never actually contained. This is not a modelling subtlety; it is the difference between a well that works and a dry borehole in 2041.

## Where the error came from

Historical recharge was estimated from the 1980s, when there was extensive ephemeral surface flow across the alluvial fan contributing to deep recharge. That surface flow has been progressively intercepted — for irrigation, for urban supply, and increasingly by check dams. As the surface contribution fell, deep recharge fell with it, but the model was never re-derived.

So the aquifer is being managed against a hydrology that stopped existing in the 1990s, and the abstraction permits inherited from that model are still being issued.

## The socioeconomic part

This is not only a hydrology problem. Groundwater in this district is the fallback for households that cannot afford the connection charge for the treated scheme. When the fallback fails, the failure is not a dry well — it is a household with no water, and that is a public-health event long before it is a geological one.

We have published the re-analysis with the well logs so that other districts can run the same check. If you have a model built on a pre-2000 baseline, this is worth an afternoon of your time.`,
  },
  {
    author: 'sara_benali',
    title: 'Wildlife Corridors Are Land Problems Wearing a Biology Costume',
    topic: T.WILDLIFE,
    image_url: '/posts/forest.jpg',
    days_ago: 271,
    views: 6_891,
    content: `There is a persistent belief that wildlife corridor failure is a problem of ecological modelling. It is not. Corridors fail because somebody has to own, maintain, and be accountable for a strip of land, and almost nobody does.

## The Atlas case

We mapped 14 candidate corridors between fragmented Atlas cedar populations. Nine were ecologically viable on paper — adequate width, adequate canopy connectivity, adequate water. One was built. Three failed, and all three failed the same way.

- **One** failed because the connecting parcel was held by an owner who had not been consulted and refused.
- **One** failed because maintenance funding was approved for construction only, so the corridor was legally established and then overgrown in four years.
- **One** failed because it crossed a road whose upgrade project re-routed without consulting the corridor design.

None of these are wildlife problems. All three would have been caught by asking two questions before the ecology: who owns the land, and who maintains it for twenty years.

## What actually works

The single corridor that succeeded shares three properties. It sits on land already under some form of community management arrangement. It has a named maintenance body with a budget line. And it has a post-construction monitoring commitment written into the funding agreement, with the monitoring paid for by the same grant.

That is the whole method. It is unglamorous, it is mostly administrative, and it is more predictive than any corridor-suitability model we have run.

## The uncomfortable conclusion

Most corridor planning effort is spent optimising width and placement for species that may never use the corridor, while the binding constraint is that no human institution is responsible for the thing.`,
  },
  {
    author: 'kenji_watanabe',
    title: 'What We Learned From Deliberately Failing at a Reforestation Site',
    topic: T.SUSTAINABLE,
    image_url: '/posts/sustainable.jpg',
    days_ago: 330,
    views: 4_102,
    content: `Some experiments are designed to succeed. This one was designed to answer a question we could not otherwise answer, and the answer was uncomfortable enough that we published it.

## The question

Does enrichment planting — adding a handful of species into a degraded, already-seeded site — help? The funding bodies strongly implied yes, since that is what they fund. We could not test it without a site where the answer might be no.

## The design

We paired two degraded sites of near-identical history. On one we added six locally sourced climax species. On the other we added nothing and simply excluded grazing. Twelve years of monitoring. No intervention on the control beyond the grazing exclusion, which both sites received.

## The result

The control won. Native seedling density in the enrichment plot was not significantly different from the control, and the control had **higher** stem density of two of the six planted species — the recruits had arrived on their own, from the seed bank, and the added stock was largely duplicates of what had arrived naturally.

Worse, the enrichment plot had lower species evenness, because our six species were planted in roughly equal numbers and that skewed the distribution away from what the seed bank was producing.

## The mechanism, which is the actual finding

Excluding grazing was doing essentially all of the work. The intervention we had assumed was the variable was the variable we had not tested. Enrichment planting, in this ecosystem, at this stage, was close to a no-op that also degraded the diversity of what was establishing itself.

## What we would do differently

Run the control earlier, and longer. We would also fund this again — a negative result that redirects several hundred thousand dollars of enrichment planting is worth a great deal. The thing to avoid is what almost happened: this study nearly went unreported, because the funders had committed to the answer.`,
  },
  {
    author: 'aisha_okafor',
    title: 'Kelp Forests Are Not Trees and Should Not Be Managed Like Them',
    topic: T.OCEAN,
    image_url: '/posts/ocean.jpg',
    days_ago: 5,
    views: 3_418,
    content: `Kelp gets managed with forestry templates, and the mismatch produces bad interventions.

## The structural difference

A kelp forest is canopy, not wood. Macrocystis holds gas bladders that keep fronds at the surface, generating productivity that is closer to an upwelling system than to a stand of trees. Removal of canopy does not leave a gap that fills in; it changes the hydrodynamics of the whole bed, and the recovery can be dominated by the same urchin that caused the initial loss.

Which means: **a clearcut model predicts the wrong recovery, and replanting predicts an outcome that has no analogue here.**

## What state-based management looks like

Our approach at this site is entirely about the transition threshold. We do not maintain an area through replanting. We maintain it by holding the *urchin density* below the level at which the loss becomes effectively irreversible, and we treat that threshold as the resource.

Practically that means monitoring barrens and treating them when they form, rather than managing forest area. Three treatments in the last two years have held a 14-hectare bed that was on the point of crossing over.

## Honest uncertainty

The threshold is not a constant. It moves with storm frequency, with sea temperature, and with the productivity of the neighbouring beds that supply spore inoculum. We use a conservative value derived from the local urchin size-structure, and we publish the sensitivity analysis, because a threshold that looks precise and is not is how management plans go wrong.

## The transferable point

If your intervention is "replant," you are probably treating a fishery problem as a forestry problem. In a lot of kelp systems the honest answer is that there is nothing to replant yet; the job is to make the forest come back on its own.`,
  },
  {
    author: 'priya_raman',
    title: 'Methane, Rice, and the Value of Measuring the Same Field Twice',
    topic: T.CLIMATE,
    image_url: '/posts/climate.jpg',
    days_ago: 187,
    views: 8_255,
    content: `We re-measured a paddy field that had been instrumented in 2011. The headline number moved 34% between the two campaigns, for reasons that had nothing to do with the field.

## The measurement problem

Static chamber methane measurements in flooded rice are notoriously sensitive to setup. Water depth, time of day, and whether the chamber is left floating or pressed against the soil all move the result by factors well above the inter-annual signal everyone is trying to detect.

The 2011 and 2025 campaigns used the same field, the same nominal protocol, and different field technicians. The 34% difference is, to our knowledge, mostly technician.

## What we did about it

We ran both protocols — 2011-style and 2025-style — in the same field, same week, alternating daily. That gives a direct estimate of the protocol offset, which is more useful than either measurement alone.

The offset was **+29% for the 2011 protocol**, and once corrected, the two campaigns agree to within 7%.

## Why this matters beyond our paddies

The global rice methane inventory rests on a relatively small number of these studies, many by different groups with different protocols and no cross-calibration. If the protocol effect is of this size, then a meaningful fraction of the inter-lab disagreement in the literature is instrument, not rice.

Cross-calibration is unglamorous. It also happens to be the difference between a number and an anecdote.`,
  },
  {
    author: 'marcus_obi',
    title: 'Rainwater Harvesting Is Not a Solution and Should Not Be Sold as One',
    topic: T.WATER,
    image_url: '/posts/water.jpg',
    days_ago: 244,
    views: 5_076,
    content: `I want to be uncharacteristically direct, because this one keeps coming up in the position papers I am asked to review.

Rainwater harvesting systems — rooftop capture, lined farm ponds, community tanks — are **demand management**. They reduce draw on a mains or a groundwater source during a wet season. That is genuinely useful. It is also, on its own, not a drought adaptation, and presenting it as one produces bad planning.

## The arithmetic that gets skipped

A 200 m² roof in a 600 mm annual rainfall district yields roughly 120 m³/yr before losses. A single household's annual potable and hygiene demand in that district is of the same order. So a household capture system offsets on the order of a year's own demand, in a district where a failed season is a three-year deficit.

This is not an argument against harvesting. It is an argument for putting it in the right category: supply augmentation, or emergency reserve, or just efficiency — but not drought resilience on its own.

## Where they genuinely do work

- As a **buffer** against a single-season interruption, they are excellent and cheap.
- Where they are **fed by genuinely treated greywater**, they become a supply source rather than a buffer.
- In settlements with no distribution at all, a properly maintained tank is the entire service.

## The planning error I keep seeing

Harvesting gets funded from the same budget line as the augmentation projects it is then counted as, and the district plan shows a balanced water budget. It isn't. The number is a subtraction, not an addition, and treating it as an addition is how a district ends up with a supply deficit it did not know it had.`,
  },
  {
    author: 'sara_benali',
    title: 'Satellite Deforestation Alerts Are Fast, Cheap, and Routinely Ignored',
    topic: T.DEFORESTATION,
    image_url: '/posts/deforestation.jpg',
    days_ago: 9,
    views: 12_608,
    content: `A deforestation alert system can detect a clearing event within seventy-two hours. In the district where we work, the median time from detection to a field visit was **nine months**.

## Where the delay comes from

Not from the detection. The alerts were accurate — a 91% precision rate on our ground-truthed sample, and the false positives were mostly small-scale firewood clearing, which we now classify separately rather than discarding.

The delay was entirely in the response chain: alert lands in an email, email is read once a week, routing to the district office is manual, the district office has one field officer for a 4,000 km² area, and there is no pre-authorised budget to act on an alert without a supervisor's sign-off.

Every one of those steps is a decision someone made at some point for a reasonable reason. Together they produce a nine-month latency on a change that is irreversible within roughly two.

## What we changed

- Alerts go to a shared queue with a 72-hour acknowledgement requirement, not an inbox.
- Pre-authorise a small rapid-response budget so a field visit does not need per-incident approval.
- Drop the supervisor sign-off for events above an area threshold, with retrospective review instead.
- Route household-scale clearing away from the enforcement queue entirely — it is a livelihood issue, not a permit enforcement issue, and lumping it in was training people to ignore alerts.

Median time to field visit is now **11 days**. The precision did not change. Nothing about the forest changed. The chain did.`,
  },
  {
    author: 'elena_vasquez',
    title: 'A Note on Stopping the Chocó Survey',
    topic: T.WILDLIFE,
    image_url: '/posts/wildlife.jpg',
    days_ago: 2,
    views: 2_640,
    content: `After 19 years and 3,400 survey nights, the Chocó amphibian monitoring programme stops funding at the end of this quarter. This is a short note on what we have, because the archive outlives the project and somebody will need it.

## What the archive is

- 3,412 survey nights at 214 fixed sites, each with full protocol metadata.
- 61,000 species-level detection records with observer, effort, and environmental covariates.
- Raw field sheets, not just the derived database.
- All of it under a permissive licence, and all of it in a repository with a DOI.

## The part that is genuinely irreplaceable

Not the headline trend — the literature already has that. It is the **effort metadata**. Because every detection record carries the effort that produced it, the dataset can be re-analysed under a different detection model, or a better one written in ten years, and still produce a defensible abundance estimate.

Datasets without effort metadata are effectively single-use: the trend is baked in at collection time, in whatever way the original analyst happened to do it. Ours is not, and that is a deliberate consequence of how the forms were designed, not luck.

## What we would tell the next team

Record effort even when you are certain the analysis will be obvious. Store raw data. Publish the metadata schema explicitly. The value of a long-term dataset is almost entirely in how re-analysable it is, and that property is decided by decisions nobody notices while they are being made.`,
  },
  {
    author: 'priya_raman',
    title: 'The Ozone Hole Recovery Will Be Visible, Gradual, and Misreported',
    topic: T.CLIMATE,
    image_url: '/posts/climate.jpg',
    days_ago: 415,
    views: 8_940,
    content: `A nice story, mostly accurate, and about to be covered in a way that will overstate it. Here is the version I would like to see used.

## What the science says

Total column ozone over Antarctica is projected to return to 1980-era values around **2066**, under the middle assumptions. Montreal Protocol phase-outs are the reason. The most ozone-depleting substances are regulated and their atmospheric abundance is already declining.

That is a genuine environmental success and it is largely attributable to a specific, dated, verifiable policy instrument. Very few things in climate-adjacent science are that clean.

## How it will be misreported

Three predictable failure modes, all of which we have already seen in drafts of this piece:

1. **"The ozone hole is closing."** It is not closing; total-column recovery to pre-1980 values and the disappearance of the annual Antarctic ozone hole are different quantities on different timescales. The hole is expected to disappear somewhere between 2040 and 2066 depending on the assumption set.
2. **Conflating ozone with climate.** Ozone recovery does very little for near-term warming. In the troposphere, ozone is a pollutant and a forcing agent; in the stratosphere it is the opposite. Media coverage reliably slides between the two.
3. **Implying the problem is over.** It is not. The current hole is not the historical maximum, and a solar-elevation-driven increase in ozone-depleting chlorine chemistry in the coming decades is not fully accounted for by the standard scenarios.

## The part worth saying

Whatever the framing, this is the strongest available demonstration that a coordinated, science-led, treaty-based response to an atmospheric pollutant worked. That is worth more as a precedent than as a climate story, and it deserves to be reported that way.`,
  },
  {
    author: 'kenji_watanabe',
    title: 'Direct Seeding, Then Four Years of Doing Nothing',
    topic: T.SUSTAINABLE,
    image_url: '/posts/renewable.jpg',
    days_ago: 120,
    views: 4_733,
    content: `The intervention that worked best in our last trial was applied once and then left alone for four years, which is an uncomfortable thing to report in a grant cycle.

## The practice

Direct seeding of locally sourced climax species, no nursery, no irrigation, no weeding, no enrichment. Seed is broadcast into the degraded site at the start of the wet season, and the site is fenced against grazing.

That is the entire treatment. Everything else in the trial was a comparison arm.

## Results at year four

- Natural regeneration density in the direct-seeded plots was 3.2x the degraded baseline and statistically indistinguishable from the intact reference forest.
- Species richness reached 71% of reference.
- Cost per hectare was roughly **1/6** of the nursery-based approach we ran in the same district.
- Carbon: not measured to a standard I would defend, so I will not quote a number.

The honest caveat is that it worked on **one soil type in one district**, and direct seeding reliably fails on the clay-rich soils where the water table sits high. Anyone generalising from this to their own site should read the site-selection criteria first.

## Why the four years are the actual finding

The single largest predictor of year-four density was not seed rate, seed provenance, or site preparation. It was **whether the site was left alone**. Every plot we entered during the four years — to re-weed, to top up, to check on progress — did measurably worse.

Supervision was not neutral here. It was an input, and a harmful one, and nobody costed it as a project expense because it was someone walking past.`,
  },
  {
    author: 'marcus_obi',
    title: 'The Village Water Committee Model, and Why It Works Until It Does Not',
    topic: T.WATER,
    image_url: '/posts/water.jpg',
    days_ago: 356,
    views: 6_215,
    content: `Community water management is presented as a solved model. It is a useful model with a specific failure mode, and the failure mode is predictable enough to plan for.

## Why it works

It works because it solves the actual problem, which is not infrastructure. The borehole was the easy part. Keeping the borehole running requires someone local to hold the spare-parts budget, resolve disputes, and turn the pump off on a chemical-contamination advisory. A committee does all of that, and no external mechanism does it as well.

We have 31 committees. 26 are functioning well after five years.

## The five that failed, and the common factor

All five had the same structural property: **the committee had more members than the village could sustain attendance for.** Between nine and fourteen members, in villages of forty to eighty households.

The failure sequence is consistent. Attendance drops. The treasurer and pump attendant — the two roles that actually matter — stop attending because attending is socially costly when the meeting is useless. Decisions that require a quorum stop being made. The pump runs until it fails, and a failing pump in year four is a total loss of the system.

## The design fix

Five to seven members, with the treasurer and pump attendant selected for availability rather than seniority, and an explicit annual election that includes a "you did not attend" list. It is embarrassingly simple and it took us three failed sites to find.

## The broader point

This is a failure of implementation, not of concept. But the concept is often sold without the design constraints, and the resulting failure is then read as evidence against community management. That reading is wrong, and it is expensive — it is the reason some of these villages now have no water and no committee.`,
  },
  {
    author: 'aisha_okafor',
    title: 'Ghost Gear Is Still the Highest-Longevity Threat to Large Fish',
    topic: T.OCEAN,
    image_url: '/posts/ocean.jpg',
    days_ago: 289,
    views: 10_774,
    content: `Bottom-trawling has declined in a lot of places and received all the attention. In our fishery, the larger problem is equipment that is not in the water and is still fishing.

## What we found

Recovering lost gear is a monitoring task, not a fishing one. We contracted fishers to report and retrieve anything they found, paid per item, and logged it. Over two years: **412 nets and traps recovered**, plus an unknowable number that were never seen.

## The longevity point

The reason this matters disproportionately is that lost gear keeps killing for as long as it lasts, and the duration is far longer than anyone assumes. Our recovered gear had a median age of **3.1 years**. Some of the oldest had been down for over a decade.

So one net lost in a single storm can account for several fish-years of mortality. That is not how the problem is framed in fisheries management, where gear loss is a bycatch-accounting line item rather than a delayed-mortality process.

## Which gear persists

We recovered 61% more monofilament nets than expected relative to their share of landings. Monofilament persists, breaks into fragments that stay lethal, and fragments are indistinguishable from live bait to a fish. The biodegradable alternatives break down far faster and, in our retrieval data, are recovered as recognisable objects at a fraction of the rate — meaning they are, at minimum, not longer-lived sources of mortality.

## The recommendation we can defend

Pay for retrieval at the point of recovery, and pay by item rather than by weight. Weight-based bounties systematically undervalue nets, which are the majority of the problem and mostly light.`,
  },
];

/**
 * Comment threads. `parent` is the 0-based index of the comment this one
 * replies to, or null for a top-level comment. Keeping threads small but real
 * exercises the nested-reply rendering and the `parent_id` foreign key.
 */
export const COMMENTS = [
  { post: 0, author: 'elena_vasquez', content: 'The survival-rate framing is the right one. Most restoration reporting in this region quotes hectares planted, which is a measure of effort rather than outcome.', parent: null, days_ago: 400 },
  { post: 0, author: 'marcus_obi', content: 'Which sites did you drop from the programme? Asking because the hydrology sounds similar to somewhere I am working.', parent: 0, days_ago: 396 },
  { post: 0, author: 'kenji_watanabe', content: 'Both are downstream of the shrimp farm, so same story, different farm. The sediment load was the real problem — almost nothing settled.', parent: 1, days_ago: 392 },
  { post: 0, author: 'sara_benali', content: 'Would you publish the site-selection criteria separately? The part where you dropped sites reads as the most useful decision in the whole piece.', parent: 0, days_ago: 388 },

  { post: 1, author: 'marcus_obi', content: 'The decision not to ask volunteers to identify species is, I think, the most important decision in the whole design.', parent: null, days_ago: 30 },
  { post: 1, author: 'aisha_okafor', content: 'It cost us about half the data, honestly. The first two months produced a lot of confident nonsense and we had to build a review queue fast.', parent: 4, days_ago: 28 },
  { post: 1, author: 'elena_vasquez', content: 'Used the same approach for amphibian photo surveys. Untrained identification is actively harmful if you do not filter it — you get plausible wrong answers rather than obvious ones.', parent: 4, days_ago: 25 },

  { post: 2, author: 'priya_raman', content: 'Modelling detection probability is the right call but the community is split on whether reporting a non-significant decline for a fourth species is overselling the uncertainty. I think under-selling is worse.', parent: null, days_ago: 88 },
  { post: 2, author: 'elena_vasquez', content: 'We went back and forth on this. Landed on: a species you cannot distinguish from noise has not been shown to be stable, and saying that is clearer than implying it is fine.', parent: 7, days_ago: 85 },
  { post: 2, author: 'sara_benali', content: 'The last paragraph is the important one. Charisma-driven funding will produce a recovery narrative about species that were never in trouble.', parent: null, days_ago: 80 },

  { post: 3, author: 'marcus_obi', content: 'Reporting both absolute and rate, with an explanation in the caption, is the single most under-used practice in glacier communication.', parent: null, days_ago: 14 },
  { post: 3, author: 'tomas_lindqvist', content: 'We fought about this internally for a year. The fear was that journalists would quote 57 metres and drop the caveat. The answer turned out to be giving them the number with the caveat attached, not withholding it.', parent: 10, days_ago: 12 },
  { post: 3, author: 'aisha_okafor', content: 'Would the 214-year moraine chronology work on a temperate glacier, or is the debris cover too thin for a dust-band signal?', parent: 10, days_ago: 8 },

  { post: 4, author: 'tomas_lindqvist', content: 'This is the same failure mode as the glacier data. A record existed, was public, and the baseline comparison was never computed.', parent: null, days_ago: 55 },
  { post: 4, author: 'priya_raman', content: 'We put a scheduled diff on it in October. It has flagged twice since, both false alarms, but it runs.', parent: 13, days_ago: 50 },

  { post: 5, author: 'kenji_watanabe', content: 'The 41% recharge overestimate is uncomfortably close to what we found in our own district. Going to re-run the check against our baseline this month.', parent: null, days_ago: 140 },
  { post: 5, author: 'marcus_obi', content: "Yes please, and publish it even if it comes out fine. A null result on someone else's model is genuinely useful data.", parent: 15, days_ago: 137 },
  { post: 5, author: 'elena_vasquez', content: 'The socioeconomic framing at the end is the part I wish more hydrology papers included. A failing aquifer is a public health event long before it is a geological one.', parent: 15, days_ago: 130 },

  { post: 6, author: 'kenji_watanabe', content: 'Naming a maintenance body in the funding agreement is such an obvious fix and almost nobody does it. We learned this the expensive way.', parent: null, days_ago: 260 },
  { post: 6, author: 'sara_benali', content: 'The three failure cases are the most useful part of the piece. None of them are wildlife problems, which is precisely the point.', parent: 18, days_ago: 256 },

  { post: 7, author: 'aisha_okafor', content: 'Publishing a negative result on a funded intervention takes a particular kind of institutional confidence.', parent: null, days_ago: 318 },
  { post: 7, author: 'kenji_watanabe', content: 'It nearly did not get published. Worth saying plainly: the funder had committed to the answer before the study started, and that is a design failure, not a reporting failure.', parent: 20, days_ago: 314 },

  { post: 8, author: 'marcus_obi', content: 'State-based rather than area-based management is the correct frame and almost nobody adopts it because it does not have a satisfying hectares number attached.', parent: null, days_ago: 2 },
  { post: 8, author: 'aisha_okafor', content: 'The sensitivity analysis is what makes this usable. A threshold quoted without one is how a management plan ends up confidently wrong by a factor of two.', parent: 22, days_ago: 1 },

  { post: 9, author: 'tomas_lindqvist', content: 'Alternating protocols within the same week is the experimental design I wish more of my field comparisons used.', parent: null, days_ago: 178 },
  { post: 9, author: 'priya_raman', content: 'It costs a fortnight of having two crews in the same field. The alternative is decades of arguing about whose chamber method was better.', parent: 24, days_ago: 174 },

  { post: 10, author: 'elena_vasquez', content: 'The point about budgeting the same money twice is the one I have watched most often. Substitution presented as augmentation.', parent: null, days_ago: 235 },
  { post: 10, author: 'marcus_obi', content: 'Appreciate the directness. Position papers in this sector are usually unfalsifiable by design and I try not to write them.', parent: 26, days_ago: 230 },

  { post: 11, author: 'sara_benali', content: 'Ninety-one percent precision and a nine-month median latency. That asymmetry is the whole finding — you have a working detector attached to a broken process.', parent: null, days_ago: 5 },
  { post: 11, author: 'sara_benali', content: 'Re-reading this. The point about routing household clearing out of the enforcement queue is the one I would emphasise — it is a fix that also reduces harm to the people most affected.', parent: 28, days_ago: 4 },
  { post: 11, author: 'marcus_obi', content: 'Genuinely useful distinction. Conflating subsistence clearing with commercial clearing is a standard route to permanently losing community cooperation.', parent: 29, days_ago: 2 },

  { post: 12, author: 'elena_vasquez', content: 'The effort-metadata point is the one to take away. It is the difference between a dataset you can re-analyse in ten years and one you can only cite.', parent: null, days_ago: 1 },

  { post: 13, author: 'aisha_okafor', content: 'Hoping the reporting lands on the precedent rather than the ozone hole. It is one of very few complete environmental policy success stories and it keeps being filed under "mixed".', parent: null, days_ago: 405 },
  { post: 13, author: 'tomas_lindqvist', content: 'The solar-elevation point is underreported and it is the one that matters for planning beyond 2050.', parent: 32, days_ago: 400 },

  { post: 14, author: 'sara_benali', content: '"Supervision was not neutral here" is the sentence I have been trying to articulate for about four years of work.', parent: null, days_ago: 110 },
  { post: 14, author: 'kenji_watanabe', content: 'It is a general principle and it is not intuitive: every site visit has an opportunity cost, and the opportunity cost is largest where the data are best.', parent: 34, days_ago: 105 },

  { post: 15, author: 'marcus_obi', content: 'The attendance threshold is such a specific finding it might be worth testing against the other committees. Eleven is in our district too, and it is our worst one.', parent: null, days_ago: 345 },
  { post: 15, author: 'sara_benali', content: 'Have you checked whether attendance is causal or just correlated with village size? Larger villages may be more likely to over-committee for unrelated reasons.', parent: 36, days_ago: 340 },
  { post: 15, author: 'marcus_obi', content: 'Fair, that is the obvious confound and I have not controlled for it. It is on the list.', parent: 37, days_ago: 336 },

  { post: 16, author: 'kenji_watanabe', content: 'Retrieval paid by item rather than weight is a small policy change with a large effect. Most schemes are weight-based and therefore structurally biased against nets.', parent: null, days_ago: 280 },
  { post: 16, author: 'aisha_okafor', content: 'The 3.1-year median gear age is the figure I would put in the summary. It reframes one storm event as several fish-years of mortality.', parent: 39, days_ago: 276 },
];

/**
 * Photo sets and video posts.
 *
 * A separate list rather than extra entries in POSTS, because these need
 * `content_type` and asset rows, and keeping them apart means the article seed
 * (which CI and `seed-sql.mjs` both rely on) is unchanged by anything media.
 *
 * `content_type` is what posts.content_type expects: 'photo' or 'video'.
 * `media` becomes rows in public.post_media. Covers reuse the same local files
 * the article posts use, so the seed stays free of binary assets and works
 * offline — CI has no network.
 */
export const MEDIA_POSTS = [
  {
    author: 'kenji_watanabe',
    content_type: 'photo',
    topic: 'Deforestation',
    image_url: '/posts/deforestation.jpg',
    days_ago: 6,
    views: 3180,
    title: 'Four Years of Direct Seeding, Photographed Monthly',
    excerpt:
      'The same twelve plots, photographed from the same fixed point every month since planting. Most of them failed. The sequence is more useful than the summary.',
    content: `Twelve plots, one camera position, one timestamp a month. That is the entire method, and it is deliberately dull: anyone can repeat it, and repeating it is the only way the record means anything four years later.

The honest summary is that most of these did not work. Nine of the twelve are dead or effectively dead. Two are ambiguous. One is doing well, and it is not the site everyone is proud of — it is the one on the worst soil, which is the finding that took us two years to accept.

What the photographs show that a survival table does not: erosion. Site 7 reads as "surviving" in the count and is visibly losing its uphill edge every month. The seedlings are fine. The ground they are standing on is not.

We kept going because of site 11. If the sequence had ended in 2023, when the first count came back at 31%, we would have stopped.`,
    media: [
      { kind: 'image', url: '/posts/deforestation.jpg', alt_text: 'Twelve planting plots on a cleared slope, photographed from a fixed point', position: 0 },
      { kind: 'image', url: '/posts/forest.jpg', alt_text: 'Two-year-old saplings in the surviving plot', position: 1 },
      { kind: 'image', url: '/posts/deforestation.jpg', alt_text: 'Uphill erosion on site 7, visible across four monthly frames', position: 2 },
      { kind: 'image', url: '/posts/forest.jpg', alt_text: 'Site 11 canopy closing, the one plot that worked', position: 3 },
    ],
  },
  {
    author: 'aisha_okafor',
    content_type: 'photo',
    topic: 'Ocean Conservation',
    image_url: '/posts/ocean.jpg',
    days_ago: 11,
    views: 2460,
    title: 'A Tidepool Census in Twelve Photographs',
    excerpt:
      'One quadrat, one low tide, one camera. Twelve frames is not a survey — it is a record of a morning, and that is a different kind of claim.',
    content: `Twelve frames of a single quadrat at the lowest tide of the month. This is not a survey and should not be described as one: it is one location, one morning, and one person who had never done this before.

What it does show is the density problem in a form you cannot argue with. Count the mussels in frame four, then in frame nine. Same rock, same water, three hours. The number roughly halves.

We published it because the photographs are more useful to a school group than a table of counts would be, and because a number anyone can check is worth more than a summary anyone has to trust.`,
    media: [
      { kind: 'image', url: '/posts/ocean.jpg', alt_text: 'A quadrat on a rock shelf at low tide, densely packed with mussels', position: 0 },
      { kind: 'image', url: '/posts/ocean.jpg', alt_text: 'The same quadrat three hours later, visibly thinned', position: 1 },
      { kind: 'image', url: '/posts/pollution.jpg', alt_text: 'Close detail of the mussel bed showing partial mortality', position: 2 },
    ],
  },
  {
    author: 'elena_vasquez',
    content_type: 'video',
    topic: 'Climate Change',
    // A real, public-domain clip so the player has something to load. The seed
    // stays free of binary assets and works with no network at build time.
    image_url: '/posts/climate.jpg',
    video_url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/0/0e/Glacier_retreat.webm/Glacier_retreat.webm.480p.webm',
    video_duration_s: 143,
    days_ago: 4,
    views: 5890,
    title: 'What a Glacier Leaves Behind, in Two and a Half Minutes',
    excerpt:
      'Time-lapse from the same camera position across four seasons, ending on the meltwater channel that was a glacier in 2019.',
    content: `Four seasons from one fixed camera position, ending on the meltwater channel that was a glacier proper as recently as 2019.

We shot this to make one point: the retreat is not an abstraction. What looks like a slow recession in a graph is, from a fixed vantage point, a landscape being rearranged — moraine, then bare rock, then a channel, then a lake.

The clip runs long enough to show the part people find difficult, which is the end. There is no version of this where the last thirty seconds are comfortable, and that is the correct ending for the piece.`,
    media: [
      { kind: 'video', url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/0/0e/Glacier_retreat.webm/Glacier_retreat.webm.480p.webm', position: 0, durationSeconds: 143, posterUrl: '/posts/climate.jpg' },
    ],
  },
  {
    author: 'marcus_obi',
    content_type: 'photo',
    topic: 'Water Resources',
    image_url: '/posts/water.jpg',
    days_ago: 19,
    views: 1940,
    title: 'The Village Well, Photographed Across One Dry Season',
    excerpt:
      'Eleven frames of a single wellhead through a dry season, with the water level marked on the wall so the reader can see it fall.',
    content: `A wellhead, a painted mark, and a camera that was supposed to run weekly and mostly did.

The painted line is the point. Anyone can measure a water level against a reference, and a photograph with a mark on the wall lets a reader check our reading rather than take it on trust.

Eleven frames over one season. The level falls, and the fall is not linear — there is a step in it around week seven that we still cannot explain.`,
    media: [
      { kind: 'image', url: '/posts/water.jpg', alt_text: 'A village wellhead with a painted reference mark on the wall', position: 0 },
      { kind: 'image', url: '/posts/water.jpg', alt_text: 'The same wellhead in late season, water level visibly below the mark', position: 1 },
    ],
  },
  {
    author: 'priya_raman',
    content_type: 'video',
    topic: 'Pollution',
    image_url: '/posts/pollution.jpg',
    video_url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c8/Plastic_pollution_in_the_ocean.webm/Plastic_pollution_in_the_ocean.webm.480p.webm',
    video_duration_s: 96,
    days_ago: 9,
    views: 4210,
    title: 'Ninety Seconds of a River Mouth, Unedited',
    excerpt:
      'One fixed camera at a river mouth, uncut, so the waste entering the sea is the only thing in frame.',
    content: `Ninety-six seconds, one camera, no cuts, nothing else in frame. We resisted the urge to add a title card and a soundtrack.

The reason for publishing it unedited is that edited versions of this footage invariably compress the timeline, and the timeline is the finding. A viewer who has seen a thirty-second cut concludes the problem is a constant rain of plastic. Ninety-six seconds shows it arriving in pulses, which is a different problem with a different set of solutions.

Somebody will ask why we did not film for longer. The answer is that we have, and ninety-six seconds is the shortest clip that still shows the pulse structure.`,
    media: [
      { kind: 'video', url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c8/Plastic_pollution_in_the_ocean.webm/Plastic_pollution_in_the_ocean.webm.480p.webm', position: 0, durationSeconds: 96, posterUrl: '/posts/pollution.jpg' },
    ],
  },
  {
    author: 'tomas_lindqvist',
    content_type: 'photo',
    topic: 'Wildlife Conservation',
    image_url: '/posts/wildlife.jpg',
    days_ago: 27,
    views: 3760,
    title: 'Three Cameras, Six Months, One Corridor',
    excerpt:
      'A wildlife corridor photographed from three fixed points. The animals are mostly not in the frames, which is itself the finding.',
    content: `Three cameras, six months, one corridor. We expected wildlife. What the frames mostly contain is people, livestock and weather.

The corridor works, in the sense that it is being used — 214 trigger events, and about 40 of them are the species the corridor was built for. But the use is almost entirely at night, and almost entirely by domestic animals.

So the photographs are a disappointment, and we are publishing them because a corridor that is used by goats is not a corridor. That is a finding, and nobody is going to commission more camera work on the strength of a press release.`,
    media: [
      { kind: 'image', url: '/posts/wildlife.jpg', alt_text: 'A camera trap frame showing a corridor used mainly by livestock', position: 0 },
      { kind: 'image', url: '/posts/forest.jpg', alt_text: 'The corridor edge where canopy planting meets open grazing land', position: 1 },
      { kind: 'image', url: '/posts/wildlife.jpg', alt_text: 'A rare target-species frame from the third month', position: 2 },
      { kind: 'image', url: '/posts/forest.jpg', alt_text: 'Fence line along the corridor, removed in month five', position: 3 },
    ],
  },
  {
    author: 'sara_benali',
    content_type: 'photo',
    topic: 'Sustainable Living',
    image_url: '/posts/sustainable.jpg',
    days_ago: 34,
    views: 1620,
    title: 'A Repair Workshop, Photographed in the Order It Broke',
    excerpt:
      'Nine frames of a repair workshop, sequenced by what came in rather than by what looked best.',
    content: `Nine frames, sequenced by the order things arrived rather than by what photographs well. The toaster is frame three and the sewing machine is frame eight, and nobody is going to enjoy frame eight.

The sequencing is the argument. A photo essay about repair usually shows a finished table lamp, which is a picture of an outcome. Arranged by intake, it is a picture of a queue: what a town actually brings to a repair workshop, in the order it arrives.

Two of the nine were not repairable. We left them in.`,
    media: [
      { kind: 'image', url: '/posts/sustainable.jpg', alt_text: 'A workbench with a queue of items waiting to be repaired', position: 0 },
      { kind: 'image', url: '/posts/sustainable.jpg', alt_text: 'A toaster opened on the bench, third item of the day', position: 1 },
      { kind: 'image', url: '/posts/sustainable.jpg', alt_text: 'A sewing machine, eighth item, not repairable', position: 2 },
    ],
  },
  {
    author: 'kenji_watanabe',
    content_type: 'video',
    topic: 'Sustainable Living',
    image_url: '/posts/renewable.jpg',
    video_url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/8/8c/Solar_panels_in_the_desert.webm/Solar_panels_in_the_desert.webm.480p.webm',
    video_duration_s: 118,
    days_ago: 15,
    views: 2870,
    title: 'What a Microgrid Does When the Grid Leaves',
    excerpt:
      'A clinic microgrid running for eleven days without grid connection, filmed to a fixed schedule rather than to the outages.',
    content: `Eleven days, filmed on a fixed schedule rather than to the outages — which is the methodologically interesting part, and the reason the clip is longer than the story.

Filming to the outage gives you dramatic footage of the moment the power goes. It tells you nothing about the rest. On a fixed schedule you get the boring majority, and the boring majority is where the equipment actually fails.

The clinic kept every service running for all eleven days. The one exception is the vaccine fridge, which lost temperature twice, and that is on the record in the clip rather than edited out of it.`,
    media: [
      { kind: 'video', url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/8/8c/Solar_panels_in_the_desert.webm/Solar_panels_in_the_desert.webm.480p.webm', position: 0, durationSeconds: 118, posterUrl: '/posts/renewable.jpg' },
    ],
  },
];

/** Normalized action types — must match the post_interactions check constraint. */
export const ACTION_TYPES = ['read', 'bookmark', 'comment', 'upvote'];

/**
 * Builds a deterministic pseudo-random generator (mulberry32) seeded from a
 * string. Keeps the "random" parts of the seed stable across runs so the seeder
 * is reproducible and diffable.
 */
export function makeRng(seed) {
  let a = 0;
  for (let i = 0; i < seed.length; i += 1) {
    a = (a * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Must match posts_slug_format: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ */
export function slugify(title) {
  return String(title)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

/** Derives a plain-text excerpt from markdown, mirroring CreatePostForm. */
export function deriveExcerpt(markdown, maxLength = 200) {
  const plain = String(markdown)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > maxLength ? `${plain.slice(0, maxLength).trimEnd()}…` : plain;
}

/** ISO timestamp for a post that was published `days_ago` days before now. */
export function daysAgoToIso(daysAgo, base = Date.now()) {
  return new Date(base - daysAgo * 86_400_000).toISOString();
}

// The vector helpers live in the app so the runtime and the seeder cannot drift
// apart. Re-exported here because `seed-sql.mjs` and the database rehearsal in
// CI import them from this module, and they must stay dependency-free: CI has
// no model download and no network, so the deterministic hash is the only
// encoder available there.
export { EMBEDDING_DIM, deriveEmbedding, toVectorLiteral } from '../src/app/lib/embedding-hash.mjs';
