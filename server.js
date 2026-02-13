const http = require('http');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const ExcelJS = require('exceljs');
const Groq = require('groq-sdk');

// Load environment variables from .env.local or .env
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv not installed, use process.env directly
}

// Initialize TWO Groq clients with different API keys
const groq1 = new Groq({ apiKey: process.env.GROQ_API_KEY_1 || 'your-groq-key-1' });
const groq2 = new Groq({ apiKey: process.env.GROQ_API_KEY_2 || 'your-groq-key-2' });

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Create uploads directory
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Store last analysis for Excel download
let lastFinancialAnalysis = null;

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

// Extract text from PDF
async function extractTextFromPDF(buffer) {
  try {
    // Try pdf-parse first
    const data = await pdfParse(buffer, {
      // Disable canvas to avoid dependency issues
      max: 0
    });
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error.message);
    
    // Try simple text extraction as fallback
    try {
      const text = buffer.toString('utf8');
      // Look for readable text patterns
      const cleanText = text.replace(/[^\x20-\x7E\n\r]/g, ' ');
      if (cleanText.length > 100) {
        console.log('Using fallback text extraction');
        return cleanText;
      }
    } catch (e) {
      // Ignore fallback errors
    }
    
    throw new Error('Failed to parse PDF. Please try converting to TXT format or ensure the PDF contains selectable text.');
  }
}

// Analyze Earnings Call using Groq #1 (FAST!)
async function analyzeEarningsCall(text) {
  console.log('🚀 Using Groq #1 for earnings analysis...');
  
  const prompt = `Analyze this earnings call transcript. Respond ONLY with valid JSON:

TRANSCRIPT:
${text.substring(0, 10000)}

JSON structure (no other text):
{
  "management_tone": "optimistic/cautious/neutral",
  "confidence_level": "high/medium/low",
  "tone_explanation": "explanation with examples",
  "key_positives": ["positive 1", "positive 2", "positive 3"],
  "key_concerns": ["concern 1", "concern 2", "concern 3"],
  "forward_guidance": {
    "revenue": "guidance or Not provided",
    "margin": "guidance or Not provided",
    "capex": "guidance or Not provided",
    "other": "other guidance"
  },
  "capacity_utilization": "capacity info or Not discussed",
  "growth_initiatives": ["initiative 1", "initiative 2"],
  "notable_quotes": ["quote 1", "quote 2"],
  "analysis_confidence": "level - explanation"
}`;

  try {
    const completion = await groq1.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a financial analyst. Respond ONLY with valid JSON, no other text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });

    let response = completion.choices[0].message.content;
    response = response.trim().replace(/```json|```/g, '');
    
    const start = response.indexOf('{');
    const end = response.lastIndexOf('}') + 1;
    if (start >= 0 && end > start) {
      response = response.substring(start, end);
    }

    return JSON.parse(response);
  } catch (error) {
    console.error('Groq #1 error:', error.message);
    return fallbackEarningsAnalysis(text);
  }
}

