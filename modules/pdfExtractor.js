// modules/pdfExtractor.js - PROFESSIONAL OCR SYSTEM
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');
const sharp = require('sharp');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class PdfExtractor {
  constructor(outputDir = './ocr_output') {
    this.outputDir = outputDir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * PROFESSIONAL PDF EXTRACTION with multiple strategies
   */
  async extractText(buffer, filename) {
    console.log(`📄 [PDF Extractor] Processing: ${filename}`);
    
    // STRATEGY 1: Try pdf-parse first (fastest, works for text-based PDFs)
    try {
      console.log('🔄 Strategy 1: Trying pdf-parse...');
      const text = await this.extractWithPdfParse(buffer);
      if (this.isValidText(text)) {
        console.log('✅ pdf-parse successful!');
        return this.saveResult(text, filename, 'pdf-parse');
      }
    } catch (e) {
      console.log('❌ pdf-parse failed:', e.message);
    }

    // STRATEGY 2: Try pdf.js with structure preservation
    try {
      console.log('🔄 Strategy 2: Trying pdf.js structure extraction...');
      const text = await this.extractWithPdfJs(buffer);
      if (this.isValidText(text)) {
        console.log('✅ pdf.js successful!');
        return this.saveResult(text, filename, 'pdfjs');
      }
    } catch (e) {
      console.log('❌ pdf.js failed:', e.message);
    }

    // STRATEGY 3: Convert PDF to images and use Tesseract OCR
    try {
      console.log('🔄 Strategy 3: Trying Tesseract OCR (this may take a moment)...');
      const text = await this.extractWithTesseract(buffer, filename);
      if (this.isValidText(text)) {
        console.log('✅ Tesseract OCR successful!');
        return this.saveResult(text, filename, 'tesseract-ocr');
      }
    } catch (e) {
      console.log('❌ Tesseract failed:', e.message);
    }

    // STRATEGY 4: Last resort - try to extract any readable text
    try {
      console.log('🔄 Strategy 4: Trying raw text extraction...');
      const text = buffer.toString('utf8')
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Remove non-printable chars
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
      
      // Filter out garbage - keep only lines with real words
      const lines = text.split('\n')
        .filter(line => {
          const wordCount = (line.match(/[a-zA-Z]{3,}/g) || []).length;
          const numberCount = (line.match(/\d+[,.]?\d*/g) || []).length;
          return wordCount > 2 || numberCount > 1;
        })
        .join('\n');
      
      if (lines.length > 100) {
        console.log('✅ Raw extraction found some readable text!');
        return this.saveResult(lines, filename, 'raw-filtered');
      }
    } catch (e) {
      console.log('❌ Raw extraction failed:', e.message);
    }

    // ALL STRATEGIES FAILED - return error but save whatever we have
    const errorText = `ERROR: Could not extract text from PDF.
      
Please try:
1. Convert the PDF to TXT using Adobe Acrobat or another tool
2. Upload the TXT file instead
3. Ensure the PDF is not scanned/image-only (this one might be scanned)

Filename: ${filename}
Date: ${new Date().toISOString()}`;

    return this.saveResult(errorText, filename, 'failed', false);
  }

  /**
   * Strategy 1: pdf-parse (fast, good for text PDFs)
   */
  async extractWithPdfParse(buffer) {
    const data = await pdfParse(buffer);
    return this.cleanText(data.text);
  }

  /**
   * Strategy 2: pdf.js with better structure preservation
   */
  async extractWithPdfJs(buffer) {
    const pdfjsLib = require('pdfjs-dist');
    
    const loadingTask = pdfjsLib.getDocument({
      data: buffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    });

    const pdf = await loadingTask.promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      
      // Group by Y position for better table detection
      const itemsByY = {};
      content.items.forEach(item => {
        const y = Math.round(item.transform[5] / 5) * 5; // Round to nearest 5
        if (!itemsByY[y]) itemsByY[y] = [];
        itemsByY[y].push({
          text: item.str,
          x: item.transform[4]
        });
      });
      
      // Sort rows by Y position
      const sortedYs = Object.keys(itemsByY).sort((a, b) => b - a);
      
      fullText += `\n--- Page ${i} ---\n\n`;
      
      sortedYs.forEach(y => {
        const rowItems = itemsByY[y].sort((a, b) => a.x - b.x);
        const rowText = rowItems.map(item => item.str).join(' ');
        
        // Detect if this might be a table row
        const numbers = rowText.match(/\d+[,.]?\d*|\(\d+[,.]?\d*\)/g) || [];
        if (numbers.length >= 2) {
          fullText += `[TABLE] ${rowText}\n`;
        } else {
          fullText += rowText + '\n';
        }
      });
    }

    return this.cleanText(fullText);
  }

  /**
   * Strategy 3: Tesseract OCR (for scanned/image PDFs)
   */
  async extractWithTesseract(buffer, filename) {
    console.log('   📸 Converting PDF to images...');
    
    // Save buffer to temp file
    const tempPdf = path.join(this.outputDir, `temp_${Date.now()}.pdf`);
    fs.writeFileSync(tempPdf, buffer);
    
    try {
      // Convert PDF to images using pdf-poppler or fallback
      const imageDir = path.join(this.outputDir, `images_${Date.now()}`);
      fs.mkdirSync(imageDir);
      
      // Try to use pdf-poppler if available
      try {
        await execPromise(`pdf-to-image ${tempPdf} ${imageDir}/page.png`);
      } catch {
        // Fallback: use a simple message since we can't convert
        console.log('   ⚠️ PDF to image conversion not available, using fallback');
        return this.fallbackOcr(buffer);
      }
      
      // Initialize Tesseract worker
      const worker = await createWorker('eng');
      let fullText = '';
      
      // Process each image
      const images = fs.readdirSync(imageDir).filter(f => f.endsWith('.png'));
      for (let i = 0; i < images.length; i++) {
        console.log(`   📝 OCR processing page ${i + 1}/${images.length}...`);
        const imagePath = path.join(imageDir, images[i]);
        
        // Preprocess image with sharp for better OCR
        const processedImage = path.join(imageDir, `processed_${i}.png`);
        await sharp(imagePath)
          .greyscale()
          .normalize()
          .sharpen()
          .toFile(processedImage);
        
        const { data: { text } } = await worker.recognize(processedImage);
        fullText += `\n--- Page ${i + 1} ---\n${text}\n`;
      }
      
      await worker.terminate();
      
      // Cleanup
      fs.unlinkSync(tempPdf);
      fs.rmSync(imageDir, { recursive: true, force: true });
      
      return this.cleanText(fullText);
      
    } catch (error) {
      console.log('   ❌ Tesseract error:', error.message);
      return this.fallbackOcr(buffer);
    }
  }

  /**
   * Fallback OCR when Tesseract fails
   */
  fallbackOcr(buffer) {
    // Try to extract any readable text from the buffer
    const text = buffer.toString('utf8')
      .replace(/[^\x20-\x7E\n\r]/g, ' ')
      .replace(/\s+/g, ' ');
    
    // Look for financial patterns
    const financialPatterns = [
      /revenue.*?\d+[,.]?\d*/gi,
      /profit.*?\d+[,.]?\d*/gi,
      /income.*?\d+[,.]?\d*/gi,
      /expense.*?\d+[,.]?\d*/gi,
      /asset.*?\d+[,.]?\d*/gi,
      /liabilit.*?\d+[,.]?\d*/gi,
      /\d+[,.]?\d*\s*(?:crore|lakh|million|billion)/gi,
      /quarter.*?ended.*?\d{1,2}\s+[a-z]+\s+\d{4}/gi
    ];
    
    let extracted = "EXTRACTED FINANCIAL DATA:\n\n";
    
    financialPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        extracted += matches.join('\n') + '\n';
      }
    });
    
    if (extracted.length > 100) {
      return extracted;
    }
    
    return "Could not extract financial data. The PDF might be scanned or image-based.";
  }

  /**
   * Clean and validate text
   */
  cleanText(text) {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/[^\x20-\x7E\n\r\t\.,\-\(\)]/g, '') // Keep only printable chars and punctuation
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  /**
   * Check if text is valid (has real words/numbers)
   */
  isValidText(text) {
    if (!text || text.length < 100) return false;
    
    // Check for real words (at least 3 letters)
    const words = text.match(/[a-zA-Z]{3,}/g) || [];
    const numbers = text.match(/\d+[,.]?\d*/g) || [];
    
    // Should have either words OR numbers
    return words.length > 5 || numbers.length > 3;
  }

  /**
   * Save extraction result
   */
  saveResult(text, filename, method, success = true) {
    const baseName = path.basename(filename, '.pdf');
    const ocrFilename = `${baseName}_${method}_${Date.now()}.txt`;
    const ocrPath = path.join(this.outputDir, ocrFilename);
    
    // Add header with metadata
    const header = `=== EXTRACTION REPORT ===
File: ${filename}
Method: ${method}
Date: ${new Date().toISOString()}
Status: ${success ? 'SUCCESS' : 'FAILED'}
${'='.repeat(50)}\n\n`;
    
    const fullText = header + text;
    fs.writeFileSync(ocrPath, fullText);
    
    console.log(`💾 Saved to: ${ocrFilename} (${Math.round(fullText.length/1024)} KB)`);
    
    return {
      success,
      text: fullText,
      method,
      ocrFile: ocrFilename,
      ocrPath,
      requiresManualReview: !success
    };
  }

  /**
   * Get OCR file content
   */
  getOcrFile(filename) {
    const filePath = path.join(this.outputDir, filename);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    return null;
  }

  /**
   * List all OCR files
   */
  listOcrFiles() {
    return fs.readdirSync(this.outputDir)
      .filter(f => f.endsWith('.txt'))
      .map(f => ({
        name: f,
        path: path.join(this.outputDir, f),
        size: fs.statSync(path.join(this.outputDir, f)).size,
        modified: fs.statSync(path.join(this.outputDir, f)).mtime
      }))
      .sort((a, b) => b.modified - a.modified);
  }
}

module.exports = PdfExtractor;