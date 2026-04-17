import { createHmac, timingSafeEqual } from "crypto";
import type { FastifyReply, FastifyRequest } from "fastify";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TelemetryTokenClaims {
    sub: string; // sessionId (from LWC crypto.randomUUID())
    opp: string; // Salesforce Opportunity Id
    flow: string; // e.g. 'quick-apply', 'offer-flow'
    brand: string; // e.g. 'Sunshine', 'Enable', 'SDC', 'MSC', 'Tribal'
    iat: number; // issued-at (unix seconds)
    exp: number; // expiry (unix seconds, TTL = 30 min)
}

// Shape of the body navigator.sendBeacon() delivers to this endpoint.
// The LWC sends: new Blob([JSON.stringify({ token, events })], { type: 'text/plain' })
export interface BeaconBody {
    token: string;
    events: unknown[];
}

declare module "fastify" {
    interface FastifyRequest {
        telemetryAuth?: TelemetryTokenClaims;
        beaconBody?: BeaconBody;
    }
}

// ─── Token verification (pure — no Fastify dependency) ────────────────────────

const REQUIRED_STRING_CLAIMS = ["sub", "opp", "flow", "brand"] as const;

function base64UrlToBuffer(input: string): Buffer {
    const padded = input.replace(/-/g, "+").replace(/_/g, "/");
    const pad = (4 - (padded.length % 4)) % 4;
    return Buffer.from(padded + "=".repeat(pad), "base64");
}

function base64UrlDecode(input: string): string {
    return base64UrlToBuffer(input).toString("utf8");
}

/**
 * Verifies a compact JWT signed with HMAC-SHA256.
 * Throws a TokenError on any failure — never returns partial results.
 * Exported so it can be unit-tested independently of Fastify.
 */
export function verifyTelemetryToken(token: string, secret: string): TelemetryTokenClaims {
    const parts = token.split(".");
    if (parts.length !== 3) {
        throw new TokenError("malformed_token", "JWT must have exactly 3 parts");
    }

    const [encodedHeader, encodedPayload, encodedSig] = parts;

    // Use timingSafeEqual to prevent timing attacks — an attacker sending
    // crafted tokens must not be able to determine correct bytes via response time.
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const expectedSig = createHmac("sha256", secret).update(signingInput).digest();
    const actualSig = base64UrlToBuffer(encodedSig);

    if (expectedSig.length !== actualSig.length || !timingSafeEqual(expectedSig, actualSig)) {
        throw new TokenError("invalid_signature", "Token signature did not verify");
    }

    let claims: Record<string, unknown>;
    try {
        claims = JSON.parse(base64UrlDecode(encodedPayload));
    } catch {
        throw new TokenError("malformed_payload", "Token payload could not be decoded as JSON");
    }

    const now = Math.floor(Date.now() / 1000);
    if (typeof claims["exp"] !== "number" || claims["exp"] < now) {
        throw new TokenError("token_expired", "Token has expired");
    }

    for (const claim of REQUIRED_STRING_CLAIMS) {
        const value = claims[claim];
        if (typeof value !== "string" || !value.trim()) {
            throw new TokenError("missing_claim", `Required claim '${claim}' is missing or blank`);
        }
    }

    if (typeof claims["iat"] !== "number") {
        throw new TokenError("missing_claim", "Required claim 'iat' is missing");
    }

    return claims as unknown as TelemetryTokenClaims;
}

// ─── Auth helper ──────────────────────────────────────────────────────────────

/**
 * Inline auth helper for the LWC beacon endpoint (POST /telemetry/events).
 *
 * navigator.sendBeacon() sends Content-Type: text/plain to avoid a CORS preflight.
 * app.ts registers a text/plain content-type parser that JSON-parses the body,
 * so request.body is already a BeaconBody object when this runs.
 *
 * Usage in route handler:
 *   if (!requireJwtAuth(request, reply, app.config.hmacSecret)) return;
 *   const { events } = request.beaconBody!;
 *
 * The x-telemetry-secret path (auth.ts) is retained for server-to-server
 * routes (admin queries, migrations). Only the beacon endpoint uses requireJwtAuth.
 *
 * HMAC secret rotation procedure:
 *   1. Add new key to SF Named Credential (both keys active in SF during window)
 *   2. Flip TELEMETRY_HMAC_SECRET env var to new key and redeploy Node service
 *   3. Remove old key from SF Named Credential
 */
export function requireJwtAuth(
    request: FastifyRequest,
    reply: FastifyReply,
    secret: string,
): boolean {
    const body = request.body as BeaconBody;

    if (!body.token || typeof body.token !== "string") {
        void reply.code(401).send({ error: "missing_token" });
        return false;
    }

    if (!Array.isArray(body.events)) {
        void reply.code(400).send({ error: "invalid_body", detail: "events must be an array" });
        return false;
    }

    try {
        request.telemetryAuth = verifyTelemetryToken(body.token, secret);
        request.beaconBody = body;
        return true;
    } catch (err) {
        if (err instanceof TokenError) {
            // Log reason for debugging — never log the raw token string
            request.log.warn({ code: err.code }, `[requireJwtAuth] Rejected: ${err.message}`);
            void reply.code(401).send({ error: err.code });
            return false;
        }
        request.log.error({ err }, "[requireJwtAuth] Unexpected error during token verification");
        void reply.code(500).send({ error: "internal_error" });
        return false;
    }
}

// ─── Error type ───────────────────────────────────────────────────────────────

export class TokenError extends Error {
    constructor(
        public readonly code: string,
        message: string,
    ) {
        super(message);
        this.name = "TokenError";
    }
}
