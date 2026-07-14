import fs from "fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { BaseStatementParser } from "./baseStatementParser";

export abstract class PdfParser extends BaseStatementParser {
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
