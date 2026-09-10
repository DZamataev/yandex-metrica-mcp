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
    { prefix: 'ym:cr:', title: 'Crashes' },
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

/** Crash metrics (`ym:cr:`). Probed live against the API. */
export const APPMETRICA_CRASH_METRICS: readonly CatalogEntry[] = [
    { id: 'ym:cr:crashes', title: 'Crashes' },
    { id: 'ym:cr:crashDevices', title: 'Devices that crashed' },
    { id: 'ym:cr:users', title: 'Users affected by crashes' },
]

/** Crash dimensions (`ym:cr:`). Probed live against the API. */
export const APPMETRICA_CRASH_DIMENSIONS: readonly CatalogEntry[] = [
    {
        id: 'ym:cr:crashGroupName',
        title: 'Crash group — exception class + source location',
    },
    {
        id: 'ym:cr:operatingSystemInfo',
        title: 'OS (filter values are lowercase: android, ios)',
    },
    { id: 'ym:cr:operatingSystemVersion', title: 'OS version' },
    { id: 'ym:cr:appVersion', title: 'App version' },
    { id: 'ym:cr:appVersionAndOS', title: 'App version + OS' },
    { id: 'ym:cr:buildNumber', title: 'Build number' },
    { id: 'ym:cr:mobileDeviceBranding', title: 'Device manufacturer' },
    { id: 'ym:cr:mobileDeviceModel', title: 'Device model' },
    { id: 'ym:cr:deviceType', title: 'Device type (Smartphones, Tablets, …)' },
    { id: 'ym:cr:regionCountry', title: 'Country' },
    { id: 'ym:cr:regionCity', title: 'City' },
]

/** Guidance handed to the model alongside the catalog. */
export const APPMETRICA_NOTES: readonly string[] = [
    'AppMetrica is a SEPARATE product from Yandex Metrica: it reports on mobile apps (appId), not web counters (counterId). Do not mix their ids or field namespaces.',
    'A single request must not mix namespace prefixes (ym:ge:, ym:ce:, ym:cr:, ym:i:, ym:c:, ym:s:). Only the `filters` parameter may reference another prefix.',
    'This catalog is a curated subset, not the full list — AppMetrica has no metadata API. Unknown ids fail with 4001 (dimension) or 4002 (metric).',
    'To get an exact request for a report you can already see, use Export → "Copy table API request" in the AppMetrica UI and pass those ids here.',
    'Dates accept YYYY-MM-DD or relative forms like 7daysAgo / yesterday / today.',
    // Crash-specific guidance. The naming does not follow the ym:ge: namespace,
    // and guessing costs a failed round-trip, so spell it out.
    'Crashes: use the ym:cr: namespace, NOT ym:ge:. Top crashes = metrics ["ym:cr:crashes"] grouped by ["ym:cr:crashGroupName"], sorted ["-ym:cr:crashes"].',
    'Crash field names that do NOT exist (the API rejects them): ym:cr:crashName, ym:cr:osName, ym:cr:osVersionInfo, ym:cr:crashGroupId, ym:cr:errors, ym:cr:anrs, ym:cr:crashFreeUsers. Use crashGroupName, operatingSystemInfo and operatingSystemVersion instead.',
    "Filter by platform with ym:cr:operatingSystemInfo=='android' or =='ios' — the VALUES are lowercase, while the dimension renders them as \"Android\"/\"iOS\".",
    'There is no crash-free-rate metric. Compute it yourself: 1 - (ym:cr:users over the period ÷ ym:ge:users over the same period, same platform filter).',
    'Compare crash counts across app versions only alongside each version\'s active users (ym:ge:users grouped by ym:ge:appVersion) — a freshly rolled-out version always shows few crashes simply because few people run it.',
]
