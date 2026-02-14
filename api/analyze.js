// api/analyze.js - Vercel Serverless Function (keeps your existing UI)
const Groq = require('groq-sdk');

// Initialize Groq clients
const groq1 = new Groq({ apiKey: process.env.GROQ_API_KEY_1 });
const groq2 = new Groq({ apiKey: process.env.GROQ_API_KEY_2 });

// Helper: Parse multipart form data
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

// Simplified PDF text extraction
function extractPdfText(buffer) {
  try {
    const text = buffer.toString('utf-8');
    return text.replace(/[^\x20-\x7E\n]/g, ' ').trim();
  } catch (error) {
    console.error('PDF extraction error:', error);
    return '';
  }
}

// Financial extraction with Groq
async function extractFinancialData(text) {
  try {
    const response = await groq2.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `Extract financial data from this document and return ONLY valid JSON (no markdown, no explanations):

${text.substring(0, 12000)}

Return this exact structure:
{
  "incomeStatement": {
    "revenue": ["100M", "90M", "80M"],
    "costOfRevenue": ["60M", "55M", "50M"],
    "grossProfit": ["40M", "35M", "30M"],
    "operatingExpenses": ["20M", "18M", "16M"],
    "operatingIncome": ["20M", "17M", "14M"],
    "netIncome": ["15M", "13M", "11M"],
    "eps": ["1.50", "1.30", "1.10"]
  },
  "balanceSheet": {
    "totalAssets": ["500M", "450M", "400M"],
    "currentAssets": ["200M", "180M", "160M"],
    "totalLiabilities": ["300M", "270M", "240M"],
    "currentLiabilities": ["100M", "90M", "80M"],
    "shareholdersEquity": ["200M", "180M", "160M"]
  },
  "years": ["2024", "2023", "2022"],
  "currency": "USD",
  "confidence": "high"
}`
      }],
      temperature: 0.1
    });

    const content = response.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (error) {
    console.error('Groq API error:', error);
    return null;
  }
}

// Earnings analysis with Groq
async function analyzeEarnings(text) {
  try {
    const response = await groq1.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `Analyze this earnings call transcript and return ONLY valid JSON (no markdown):

${text.substring(0, 10000)}

Return this exact structure:
{
  "tone": "optimistic/neutral/concerned",
  "confidence": "high/medium/low",
  "positives": ["point1", "point2"],
  "concerns": ["concern1", "concern2"],
  "guidance": {
    "revenue": "Q4: $X-Y",
    "margin": "20-25%",
    "other": "details"
  },
  "quotes": ["quote1", "quote2"]
}`
      }],
      temperature: 0.3
    });

    const content = response.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (error) {
    console.error('Groq API error:', error);
    return null;
  }
}

// Main Vercel handler
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get raw body
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const buffer = Buffer.concat(buffers);

    // Parse multipart
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    
    if (!boundaryMatch) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    const parts = parseMultipart(buffer, boundaryMatch[1]);
    const filePart = parts.find(p => p.filename);
    const analysisType = parts.find(p => p.name === 'analysisType')?.content || 'earnings';

    if (!filePart) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Extract text
    let text = '';
    const ext = filePart.filename.toLowerCase().split('.').pop();
    
    if (ext === 'pdf') {
      text = extractPdfText(filePart.content);
    } else if (ext === 'txt') {
      text = filePart.content.toString('utf-8');
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Use PDF or TXT.' });
    }

    if (!text || text.length < 100) {
      return res.status(400).json({ error: 'Could not extract text from file' });
    }

    // Analyze
    let analysis;
    if (analysisType === 'financial') {
      analysis = await extractFinancialData(text);
    } else {
      analysis = await analyzeEarnings(text);
    }

    if (!analysis) {
      return res.status(500).json({ error: 'Analysis failed. Check API keys.' });
    }

    return res.status(200).json({
      success: true,
      analysisType,
      filename: filePart.filename,
      analysis,
      ocrAvailable: false
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};