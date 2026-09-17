import { randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";

import { fromPath } from "pdf2pic";
import sharp from "sharp";

import { env } from "../config/env.js";

export interface RenderedPage {
  pageNumber: number;
  buffer: Buffer;
}

const RENDER_DENSITY = 150;
const MAX_PAGE_WIDTH = 1600;

/**
 * Renders every page of a PDF to a normalized PNG buffer.
 * Runs once at ingestion time — never per view.
 */
export async function renderAllPdfPages(
  pdfPath: string,
): Promise<RenderedPage[]> {
  const converter = fromPath(pdfPath, {
    density: RENDER_DENSITY,
    format: "png",
    savePath: tmpdir(),
    saveFilename: `pdfpage-${randomUUID()}`,
    preserveAspectRatio: true,
    width: MAX_PAGE_WIDTH,
  });

  converter.setGMClass(env.graphicsMagickPath);

  const results = await converter.bulk(-1, {
    responseType: "image",
  });

  if (results.length === 0) {
    throw new Error("PDF contains no renderable pages");
  }

  const pages: RenderedPage[] = [];

  for (const result of results) {
    if (!result.path || result.page === undefined) {
      throw new Error("PDF rendering returned an incomplete result");
    }

    const rawBuffer = await readFile(result.path);

    try {
      const normalized = await sharp(rawBuffer)
        .png({
          quality: 90,
        })
        .toBuffer();

      pages.push({
        pageNumber: result.page,
        buffer: normalized,
      });
    } finally {
      await unlink(result.path).catch(() => undefined);
    }
  }

  pages.sort((a, b) => a.pageNumber - b.pageNumber);

  return pages;
}