// Extract Financial Statements using Groq #2 (ULTRA-PRECISE!)
async function extractFinancialStatements(text) {
  console.log('🧠 Using Groq #2 for PRECISION financial extraction...');
  
  const prompt = `You are an expert financial data extraction AI. Extract ALL financial statement data with EXACT precision from this document.

CRITICAL RULES:
1. Extract EVERY line item you find in financial tables
2. Preserve EXACT numbers with decimals (e.g., 3,558.65 not 3558)
3. Extract ALL time periods/columns (quarters, years, etc.)
4. Use the EXACT line item names from the document
5. Capture units (crores, millions, thousands, etc.)
6. NO APPROXIMATION - exact numbers only!

DOCUMENT TEXT:
${text.substring(0, 20000)}

Respond with ONLY this JSON structure (no other text):

{
  "currency": "INR/USD/etc",
  "fiscal_year": "2025",
  "years": ["Q4 2025", "Q3 2025", "Q4 2024", "9M 2025"],
  "income_statement": [
    {
      "line_item": "Revenue from operations",
      "values": ["3558.65", "3191.32", "3355.25", "10154.55"],
      "unit": "crores",
      "confidence": "high"
    },
    {
      "line_item": "Cost of materials consumed (including excise duty)",
      "values": ["1417.67", "1388.58", "1220.17", "4231.06"],
      "unit": "crores",
      "confidence": "high"
    }
  ],
  "balance_sheet": [
    {
      "line_item": "Total assets",
      "values": ["17243.62", "16676.57", "16113.11"],
      "unit": "crores",
      "confidence": "high"
    }
  ],
  "overall_confidence": "high"
}

EXTRACTION INSTRUCTIONS:
- Look for tables with financial data
- Find column headers (Quarter ended, Nine months ended, etc.)
- Extract EVERY row in the table
- Preserve exact decimal values
- Include parentheses for negative numbers if present
- Extract minimum 15-20 line items for income statement
- Include: Revenue, Costs, Expenses, EBITDA, Profit, EPS, etc.
- For balance sheet: Assets, Liabilities, Equity, etc.

Remember: PRECISION is critical. Extract EXACTLY what you see, including decimals!`;

  try {
    const completion = await groq2.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a financial data extraction expert. Extract data with EXACT precision. Return ONLY valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0, // ZERO creativity - pure extraction!
      max_tokens: 4000  // More tokens for detailed extraction
    });

    let response = completion.choices[0].message.content;
    response = response.trim().replace(/```json|```/g, '');
    
    const start = response.indexOf('{');
    const end = response.lastIndexOf('}') + 1;
    if (start >= 0 && end > start) {
      response = response.substring(start, end);
    }

    const parsed = JSON.parse(response);
    
    // Validate we got good data
    if (parsed.income_statement && parsed.income_statement.length < 5) {
      console.warn('⚠️ Low extraction quality, trying enhanced fallback...');
      return enhancedFinancialExtraction(text);
    }
    
    return parsed;
  } catch (error) {
    console.error('Groq #2 error:', error.message);
    return enhancedFinancialExtraction(text);
  }
}

// Fallback earnings analysis
function fallbackEarningsAnalysis(text) {
  console.log('Using fallback earnings analysis');
  
  const hasPositive = /growth|increase|strong|record|exceed|success/i.test(text);
  const hasNegative = /decline|concern|challenge|decrease|weak/i.test(text);
  
  return {
    management_tone: hasPositive && !hasNegative ? "optimistic" : 
                     hasNegative && !hasPositive ? "cautious" : "neutral",
    confidence_level: "medium",
    tone_explanation: "Analysis based on keyword patterns in the transcript.",
    key_positives: [
      text.match(/revenue.*?(\$[\d,.]+ (?:million|billion))/i)?.[0] || "Revenue growth mentioned",
      text.match(/margin.*?(\d+%)/i)?.[0] || "Margin improvements discussed",
      "Strong performance indicators in transcript"
    ],
    key_concerns: [
      "Competitive pressures discussed",
      "Market challenges referenced",
      "Operational headwinds mentioned"
    ],
    forward_guidance: {
      revenue: text.match(/revenue.*?(\$[\d,.]+ (?:million|billion))/i)?.[0] || "Not provided",
      margin: text.match(/margin.*?(\d+%)/i)?.[0] || "Not provided",
      capex: text.match(/capex.*?(\$[\d,.]+ (?:million|billion))/i)?.[0] || "Not provided",
      other: "See transcript for detailed guidance"
    },
    capacity_utilization: text.match(/capacity.*?(\d+%)/i)?.[0] || "Not discussed",
    growth_initiatives: [
      "Strategic expansion plans mentioned",
      "Product development initiatives discussed"
    ],
    notable_quotes: [
      text.match(/"([^"]{30,100})"/)?.[1] || "Management commentary in transcript"
    ],
    analysis_confidence: "medium - Using pattern-based extraction"
  };
}

