import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "../config/env.js";

const supabase: SupabaseClient = createClient(
  env.supabaseUrl,
  env.supabaseServiceKey,
  { auth: { persistSession: false } },
);

const BUCKET = env.supabaseBucketName;

/**
 * Narrow storage abstraction. Controllers/services must go through these
 * functions only — the Supabase client itself is never exported.
 */

export async function uploadObject(
  objectPath: string,
  data: Buffer,
  contentType: string,
): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, data, { contentType, upsert: true });

  if (error) {
    throw new Error(
      `Storage upload failed for "${objectPath}": ${error.message}`,
    );
  }
}

export async function downloadObject(objectPath: string): Promise<Buffer> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(objectPath);

  if (error || !data) {
    throw new Error(
      `Storage download failed for "${objectPath}": ${error?.message ?? "unknown error"}`,
    );
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function getSignedUrl(
  objectPath: string,
  expiresInSeconds: number,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(objectPath, expiresInSeconds);

  if (error || !data) {
    throw new Error(
      `Failed to create signed URL for "${objectPath}": ${error?.message ?? "unknown error"}`,
    );
  }

  return data.signedUrl;
}

export async function removeObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) {
    return;
  }

  const { error } = await supabase.storage.from(BUCKET).remove(paths);

  if (error) {
    throw new Error(`Storage removal failed: ${error.message}`);
  }
}
