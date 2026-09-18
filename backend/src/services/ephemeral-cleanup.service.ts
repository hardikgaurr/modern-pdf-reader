import { listObjects, removeObjects } from "./storage.service.js";

const EPHEMERAL_ROOT = "ephemeral";
const LIST_LIMIT = 100;
const MAX_EPHEMERAL_AGE_MS = 15 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const REMOVE_BATCH_SIZE = 100;

interface EphemeralFile {
  path: string;
  lastModifiedAt: string | null;
}

async function collectEphemeralFiles(
  folderPath: string,
  files: EphemeralFile[],
): Promise<void> {
  let offset = 0;

  while (true) {
    const items = await listObjects(folderPath, {
      limit: LIST_LIMIT,
      offset,
    });

    for (const item of items) {
      const itemPath = `${folderPath}/${item.name}`;

      if (item.id === null) {
        await collectEphemeralFiles(itemPath, files);
        continue;
      }

      if (!itemPath.endsWith(".png")) {
        continue;
      }

      files.push({
        path: itemPath,
        lastModifiedAt: item.updatedAt ?? item.createdAt,
      });
    }

    if (items.length < LIST_LIMIT) {
      break;
    }

    offset += items.length;
  }
}

function isStale(lastModifiedAt: string | null, now: number): boolean {
  if (!lastModifiedAt) {
    return false;
  }

  const timestamp = Date.parse(lastModifiedAt);

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return now - timestamp >= MAX_EPHEMERAL_AGE_MS;
}

function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }

  return batches;
}

export async function cleanupEphemeralObjects(): Promise<number> {
  const files: EphemeralFile[] = [];

  await collectEphemeralFiles(EPHEMERAL_ROOT, files);

  const now = Date.now();

  const stalePaths = files
    .filter((file) => isStale(file.lastModifiedAt, now))
    .map((file) => file.path);

  if (stalePaths.length === 0) {
    return 0;
  }

  const batches = createBatches(stalePaths, REMOVE_BATCH_SIZE);

  for (const batch of batches) {
    await removeObjects(batch);
  }

  return stalePaths.length;
}

export function startEphemeralCleanup(): void {
  let cleanupRunning = false;

  const runCleanup = async (): Promise<void> => {
    if (cleanupRunning) {
      return;
    }

    cleanupRunning = true;

    try {
      const removed = await cleanupEphemeralObjects();

      if (removed > 0) {
        console.log(`Ephemeral cleanup removed ${removed} stale object(s)`);
      }
    } catch (error: unknown) {
      console.error("Ephemeral cleanup failed:", error);
    } finally {
      cleanupRunning = false;
    }
  };

  void runCleanup();

  const interval = setInterval(() => {
    void runCleanup();
  }, CLEANUP_INTERVAL_MS);

  interval.unref();
}
