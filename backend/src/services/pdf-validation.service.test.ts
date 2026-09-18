import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { getPdfPageCount } from "./pdf-validation.service.js";

test("returns the correct PDF page count", async () => {
  const document = await PDFDocument.create();

  document.addPage();
  document.addPage();
  document.addPage();

  const bytes = await document.save();

  const pageCount = await getPdfPageCount(Buffer.from(bytes));

  assert.equal(pageCount, 3);
});

test("rejects invalid PDF data", async () => {
  await assert.rejects(
    () => getPdfPageCount(Buffer.from("not-a-pdf")),
    /PDF could not be parsed/,
  );
});
