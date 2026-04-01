export const PACKAGE_CATALOG = {
  starter: [
    'crm.contacts',
    'crm.opportunities',
    'crm.tasks',
  ],
  growth: [
    'crm.contacts',
    'crm.opportunities',
    'crm.tasks',
    'inbox.core',
    'automation.core',
    'calendar.core',
  ],
  scale: [
    'crm.contacts',
    'crm.opportunities',
    'crm.tasks',
    'inbox.core',
    'automation.core',
    'calendar.core',
    'ads.google',
    'analytics.google',
    'proposals.core',
    'reputation.core',
  ],
} as const;

export type PackageCode = keyof typeof PACKAGE_CATALOG;

export const PACKAGE_CODES: PackageCode[] = ['starter', 'growth', 'scale'];

export function isValidPackageCode(code: string): code is PackageCode {
  return code in PACKAGE_CATALOG;
}

export function featuresForPackage(code: PackageCode): string[] {
  return [...PACKAGE_CATALOG[code]];
}
