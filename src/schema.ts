export const allowedEventSources = ["lwc", "microservice", "apex", "webhook", "de"] as const;

export type EventSource = (typeof allowedEventSources)[number];

export type TelemetryPayload = Record<string, unknown>;

export interface TelemetryEventInput {
    sessionId?: string | null;
    oppId: string;
    service_provider?: string | null;
    origin?: string | null;
    brand?: string | null;
    applicantFlow?: string | null;
    component?: string | null;
    eventName: string;
    eventSource: EventSource;
    eventTs: string;
    durationMs?: number | null;
    idempotencyKey: string;
    finalStatus?: string | null;
    flow?: string | null;
    result?: string | null;
    entityType?: string | null;
    entityAction?: string | null;
    payload?: TelemetryPayload;
}

export interface StoredTelemetryEvent {
    id: number;
    sessionId: string | null;
    oppId: string;
    eventName: string;
    eventSource: EventSource;
    eventTs: string;
    durationMs: number | null;
    idempotencyKey: string;
    component: string | null;
    flow: string | null;
    brand: string | null;
    result: string | null;
    entityType: string | null;
    entityAction: string | null;
    payload: TelemetryPayload;
    createdAt: string;
    updatedAt: string;
}

export interface TelemetrySessionRecord {
    sessionId: string;
    oppId: string;
    service_provider: string | null;
    origin: string | null;
    brand: string | null;
    applicantFlow: string | null;
    startedAt: string;
    lastEventAt: string;
    finalStatus: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface PhaseDuration {
    name: string;
    startedAt: string;
    endedAt: string;
    durationMs: number;
}

export const phaseDefinitions = [
    {
        name: "upload_to_fetch_start",
        startEvent: "bank_upload_success",
        endEvent: "asset_report_fetch_started",
    },
    {
        name: "fetch_to_parse_complete",
        startEvent: "asset_report_fetch_started",
        endEvent: "asset_report_parse_completed",
    },
    {
        name: "parse_to_webhook",
        startEvent: "asset_report_parse_completed",
        endEvent: "plaid_webhook_received",
    },
    {
        name: "webhook_to_de_start",
        startEvent: "plaid_webhook_received",
        endEvent: "de_started",
    },
    {
        name: "de_execution",
        startEvent: "de_started",
        endEvent: "de_finished",
    },
    {
        name: "de_finish_to_offer_rendered",
        startEvent: "de_finished",
        endEvent: "loan_offer_rendered",
    },
    {
        name: "end_to_end",
        startEvent: "bank_upload_success",
        endEvent: "loan_offer_rendered",
    },
] as const;
