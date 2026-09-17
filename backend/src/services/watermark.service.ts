import sharp from "sharp";

/**
 * Composites a semi-transparent watermark (user ID + ISO timestamp) onto
 * a page image buffer. Must be called BEFORE any signed URL is generated —
 * an unwatermarked page must never leave the server.
 */
export async function applyWatermark(
  imageBuffer: Buffer,
  userId: string,
  timestamp: string,
): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  const width = metadata.width ?? 1200;
  const height = metadata.height ?? 1600;

  const label = `user-id: ${userId}  |  ${timestamp}`;

  const svgOverlay = `
    <svg width="${width}" height="${height}">
      <style>
        .watermark {
          fill: rgba(255, 255, 255, 0.55);
          font-size: ${Math.max(14, Math.floor(width / 60))}px;
          font-family: sans-serif;
        }
        .watermark-shadow {
          fill: rgba(0, 0, 0, 0.35);
          font-size: ${Math.max(14, Math.floor(width / 60))}px;
          font-family: sans-serif;
        }
      </style>
      <text x="12" y="${height - 10}" class="watermark-shadow">${label}</text>
      <text x="10" y="${height - 12}" class="watermark">${label}</text>
    </svg>
  `;

  return image
    .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
    .png({ quality: 90 })
    .toBuffer();
}
