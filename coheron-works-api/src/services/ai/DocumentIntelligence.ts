import Tesseract from 'tesseract.js';
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
  static async extractFromImage(imageBuffer: Buffer, tenantId?: string): Promise<{ extracted_text: string; structured_data: any; confidence: number }> {
    logger.info('Starting OCR extraction');

    const ocrResult = await Tesseract.recognize(imageBuffer, 'eng', {
      logger: (m: any) => { if (m.status === 'recognizing text') logger.debug({ progress: m.progress }, 'OCR progress'); },
    });

    const extractedText = ocrResult.data.text;
    const confidence = ocrResult.data.confidence;

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
