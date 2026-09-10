import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getApplication, listApplications } from '../../api/appmetrica.js'
import {
    APPMETRICA_DIMENSIONS,
    APPMETRICA_METRICS,
    APPMETRICA_NAMESPACES,
    APPMETRICA_NOTES,
} from '../../api/appmetricaCatalog.js'
import { runBytime, runDrilldown, runReport } from '../../api/reporting.js'
import { resolveAppId, type ToolContext } from '../context.js'
import {
    appmetricaErrorResult,
    formatBytimeResponse,
    formatDataResponse,
    formatDrilldownResponse,
    toToolResult,
} from '../format.js'
import {
    appmetricaDescribeAppInputShape,
    appmetricaDrilldownInputShape,
    appmetricaReportInputShape,
    appmetricaTimeseriesInputShape,
} from './appmetricaShared.js'

/**
 * MCP tools for AppMetrica (mobile app analytics) — a separate Yandex product
 * from Metrica, on its own API host and OAuth scope. The Reporting endpoints
 * mirror Metrica's exactly, so these reuse `api/reporting.ts` and the shared
 * formatters, pointing them at `ctx.appmetricaClient`.
 */

const DEFAULT_DATE1 = '7daysAgo'
const DEFAULT_DATE2 = 'yesterday'

export function registerAppmetricaListApps(
    server: McpServer,
    ctx: ToolContext,
): void {
    server.registerTool(
        'appmetrica_list_apps',
        {
            title: 'List AppMetrica apps',
            description:
                'List the AppMetrica applications your token can read, with their ids, owner and timezone. ' +
                'AppMetrica covers MOBILE APPS and is separate from Yandex Metrica web counters — use this to ' +
                'find an appId for the other appmetrica_* tools. API keys are never returned. Read-only.',
            inputSchema: {},
            annotations: {
                title: 'List AppMetrica apps',
                readOnlyHint: true,
                openWorldHint: true,
            },
        },
        async () => {
            try {
                const apps = await listApplications(ctx.appmetricaClient)
                return toToolResult({
                    apps: apps.map(a => ({
                        id: a.id,
                        name: a.name ?? null,
                        owner_login: a.owner_login ?? null,
                        permission: a.permission ?? null,
                        time_zone_name: a.time_zone_name ?? null,
                        create_date: a.create_date ?? null,
                    })),
                    count: apps.length,
                    note:
                        apps.length === 0
                            ? 'No AppMetrica apps are visible to this token. If you expected some, check that the token was ' +
                              'issued with the appmetrica:read scope and that this Yandex account has access to the app.'
                            : 'Pass one of these ids as `appId` to appmetrica_run_report / _timeseries / _drilldown.',
                })
            } catch (err) {
                return appmetricaErrorResult(err)
            }
        },
    )
}

export function registerAppmetricaGetMetadata(
    server: McpServer,
    ctx: ToolContext,
): void {
    server.registerTool(
        'appmetrica_get_metadata',
        {
            title: 'Get AppMetrica metadata',
            description:
                'Discovery tool for AppMetrica: lists your apps plus a curated catalog of common metric and ' +
                'dimension ids and the namespace rules. AppMetrica publishes no metadata endpoint, so the catalog ' +
                'is a documented subset, not exhaustive. Call before appmetrica_run_report. Read-only.',
            inputSchema: {},
            annotations: {
                title: 'Get AppMetrica metadata',
                readOnlyHint: true,
                openWorldHint: true,
            },
        },
        async () => {
            try {
                const apps = await listApplications(ctx.appmetricaClient)
                return toToolResult({
                    apps: apps.map(a => ({
                        id: a.id,
                        name: a.name ?? null,
                        time_zone_name: a.time_zone_name ?? null,
                    })),
                    catalog: {
                        namespaces: APPMETRICA_NAMESPACES,
                        metrics: APPMETRICA_METRICS,
                        dimensions: APPMETRICA_DIMENSIONS,
                        notes: APPMETRICA_NOTES,
                    },
                })
            } catch (err) {
                return appmetricaErrorResult(err)
            }
        },
    )
}

export function registerAppmetricaDescribeApp(
    server: McpServer,
    ctx: ToolContext,
): void {
    server.registerTool(
        'appmetrica_describe_app',
        {
            title: 'Describe an AppMetrica app',
            description:
                "Read one AppMetrica application's settings: name, bundle id, timezone, category, access level " +
                'and creation date. API keys and import tokens are stripped. Read-only.',
            inputSchema: appmetricaDescribeAppInputShape,
            annotations: {
                title: 'Describe an AppMetrica app',
                readOnlyHint: true,
                openWorldHint: true,
            },
        },
        async args => {
            try {
                const appId = resolveAppId(args.appId, ctx.config)
                const app = await getApplication(ctx.appmetricaClient, appId)
                return toToolResult({ app })
            } catch (err) {
                return appmetricaErrorResult(err)
            }
        },
    )
}