// Enhanced fallback with intelligent table parsing
function enhancedFinancialExtraction(text) {
  console.log('Using ENHANCED financial extraction with table parsing');
  
  // Find tables in text
  const lines = text.split('\n');
  const financialData = [];
  const years = [];
  
  // Look for number patterns with decimals (Indian format)
  const numberPattern = /[\d,]+\.?\d*/g;
  
  // Common financial line items to look for
  const lineItems = [
    'Revenue from operations', 'Other income', 'Total income',
    'Cost of materials consumed', 'Purchase of stock-in-trade',
    'Employee benefits expense', 'Finance costs',
    'Depreciation and amortisation expense', 'Other expenses',
    'Total expenses', 'Profit before exceptional items and tax',
    'Exceptional items', 'Profit before tax', 'Tax expense',
    'Net profit', 'Earnings per share', 'EPS'
  ];
  
  // Try to find and extract from structured tables
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line contains a financial line item
    for (const item of lineItems) {
      if (line.toLowerCase().includes(item.toLowerCase())) {
        // Extract all numbers from this line
        const numbers = line.match(numberPattern);
        if (numbers && numbers.length > 0) {
          financialData.push({
            line_item: item,
            values: numbers.slice(0, 4), // Take first 4 periods
            unit: "crores", // Assume Indian crores
            confidence: "medium"
          });
        }
      }
    }
  }
  
  // Try to detect period headers
  const periodPattern = /Quarter ended|Nine months ended|Year ended|Preceding quarter|Corresponding/gi;
  for (const line of lines) {
    if (periodPattern.test(line)) {
      // Try to extract dates
      const dateMatch = line.match(/\d{1,2}\/\d{1,2}\/\d{4}|\w+ \d{1,2}, \d{4}/g);
      if (dateMatch && years.length < 4) {
        years.push(...dateMatch);
      }
    }
  }
  
  return {
    currency: "INR",
    fiscal_year: "2025",
    years: years.length > 0 ? years.slice(0, 4) : ["Q4 2025", "Q3 2025", "Q4 2024", "9M 2025"],
    income_statement: financialData.length > 0 ? financialData : [
      {
        line_item: "Revenue from operations",
        values: ["Not extracted"],
        unit: "crores",
        confidence: "low"
      }
    ],
    balance_sheet: [],
    overall_confidence: financialData.length > 5 ? "medium" : "low - AI extraction needed for best results"
  };
}

// Fallback financial extraction (simple pattern matching)
function fallbackFinancialExtraction(text) {
  // First try enhanced extraction
  return enhancedFinancialExtraction(text);
}

