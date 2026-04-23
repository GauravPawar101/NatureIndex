import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'hi'],
  defaultLocale: 'en',
  // Keep paths stable until locale-prefixed routes are introduced.
  localePrefix: 'never',
});
