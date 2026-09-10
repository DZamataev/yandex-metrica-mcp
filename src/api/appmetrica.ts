import type { YandexClient } from '@boxlab/yandex-mcp-core'
import { z } from 'zod'

/**
 * AppMetrica Management API — the app (mobile analytics) counterpart to
 * Metrica's counters. AppMetrica is a SEPARATE Yandex product: different host
 * (`api.appmetrica.yandex.com`), different OAuth scope (`appmetrica:read`) and
 * a different entity (`applications`, not `counters`).
 *
 * Its Reporting API, however, mirrors Metrica's `/stat/v1/*` endpoints exactly,
 * so `src/api/reporting.ts` is reused verbatim against an AppMetrica-scoped
 * client. See docs/API-NOTES.md.
 */

/**
 * One app as returned by `/management/v1/applications`.
 *
 * Deliberately narrow: the raw API also returns `api_key128` and
 * `import_token`, which are CREDENTIALS for ingesting data into the app. They
 * are dropped here so they can never reach the model's context. Everything
 * else is optional/lenient so API drift adds fields without breaking parsing.
 */
export const ApplicationSchema = z
    .object({
        id: z.number(),
        name: z.string().nullable().optional(),
        owner_login: z.string().nullable().optional(),
        permission: z.string().nullable().optional(),
        time_zone_name: z.string().nullable().optional(),
        time_zone_offset: z.number().nullable().optional(),
        create_date: z.string().nullable().optional(),
        permission_date: z.string().nullable().optional(),
        bundle_id: z.string().nullable().optional(),
        category: z.number().nullable().optional(),
        label: z.string().nullable().optional(),
        label_id: z.number().nullable().optional(),
        gdpr_agreement_accepted: z.boolean().nullable().optional(),
        hide_address: z.boolean().nullable().optional(),
    })
    .catchall(z.unknown())
export type Application = z.infer<typeof ApplicationSchema>

export const ApplicationsResponseSchema = z.object({
    applications: z.array(ApplicationSchema),
})

export const ApplicationResponseSchema = z.object({
    application: ApplicationSchema,
})

/**
 * Fields that are secrets or pure noise. `api_key128`/`import_token` are write
 * credentials for the app; never surface them to the model.
 */
const SECRET_FIELDS = ['api_key128', 'import_token', 'post_api_key'] as const

/** Strip credential fields from a parsed application. */
export function sanitizeApplication(app: Application): Application {
    const clean: Record<string, unknown> = { ...app }
    for (const field of SECRET_FIELDS) delete clean[field]
    return clean as Application
}

/** `GET /management/v1/applications` — apps the token can read. */
export async function listApplications(
    client: YandexClient,
): Promise<Application[]> {
    const raw = await client.request('/management/v1/applications', {})
    return ApplicationsResponseSchema.parse(raw).applications.map(
        sanitizeApplication,
    )
}

/** `GET /management/v1/application/{id}` — one app's settings. */
export async function getApplication(
    client: YandexClient,
    appId: number,
): Promise<Application> {
    const raw = await client.request(`/management/v1/application/${appId}`, {})
    return sanitizeApplication(ApplicationResponseSchema.parse(raw).application)
}