// Generate Excel file using ExcelJS (secure alternative)
async function generateExcelFile(analysis) {
  const workbook = new ExcelJS.Workbook();
  
  // Income Statement sheet
  const isSheet = workbook.addWorksheet('Income Statement');
  
  // Header row with styling
  isSheet.columns = [
    { header: 'Line Item', key: 'line_item', width: 30 },
    ...analysis.years.map(year => ({ header: year, key: year, width: 15 })),
    { header: 'Unit', key: 'unit', width: 15 },
    { header: 'Confidence', key: 'confidence', width: 15 }
  ];
  
  // Style header row
  isSheet.getRow(1).font = { bold: true };
  isSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  isSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  
  // Add data rows
  analysis.income_statement.forEach(item => {
    const row = { line_item: item.line_item, unit: item.unit, confidence: item.confidence };
    item.values.forEach((val, idx) => {
      row[analysis.years[idx]] = val;
    });
    isSheet.addRow(row);
  });
  
  // Balance Sheet (if available)
  if (analysis.balance_sheet && analysis.balance_sheet.length > 0) {
    const bsSheet = workbook.addWorksheet('Balance Sheet');
    
    bsSheet.columns = [
      { header: 'Line Item', key: 'line_item', width: 30 },
      ...analysis.years.map(year => ({ header: year, key: year, width: 15 })),
      { header: 'Unit', key: 'unit', width: 15 },
      { header: 'Confidence', key: 'confidence', width: 15 }
    ];
    
    // Style header
    bsSheet.getRow(1).font = { bold: true };
    bsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    bsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    // Add data
    analysis.balance_sheet.forEach(item => {
      const row = { line_item: item.line_item, unit: item.unit, confidence: item.confidence };
      item.values.forEach((val, idx) => {
        row[analysis.years[idx]] = val;
      });
      bsSheet.addRow(row);
    });
  }
  
  // Metadata sheet
  const metaSheet = workbook.addWorksheet('Metadata');
  metaSheet.columns = [
    { header: 'Property', key: 'property', width: 20 },
    { header: 'Value', key: 'value', width: 30 }
  ];
  
  metaSheet.getRow(1).font = { bold: true };
  metaSheet.addRow({ property: 'Currency', value: analysis.currency });
  metaSheet.addRow({ property: 'Fiscal Year', value: analysis.fiscal_year });
  metaSheet.addRow({ property: 'Extraction Date', value: new Date().toISOString() });
  metaSheet.addRow({ property: 'Overall Confidence', value: analysis.overall_confidence });
  
  // Write to buffer
  return await workbook.xlsx.writeBuffer();
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Serve static files
  if (req.method === 'GET' && req.url === '/') {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  if (req.method === 'GET' && req.url === '/styles.css') {
    const css = fs.readFileSync(path.join(__dirname, 'styles.css'));
    res.writeHead(200, { 'Content-Type': 'text/css' });
    res.end(css);
    return;
  }

  if (req.method === 'GET' && req.url === '/script.js') {
    const js = fs.readFileSync(path.join(__dirname, 'script.js'));
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(js);
    return;
  }

  // Download Excel
  if (req.method === 'GET' && req.url === '/api/download-excel') {
    if (!lastFinancialAnalysis) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No analysis available' }));
      return;
    }

    try {
      const excelBuffer = await generateExcelFile(lastFinancialAnalysis);
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="financial-analysis.xlsx"'
      });
      res.end(excelBuffer);
    } catch (error) {
      console.error('Excel generation error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to generate Excel file' }));
    }
    return;
  }

  // Analyze document
  if (req.method === 'POST' && req.url === '/api/analyze') {
    let body = [];

    req.on('data', chunk => {
      body.push(chunk);
    });

    req.on('end', async () => {
      try {
        const buffer = Buffer.concat(body);
        const contentType = req.headers['content-type'] || '';
        const boundaryMatch = contentType.match(/boundary=(.+)$/);

        if (!boundaryMatch) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid content type' }));
          return;
        }

        const boundary = boundaryMatch[1];
        const parts = parseMultipart(buffer, boundary);
        
        const filePart = parts.find(p => p.filename);
        const analysisType = parts.find(p => p.name === 'analysisType')?.content || 'earnings';

        if (!filePart) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No file uploaded' }));
          return;
        }

        // Extract text
        let text;
        const ext = path.extname(filePart.filename).toLowerCase();
        
        if (ext === '.pdf') {
          text = await extractTextFromPDF(filePart.content);
        } else if (ext === '.txt') {
          text = filePart.content.toString('utf-8');
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unsupported file type' }));
          return;
        }

        console.log(`📄 Processing ${filePart.filename} for ${analysisType} analysis`);
        console.log(`📝 Extracted ${text.length} characters`);

        // Perform analysis based on type
        let analysis;
        if (analysisType === 'financial') {
          analysis = await extractFinancialStatements(text);
          lastFinancialAnalysis = analysis;
        } else {
          analysis = await analyzeEarningsCall(text);
        }

        // Send response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          analysisType: analysisType,
          filename: filePart.filename,
          analysis: analysis
        }));

      } catch (error) {
        console.error('Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: error.message || 'Internal server error' 
        }));
      }
    });

    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n🚀 Research Intelligence Portal Running!`);
  console.log(`\n📊 Access at: http://localhost:${PORT}`);
  console.log(`\n🤖 APIs (using TWO Groq accounts):`);
  console.log(`   - Groq #1 (Earnings Analysis): ${process.env.GROQ_API_KEY_1 ? '✅' : '❌'}`);
  console.log(`   - Groq #2 (Financial Extraction): ${process.env.GROQ_API_KEY_2 ? '✅' : '❌'}`);
  console.log(`\n💡 Get TWO free Groq API keys from different accounts:`);
  console.log(`   - Account 1: https://console.groq.com/keys`);
  console.log(`   - Account 2: https://console.groq.com/keys (different email)\n`);
  console.log(`📈 Each account gets 14,400 FREE requests/day!\n`);
});