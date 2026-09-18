import "dotenv/config";

interface AppEnv {
  mongodbUri: string;
  jwtSecret: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  supabaseBucketName: string;
  graphicsMagickPath: string;
  corsOrigins: string[];
  port: number;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function getOptionalEnv(name: string, defaultValue: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    return defaultValue;
  }

  return value.trim();
}

function getPort(): number {
  const rawPort = getRequiredEnv("PORT");
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error(`Invalid PORT value: ${rawPort}`);
  }

  return port;
}

function getCorsOrigins(): string[] {
  const rawOrigins = getOptionalEnv("CORS_ORIGIN", "http://localhost:4200");

  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export const env: AppEnv = {
  mongodbUri: getRequiredEnv("MONGODB_URI"),
  jwtSecret: getRequiredEnv("JWT_SECRET"),
  supabaseUrl: getRequiredEnv("SUPABASE_URL"),
  supabaseServiceKey: getRequiredEnv("SUPABASE_SERVICE_KEY"),
  supabaseBucketName: getRequiredEnv("SUPABASE_BUCKET_NAME"),
  graphicsMagickPath: getRequiredEnv("GRAPHICSMAGICK_PATH"),
  corsOrigins: getCorsOrigins(),
  port: getPort(),
};
