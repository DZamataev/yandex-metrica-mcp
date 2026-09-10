import { YandexApiError, YandexClient } from '@boxlab/yandex-mcp-core'
import { describe, expect, test } from 'bun:test'
import {
    getApplication,
    listApplications,
    sanitizeApplication,
} from '../src/api/appmetrica.js'
import { loadConfig } from '../src/config.js'
import { resolveAppId } from '../src/mcp/context.js'
import { appmetricaErrorResult } from '../src/mcp/format.js'

const clientWith = (fetchImpl: unknown) =>
    new YandexClient({
        baseUrl: 'https://api.appmetrica.yandex.com',
        getToken: async () => 'tok',
        userAgent: 'test/1.0',
        maxConcurrency: 3,
        requestTimeoutMs: 1000,
        fetchImpl: fetchImpl as typeof fetch,
        sleep: async () => {},
    })

const jsonResponse = (body: unknown) =>
    new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    })

describe('appmetrica: credential stripping', () => {
    // api_key128 / import_token are write credentials for the app. They must
    // never reach the model's context.
    test('sanitizeApplication keeps only allowlisted fields', () => {
        // Field set observed live from /management/v1/applications.
        const raw = {
            id: 42,
            name: 'App',
            owner_login: 'someone@example.com',
            permission: 'own',
            time_zone_name: 'Europe/Moscow',
            bundle_id: 'com.example.app',
            // Credentials — must never surface.
            api_key128: 'SECRET-API-KEY',
            import_token: 'SECRET-IMPORT-TOKEN',
            post_api_key: 'SECRET-POST-KEY',
            // Org-internal identifiers — not the model's business.
            team_id: 'SECRET-TEAM-ID',
            organization_id: 474154,
            uid: 1666715417,
            // Unknown future field: an allowlist must drop it by default.
            some_future_secret: 'SECRET-FUTURE',
        }
        const clean = sanitizeApplication(raw) as Record<string, unknown>

        expect(clean.id).toBe(42)
        expect(clean.name).toBe('App')
        expect(clean.bundle_id).toBe('com.example.app')
        expect(clean.api_key128).toBeUndefined()
        expect(clean.import_token).toBeUndefined()
        expect(clean.post_api_key).toBeUndefined()
        expect(clean.team_id).toBeUndefined()
        expect(clean.organization_id).toBeUndefined()
        expect(clean.uid).toBeUndefined()
        expect(clean.some_future_secret).toBeUndefined()
        expect(JSON.stringify(clean)).not.toContain('SECRET')
    })

    test('listApplications strips credentials from every app', async () => {
        const client = clientWith(async () =>
            jsonResponse({
                applications: [
                    { id: 1, name: 'A', api_key128: 'LEAK-1' },
                    { id: 2, name: 'B', import_token: 'LEAK-2' },
                ],
            }),
        )
        const apps = await listApplications(client)
        expect(apps.map(a => a.id)).toEqual([1, 2])
        expect(JSON.stringify(apps)).not.toContain('LEAK')
    })

    test('getApplication strips credentials', async () => {
        const client = clientWith(async () =>
            jsonResponse({
                application: {
                    id: 7,
                    name: 'Solo',
                    api_key128: 'LEAK-3',
                    time_zone_name: 'Europe/Moscow',
                },
            }),
        )
        const app = await getApplication(client, 7)
        expect(app.id).toBe(7)
        expect(app.time_zone_name).toBe('Europe/Moscow')
        expect(JSON.stringify(app)).not.toContain('LEAK')
    })
})

describe('appmetrica: requests target the AppMetrica host', () => {
    test('listApplications calls /management/v1/applications', async () => {
        let seen = ''
        const client = clientWith(async (input: unknown) => {
            seen = String(input)
            return jsonResponse({ applications: [] })
        })
        await listApplications(client)
        expect(seen).toContain('https://api.appmetrica.yandex.com')
        expect(seen).toContain('/management/v1/applications')
        // Must NOT hit the Metrica host or its counters entity.
        expect(seen).not.toContain('api-metrika.yandex.net')
        expect(seen).not.toContain('counters')
    })

    test('getApplication targets the single-app endpoint', async () => {
        let seen = ''
        const client = clientWith(async (input: unknown) => {
            seen = String(input)
            return jsonResponse({ application: { id: 6324613 } })
        })
        await getApplication(client, 6324613)
        expect(seen).toContain('/management/v1/application/6324613')
    })
})

describe('appmetrica: app id resolution', () => {
    test('prefers the explicit argument', () => {
        const config = loadConfig({ YANDEX_APPMETRICA_APP_ID: '111' })
        expect(resolveAppId(222, config)).toBe(222)
    })

    test('falls back to the configured default', () => {
        const config = loadConfig({ YANDEX_APPMETRICA_APP_ID: '111' })
        expect(resolveAppId(undefined, config)).toBe(111)
    })

    test('throws an actionable error when neither is set', () => {
        const config = loadConfig({})
        expect(() => resolveAppId(undefined, config)).toThrow(
            /appmetrica_list_apps/,
        )
    })
})

describe('appmetrica: error hints', () => {
    // A 403 here almost always means the token lacks appmetrica:read (the
    // embedded client is Metrica-only), NOT that the account lacks access.
    test('403 explains the appmetrica:read scope requirement', () => {
        const err = new YandexApiError(403, 'Access is denied', [
            'access_denied',
        ])
        const res = appmetricaErrorResult(err)
        const text = res.content[0]?.type === 'text' ? res.content[0].text : ''
        expect(res.isError).toBe(true)
        expect(text).toContain('appmetrica:read')
        expect(text).toContain('YANDEX_OAUTH_CLIENT_ID')
        // Must not misattribute the failure to a Metrica counter.
        expect(text).not.toContain('counter')
    })

    test('non-403 errors keep the plain message without the scope hint', () => {
        const err = new YandexApiError(404, 'not_found: Entity not found', [
            'not_found',
        ])
        const res = appmetricaErrorResult(err)
        const text = res.content[0]?.type === 'text' ? res.content[0].text : ''
        expect(text).toContain('not_found')
        expect(text).not.toContain('appmetrica:read')
    })
})

describe('appmetrica: config', () => {
    test('defaults to the AppMetrica host, separate from Metrica', () => {
        const config = loadConfig({})
        expect(config.appmetricaBaseUrl).toBe(
            'https://api.appmetrica.yandex.com',
        )
        expect(config.baseUrl).toBe('https://api-metrika.yandex.net')
    })

    test('base url is overridable and trailing slashes are trimmed', () => {
        const config = loadConfig({
            YANDEX_APPMETRICA_BASE_URL: 'https://mock.test/',
        })
        expect(config.appmetricaBaseUrl).toBe('https://mock.test')
    })
})
