import fs from "fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { BaseStatementParser } from "./baseStatementParser";

// A piece of PDF text with its position, for statements whose columns can't be
// told apart once the text is flattened (e.g. withdrawals vs deposits).
// `x`/`y` are PDF user-space coordinates (y grows upward); `right` = x + width.
export type PdfItem = {
  str: string;
  x: number;
  right: number;
  y: number;
  page: number;
};

export abstract class PdfParser extends BaseStatementParser {
  protected async extractItems(filePath: string): Promise<PdfItem[]> {
    const buffer = fs.readFileSync(filePath);
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
      .promise;

    const items: PdfItem[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      for (const it of content.items as any[]) {
        if (!it.str?.trim()) continue;
        const x = it.transform[4];
        items.push({
          str: it.str,
          x,
          right: x + it.width,
          y: it.transform[5],
          page: i,
        });
      }
    }
    return items;
  }

  protected async extractText(filePath: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);
    const uint8 = new Uint8Array(buffer);
    const doc = await pdfjsLib.getDocument({ data: uint8 }).promise;

    let text = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((items: any) => items.str).join(" ") + "\n";
    }

    return text;
  }
}
