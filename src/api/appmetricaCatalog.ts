/**
 * A small, curated catalog of AppMetrica Reporting API ids.
 *
 * AppMetrica publishes NO metadata endpoint, so this list cannot be fetched at
 * runtime and is deliberately conservative: every id below is taken from the
 * official docs. It is NOT exhaustive — unknown ids fail with a 4001
 * (dimension) or 4002 (metric) error, so prefer these unless the user supplies
 * an id from the AppMetrica UI's "Copy table API request" export.
 */

export interface CatalogEntry {
    readonly id: string
    readonly title: string
}

/**
 * Namespace prefixes. A single request must not mix them (the API rejects it);
 * only `filters` may reference a different prefix than the request.
 */
export const APPMETRICA_NAMESPACES = [
    { prefix: 'ym:ge:', title: 'General events — any in-app activity' },
    { prefix: 'ym:ce:', title: 'Custom events you send from the app' },
    { prefix: 'ym:i:', title: 'Installs (tracking reports)' },
    { prefix: 'ym:c:', title: 'Clicks (tracking reports)' },
    { prefix: 'ym:s:', title: 'Session dimensions' },
] as const

/** General-event metrics (`ym:ge:`). */
export const APPMETRICA_METRICS: readonly CatalogEntry[] = [
    { id: 'ym:ge:users', title: 'Unique users' },
    { id: 'ym:ge:sessions', title: 'Sessions' },
    { id: 'ym:ge:devices', title: 'Devices' },
]

/** General-event dimensions (`ym:ge:`). */
export const APPMETRICA_DIMENSIONS: readonly CatalogEntry[] = [
    // App / build
    { id: 'ym:ge:appID', title: 'App id' },
    { id: 'ym:ge:appVersion', title: 'App version' },
    { id: 'ym:ge:appVersionAndOS', title: 'App version + OS' },
    { id: 'ym:ge:buildNumber', title: 'Build number' },
    // Device / OS
    { id: 'ym:ge:operatingSystemVersion', title: 'OS version' },
    { id: 'ym:ge:mobileDeviceBranding', title: 'Device manufacturer' },
    { id: 'ym:ge:mobileDeviceModel', title: 'Device model' },
    // Geography
    { id: 'ym:ge:regionCountry', title: 'Country' },
    { id: 'ym:ge:region', title: 'Region' },
    { id: 'ym:ge:regionArea', title: 'Region area' },
    { id: 'ym:ge:regionCity', title: 'City' },
]

/** Guidance handed to the model alongside the catalog. */
export const APPMETRICA_NOTES: readonly string[] = [
    'AppMetrica is a SEPARATE product from Yandex Metrica: it reports on mobile apps (appId), not web counters (counterId). Do not mix their ids or field namespaces.',
    'A single request must not mix namespace prefixes (ym:ge:, ym:ce:, ym:i:, ym:c:, ym:s:). Only the `filters` parameter may reference another prefix.',
    'This catalog is a curated subset, not the full list — AppMetrica has no metadata API. Unknown ids fail with 4001 (dimension) or 4002 (metric).',
    'To get an exact request for a report you can already see, use Export → "Copy table API request" in the AppMetrica UI and pass those ids here.',
    'Dates accept YYYY-MM-DD or relative forms like 7daysAgo / yesterday / today.',
]
