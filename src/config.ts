import dotenv from "dotenv";

dotenv.config();

function readRequiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

export const config = {
    host: process.env.HOST ?? "0.0.0.0",
    port: Number(process.env.PORT ?? 3000),
    databaseUrl: readRequiredEnv("DATABASE_URL"),
    sharedSecret: readRequiredEnv("TELEMETRY_SHARED_SECRET"),
    hmacSecret: readRequiredEnv("TELEMETRY_HMAC_SECRET"),
    autoRunMigrations: (process.env.AUTO_RUN_MIGRATIONS ?? "true").toLowerCase() === "true",
};
