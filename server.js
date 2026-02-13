// server.js - CLEAN MAIN SERVER
const http = require('http');
const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');

// Import modules
const PdfExtractor = require('./modules/pdfExtractor');
const FinancialExtractor = require('./modules/financialExtractor');
const EarningsExtractor = require('./modules/earningsExtractor');
const ExcelGenerator = require('./modules/excelGenerator');

// Load environment
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {}

// Initialize Groq clients
const groq1 = new Groq({ apiKey: process.env.GROQ_API_KEY_1 });
const groq2 = new Groq({ apiKey: process.env.GROQ_API_KEY_2 });

// Initialize modules
const pdfExtractor = new PdfExtractor('./ocr_output');
const financialExtractor = new FinancialExtractor(groq2);
const earningsExtractor = new EarningsExtractor(groq1);
const excelGenerator = new ExcelGenerator();

// Store last analysis
let lastFinancialAnalysis = null;
let lastOcrInfo = null;

const PORT = process.env.PORT || 3016;

// Parse multipart form data
function parseMultipart(buffer, boundary) {
  const parts = [];
  const boundaryBuffer = Buffer.from('--' + boundary);
  let start = 0;

  while (true) {
    const boundaryIndex = buffer.indexOf(boundaryBuffer, start);
    if (boundaryIndex === -1) break;

    const nextBoundaryIndex = buffer.indexOf(boundaryBuffer, boundaryIndex + boundaryBuffer.length);
    if (nextBoundaryIndex === -1) break;

    const partBuffer = buffer.slice(boundaryIndex + boundaryBuffer.length, nextBoundaryIndex);
    const headerEnd = partBuffer.indexOf('\r\n\r\n');
    
    if (headerEnd !== -1) {
      const headers = partBuffer.slice(0, headerEnd).toString();
      const content = partBuffer.slice(headerEnd + 4, partBuffer.length - 2);
      
      const nameMatch = headers.match(/name="([^"]+)"/);
      const filenameMatch = headers.match(/filename="([^"]+)"/);
      
      if (nameMatch) {
        parts.push({
          name: nameMatch[1],
          filename: filenameMatch ? filenameMatch[1] : null,
          content: filenameMatch ? content : content.toString()
        });
      }
    }

    start = nextBoundaryIndex;
  }

  return parts;
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Serve static files
  if (req.method === 'GET') {
    if (req.url === '/') {
      const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
      return;
    }
    
    if (req.url === '/styles.css') {
      const css = fs.readFileSync(path.join(__dirname, 'public', 'styles.css'));
      res.writeHead(200, { 'Content-Type': 'text/css' });
      res.end(css);
      return;
    }

    if (req.url === '/script.js') {
      const js = fs.readFileSync(path.join(__dirname, 'public', 'script.js'));
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(js);
      return;
    }

    // Download OCR text
    if (req.url === '/api/download-ocr' && lastOcrInfo) {
      const text = pdfExtractor.getOcrFile(lastOcrInfo.ocrFile);
      if (text) {
        res.writeHead(200, {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="${lastOcrInfo.ocrFile}"`
        });
        res.end(text);
        return;
      }
    }

    // Download Excel
    if (req.url === '/api/download-excel' && lastFinancialAnalysis) {
      try {
        const excelBuffer = await excelGenerator.generate(lastFinancialAnalysis);
        res.writeHead(200, {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="financial-analysis.xlsx"'
        });
        res.end(excelBuffer);
        return;
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Excel generation failed' }));
        return;
      }
    }
  }

  // Analyze document
  if (req.method === 'POST' && req.url === '/api/analyze') {
    let body = [];

    req.on('data', chunk => body.push(chunk));
    req.on('end', async () => {
      try {
        const buffer = Buffer.concat(body);
        const contentType = req.headers['content-type'] || '';
        const boundaryMatch = contentType.match(/boundary=(.+)$/);

        if (!boundaryMatch) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid content type' }));
          return;
        }

        const boundary = boundaryMatch[1];
        const parts = parseMultipart(buffer, boundary);
        
        const filePart = parts.find(p => p.filename);
        const analysisType = parts.find(p => p.name === 'analysisType')?.content || 'earnings';

        if (!filePart) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'No file uploaded' }));
          return;
        }

        const ext = path.extname(filePart.filename).toLowerCase();
        let text = "";
        let ocrInfo = null;

        // Handle PDF
        if (ext === '.pdf') {
          const result = await pdfExtractor.extractText(filePart.content, filePart.filename);
          
          if (!result.success && result.requiresManualReview) {
            lastOcrInfo = result;
            res.writeHead(202);
            res.end(JSON.stringify({
              success: false,
              needsOcr: true,
              filename: filePart.filename,
              ocrFile: result.ocrFile,
              message: 'PDF extraction needs review'
            }));
            return;
          }
          
          text = result.text;
          ocrInfo = result;
          lastOcrInfo = result;
        } 
        // Handle TXT
        else if (ext === '.txt') {
          text = filePart.content.toString('utf-8');
        } 
        else {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Unsupported file type' }));
          return;
        }

        // Perform analysis
        let analysis;
        if (analysisType === 'financial') {
          analysis = await financialExtractor.extract(text);
          lastFinancialAnalysis = analysis;
        } else {
          analysis = await earningsExtractor.analyze(text);
        }

        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          analysisType: analysisType,
          filename: filePart.filename,
          analysis: analysis,
          ocrAvailable: !!ocrInfo,
          ocrFile: ocrInfo?.ocrFile
        }));

      } catch (error) {
        console.error('Server error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n🚀 Research Intelligence Portal`);
  console.log(`📊 http://localhost:${PORT}`);
  console.log(`\n📦 Modules Loaded:`);
  console.log(`   ✅ PDF Extractor`);
  console.log(`   ✅ Table Extractor`);
  console.log(`   ✅ Financial Extractor`);
  console.log(`   ✅ Earnings Extractor`);
  console.log(`   ✅ Excel Generator`);
  console.log(`\n🤖 Groq APIs:`);
  console.log(`   - Earnings (Groq1): ${process.env.GROQ_API_KEY_1 ? '✅' : '❌'}`);
  console.log(`   - Financial (Groq2): ${process.env.GROQ_API_KEY_2 ? '✅' : '❌'}`);
});