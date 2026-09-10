import { z } from 'zod'

/**
 * Input shapes for the AppMetrica tools. Kept separate from the Metrica shapes
 * in `shared.ts` so the two products' ids and namespaces never blur together:
 * AppMetrica groups by `appId` and uses the `ym:ge:`/`ym:ce:` namespaces, while
 * Metrica uses `counterId` and `ym:s:`/`ym:pv:`.
 */

const appId = z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
        'AppMetrica application id (NOT a Metrica counter id). Optional if YANDEX_APPMETRICA_APP_ID is configured. ' +
            'List available apps with appmetrica_list_apps.',
    )

const metrics = z
    .array(z.string())
    .min(1)
    .max(20)
    .describe(
        'AppMetrica metric ids, e.g. ["ym:ge:users","ym:ge:sessions"]. Max 20. ' +
            'All ids in one call must share a namespace prefix (ym:ge:, ym:ce:, ym:i:, ym:c:, ym:s:). ' +
            'Discover ids with appmetrica_get_metadata.',
    )

const dimensions = z
    .array(z.string())
    .max(10)
    .optional()
    .describe(
        'Dimension ids to group by, e.g. ["ym:ge:regionCountry"]. Max 10. ' +
            'Must share the same namespace prefix as the metrics.',
    )

const filters = z
    .string()
    .optional()
    .describe(
        "Filter expression in AppMetrica syntax, e.g. ym:ge:regionCountry=='RU'. " +
            'This is the only place a different namespace prefix may appear.',
    )

const sort = z
    .array(z.string())
    .optional()
    .describe(
        'Sort fields; prefix with "-" for descending, e.g. ["-ym:ge:users"].',
    )

const limit = z
    .number()
    .int()
    .positive()
    .max(100000)
    .optional()
    .describe(
        'Rows per page (max 100000). Defaults to a small value to protect context.',
    )

const offset = z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
        '1-based index of the first row to return, for pagination. Default 1.',
    )

const accuracy = z
    .string()
    .refine(
        v =>
            ['low', 'medium', 'high', 'full'].includes(v) ||
            (/^\d*\.?\d+$/.test(v) && Number(v) >= 0 && Number(v) <= 1),
        {
            message:
                'accuracy must be one of low|medium|high|full, or a number between 0 and 1',
        },
    )
    .optional()
    .describe(
        'Sampling accuracy: low | medium | high | full, or a 0..1 share. Use "full" for exact data.',
    )

const timezone = z
    .string()
    .optional()
    .describe(
        'Timezone offset as ±hh:mm, e.g. "+03:00". Defaults to the app timezone.',
    )

const includeUndefined = z
    .boolean()
    .optional()
    .describe(
        'Include rows where the first dimension value is undefined ("Not set"). Default false.',
    )

const fullResponse = z
    .boolean()
    .optional()
    .describe(
        'If true, include all dimension sub-fields. Default false: only the dimension name and metric ' +
            'values are returned, to save context.',
    )

const date = (which: string) =>
    z
        .string()
        .optional()
        .describe(
            `${which} as YYYY-MM-DD or relative (today, yesterday, NdaysAgo).`,
        )

/** Input shape for appmetrica_run_report. */
export const appmetricaReportInputShape = {
    appId,
    metrics,
    dimensions,
    date1: date('Start date'),
    date2: date('End date'),
    filters,
    sort,
    limit,
    offset,
    accuracy,
    timezone,
    includeUndefined,
    fullResponse,
}

/** Input shape for appmetrica_run_drilldown (report + parentId). */
export const appmetricaDrilldownInputShape = {
    ...appmetricaReportInputShape,
    parentId: z
        .array(z.string())
        .optional()
        .describe(
            'Path from the tree root as a list of dimension keys. Omit for the top level.',
        ),
}

/** Interval granularities accepted by the AppMetrica bytime endpoint. */
export const APPMETRICA_TIMESERIES_GROUPS = [
    'all',
    'auto',
    'hour',
    'day',
    'week',
    'month',
    'quarter',
    'year',
] as const

/** Input shape for appmetrica_run_timeseries. */
export const appmetricaTimeseriesInputShape = {
    appId,
    metrics,
    dimensions,
    date1: date('Start date'),
    date2: date('End date'),
    group: z
        .enum(APPMETRICA_TIMESERIES_GROUPS)
        .optional()
        .describe('Time interval granularity. Default day.'),
    filters,
    accuracy,
    timezone,
    includeUndefined,
    topKeys: z
        .number()
        .int()
        .positive()
        .max(30)
        .optional()
        .describe('Max number of dimension rows to chart (max 30). Default 7.'),
    fullResponse,
}

/** Input shape for appmetrica_describe_app. */
export const appmetricaDescribeAppInputShape = {
    appId,
}