export function registerAppmetricaRunReport(
    server: McpServer,
    ctx: ToolContext,
): void {
    server.registerTool(
        'appmetrica_run_report',
        {
            title: 'Run AppMetrica report',
            description:
                'Query an AppMetrica table report (/stat/v1/data): metrics grouped by dimensions over a date ' +
                'range, for a mobile app. Use appmetrica_get_metadata first for valid ids. All ids in one call ' +
                'must share a namespace prefix. Read-only.',
            inputSchema: appmetricaReportInputShape,
            annotations: {
                title: 'Run AppMetrica report',
                readOnlyHint: true,
                openWorldHint: true,
            },
        },
        async args => {
            try {
                const appId = resolveAppId(args.appId, ctx.config)
                const resp = await runReport(ctx.appmetricaClient, {
                    ids: appId,
                    metrics: args.metrics,
                    dimensions: args.dimensions,
                    date1: args.date1 ?? DEFAULT_DATE1,
                    date2: args.date2 ?? DEFAULT_DATE2,
                    filters: args.filters,
                    sort: args.sort,
                    limit: args.limit ?? ctx.config.defaultRowLimit,
                    offset: args.offset,
                    accuracy: args.accuracy,
                    timezone: args.timezone,
                    includeUndefined: args.includeUndefined,
                })
                return toToolResult(
                    formatDataResponse(
                        resp,
                        args.dimensions ?? [],
                        args.metrics,
                        args.fullResponse ?? false,
                        args.offset ?? 1,
                    ),
                )
            } catch (err) {
                return appmetricaErrorResult(err)
            }
        },
    )
}

export function registerAppmetricaRunTimeseries(
    server: McpServer,
    ctx: ToolContext,
): void {
    server.registerTool(
        'appmetrica_run_timeseries',
        {
            title: 'Run AppMetrica time series',
            description:
                'Query AppMetrica metrics split into a time series (/stat/v1/data/bytime) for trends over ' +
                'days/weeks/months. Read-only.',
            inputSchema: appmetricaTimeseriesInputShape,
            annotations: {
                title: 'Run AppMetrica time series',
                readOnlyHint: true,
                openWorldHint: true,
            },
        },
        async args => {
            try {
                const appId = resolveAppId(args.appId, ctx.config)
                const resp = await runBytime(ctx.appmetricaClient, {
                    ids: appId,
                    metrics: args.metrics,
                    dimensions: args.dimensions,
                    date1: args.date1 ?? DEFAULT_DATE1,
                    date2: args.date2 ?? DEFAULT_DATE2,
                    group: args.group,
                    filters: args.filters,
                    accuracy: args.accuracy,
                    timezone: args.timezone,
                    topKeys: args.topKeys,
                    includeUndefined: args.includeUndefined,
                })
                return toToolResult(
                    formatBytimeResponse(
                        resp,
                        args.dimensions ?? [],
                        args.metrics,
                        args.group ?? 'day',
                        args.fullResponse ?? false,
                    ),
                )
            } catch (err) {
                return appmetricaErrorResult(err)
            }
        },
    )
}

export function registerAppmetricaRunDrilldown(
    server: McpServer,
    ctx: ToolContext,
): void {
    server.registerTool(
        'appmetrica_run_drilldown',
        {
            title: 'Drill down an AppMetrica report',
            description:
                'Drill through an AppMetrica dimension tree (/stat/v1/data/drilldown): call without parentId ' +
                'for the top level, then pass the returned keys to expand a branch. Read-only.',
            inputSchema: appmetricaDrilldownInputShape,
            annotations: {
                title: 'Drill down an AppMetrica report',
                readOnlyHint: true,
                openWorldHint: true,
            },
        },
        async args => {
            try {
                const appId = resolveAppId(args.appId, ctx.config)
                const resp = await runDrilldown(ctx.appmetricaClient, {
                    ids: appId,
                    metrics: args.metrics,
                    dimensions: args.dimensions,
                    date1: args.date1 ?? DEFAULT_DATE1,
                    date2: args.date2 ?? DEFAULT_DATE2,
                    filters: args.filters,
                    sort: args.sort,
                    limit: args.limit ?? ctx.config.defaultRowLimit,
                    offset: args.offset,
                    accuracy: args.accuracy,
                    timezone: args.timezone,
                    includeUndefined: args.includeUndefined,
                    parentId: args.parentId,
                })
                return toToolResult(
                    formatDrilldownResponse(
                        resp,
                        args.metrics,
                        args.fullResponse ?? false,
                        args.offset ?? 1,
                    ),
                )
            } catch (err) {
                return appmetricaErrorResult(err)
            }
        },
    )
}
