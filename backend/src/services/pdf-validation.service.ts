import { PDFDocument } from "pdf-lib";

export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
  try {
    const pdfDocument = await PDFDocument.load(pdfBuffer);
    return pdfDocument.getPageCount();
  } catch {
    throw new Error("PDF could not be parsed");
  }
}
