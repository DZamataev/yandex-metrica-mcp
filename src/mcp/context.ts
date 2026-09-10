import type { YandexClient } from '@boxlab/yandex-mcp-core'
import type { Config } from '../config.js'

/**
 * Everything a tool handler needs: the API clients and config.
 *
 * `client` talks to Yandex Metrica (web counters); `appmetricaClient` talks to
 * AppMetrica (mobile apps) — a separate product on a separate host. They share
 * the same token but differ in base URL, so the Reporting API helpers work
 * against either one.
 */
export interface ToolContext {
    client: YandexClient
    appmetricaClient: YandexClient
    config: Config
}

/**
 * Resolve the counter id from a tool argument, falling back to the configured
 * default. Throws a clear, actionable error when neither is available.
 */
export function resolveCounterId(
    counterId: number | undefined,
    config: Config,
): number {
    const resolved = counterId ?? config.defaultCounterId
    if (resolved === undefined) {
        throw new Error(
            'No counter id provided. Pass `counterId`, or set YANDEX_METRIKA_COUNTER_ID to use a default. ' +
                'Call `get_metadata` to list the counters available to your token.',
        )
    }
    return resolved
}

/**
 * Resolve the AppMetrica app id from a tool argument, falling back to the
 * configured default. Throws a clear, actionable error when neither is set.
 */
export function resolveAppId(
    appId: number | undefined,
    config: Config,
): number {
    const resolved = appId ?? config.defaultAppId
    if (resolved === undefined) {
        throw new Error(
            'No AppMetrica app id provided. Pass `appId`, or set YANDEX_APPMETRICA_APP_ID to use a default. ' +
                'Call `appmetrica_list_apps` to list the apps available to your token.',
        )
    }
    return resolved
}
