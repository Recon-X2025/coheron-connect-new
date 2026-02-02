import { llmGateway } from './LLMGateway.js';
import logger from '../../shared/utils/logger.js';

const EXTRACTION_PROMPT = `Extract structured data from this document text. The document appears to be a business document (invoice, purchase order, receipt, or bill).

Extract the following fields if present:
- document_type: "invoice" | "purchase_order" | "receipt" | "bill" | "unknown"
- document_number: string
- date: ISO date string
- due_date: ISO date string (if applicable)
- vendor_name: string
- vendor_address: string
- vendor_gstin: string (if Indian GST number present)
- customer_name: string
- customer_address: string
- customer_gstin: string
- line_items: [{ description, quantity, unit_price, tax_rate, tax_amount, total }]
- subtotal: number
- tax_total: number
- grand_total: number
- currency: string (default "INR")
- payment_terms: string
- notes: string

Respond ONLY with a JSON object containing the extracted fields. Use null for fields not found.`;

export class DocumentIntelligence {
  private static isPDF(buffer: Buffer): boolean {
    return buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  }

  private static isValidImage(buffer: Buffer): boolean {
    if (buffer.length < 4) return false;
    // PNG
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
    // JPEG
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
    // BMP
    if (buffer[0] === 0x42 && buffer[1] === 0x4D) return true;
    // TIFF
    if ((buffer[0] === 0x49 && buffer[1] === 0x49) || (buffer[0] === 0x4D && buffer[1] === 0x4D)) return true;
    // WebP
    if (buffer.length >= 12 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return true;
    return false;
  }

  private static async extractTextFromPDF(buffer: Buffer): Promise<{ text: string; confidence: number }> {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += (content.items as any[]).map((item: any) => item.str).join(' ') + '\n';
    }
    doc.destroy();
    return { text: text.trim(), confidence: text.trim() ? 85 : 0 };
  }

  static async extractFromImage(imageBuffer: Buffer, tenantId?: string): Promise<{ extracted_text: string; structured_data: any; confidence: number }> {
    logger.info('Starting document extraction');

    let extractedText: string;
    let confidence: number;

    if (DocumentIntelligence.isPDF(imageBuffer)) {
      // Handle PDF: extract text directly
      logger.info('Detected PDF, using pdf-parse');
      const pdfResult = await DocumentIntelligence.extractTextFromPDF(imageBuffer);
      extractedText = pdfResult.text;
      confidence = pdfResult.confidence;
    } else if (DocumentIntelligence.isValidImage(imageBuffer)) {
      // Handle image: OCR with Tesseract
      logger.info('Detected image, using Tesseract OCR');
      const Tesseract = await import('tesseract.js');
      const recognize = Tesseract.default?.recognize || Tesseract.recognize;

      const ocrResult = await new Promise<any>((resolve, reject) => {
        const errorHandler = (err: Error) => {
          process.removeListener('uncaughtException', errorHandler);
          reject(new Error('OCR engine failed to process this image. Ensure the file is a clear, valid image.'));
        };
        process.on('uncaughtException', errorHandler);

        recognize(imageBuffer, 'eng')
          .then((result: any) => {
            process.removeListener('uncaughtException', errorHandler);
            resolve(result);
          })
          .catch((err: any) => {
            process.removeListener('uncaughtException', errorHandler);
            reject(err);
          });
      });

      extractedText = ocrResult.data.text;
      confidence = ocrResult.data.confidence;
    } else {
      throw new Error('Unsupported file format. Please upload a PNG, JPEG, TIFF, BMP, or PDF file.');
    }

    if (!extractedText.trim()) {
      return { extracted_text: '', structured_data: null, confidence: 0 };
    }

    let structuredData: any = null;
    try {
      const response = await llmGateway.sendMessage(
        `Document text:\n\n${extractedText}`,
        { tenantId, systemPrompt: EXTRACTION_PROMPT, maxTokens: 2048, temperature: 0.1 }
      );
      structuredData = JSON.parse(response.content);
    } catch (err: any) {
      logger.warn({ err: err.message }, 'LLM extraction failed, returning raw text only');
      // Return basic extraction from regex patterns
      structuredData = DocumentIntelligence.basicExtraction(extractedText);
    }

    return { extracted_text: extractedText, structured_data: structuredData, confidence };
  }

  static async extractFromText(text: string, tenantId?: string): Promise<any> {
    try {
      const response = await llmGateway.sendMessage(
        `Document text:\n\n${text}`,
        { tenantId, systemPrompt: EXTRACTION_PROMPT, maxTokens: 2048, temperature: 0.1 }
      );
      return JSON.parse(response.content);
    } catch {
      return DocumentIntelligence.basicExtraction(text);
    }
  }

  private static basicExtraction(text: string): any {
    const dateMatch = text.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/);
    const amountMatch = text.match(/(?:total|amount|grand\s*total)[:\s]*[₹$]?\s*([\d,]+\.?\d*)/i);
    const gstinMatch = text.match(/\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d][A-Z\d]/);
    const invoiceNumMatch = text.match(/(?:invoice|inv|bill)\s*(?:no|number|#)[:\s]*([A-Za-z0-9\-\/]+)/i);

    return {
      document_type: 'unknown',
      document_number: invoiceNumMatch?.[1] || null,
      date: dateMatch?.[1] || null,
      vendor_gstin: gstinMatch?.[0] || null,
      grand_total: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null,
      currency: 'INR',
      _extraction_method: 'regex_fallback',
    };
  }
}
