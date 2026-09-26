/**
 * The canonical topic list offered when publishing.
 *
 * The blog index does *not* use this: it derives its filter pills from the
 * topics actually present in the database, so a topic that stops being used
 * disappears from the filters instead of leading to an empty result set. This
 * list is the input side only.
 */
export const POST_TOPICS = [
    'Climate Change',
    'Wildlife Conservation',
    'Renewable Energy',
    'Pollution',
    'Sustainable Living',
    'Deforestation',
    'Ocean Conservation',
    'Water Resources',
];
