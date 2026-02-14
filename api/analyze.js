// api/analyze.js - MATCHES YOUR FRONTEND
const Groq = require('groq-sdk');

const groq1 = new Groq({ apiKey: process.env.GROQ_API_KEY_1 });
const groq2 = new Groq({ apiKey: process.env.GROQ_API_KEY_2 });

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

function extractPdfText(buffer) {
  try {
    const text = buffer.toString('utf-8');
    return text.replace(/[^\x20-\x7E\n]/g, ' ').trim();
  } catch (error) {
    return '';
  }
}

async function extractFinancialData(text) {
  try {
    const response = await groq2.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `Extract ALL financial data from this document. Look for BOTH Income Statement AND Balance Sheet.

DOCUMENT:
${text.substring(0, 15000)}

CRITICAL: Extract BOTH statements if they exist in the document.

Return ONLY valid JSON with this structure:
{
  "income_statement": [
    {
      "line_item": "Revenue from operations",
      "values": ["3558.65", "3191.32", "3355.25"],
      "unit": "crores",
      "confidence": "high"
    }
  ],
  "balance_sheet": [
    {
      "line_item": "Non-current assets",
      "values": ["5000", "4500", "4000"],
      "unit": "crores", 
      "confidence": "high"
    },
    {
      "line_item": "Current assets",
      "values": ["2000", "1800", "1600"],
      "unit": "crores",
      "confidence": "high"
    },
    {
      "line_item": "Total assets",
      "values": ["7000", "6300", "5600"],
      "unit": "crores",
      "confidence": "high"
    },
    {
      "line_item": "Equity",
      "values": ["4000", "3500", "3000"],
      "unit": "crores",
      "confidence": "high"
    },
    {
      "line_item": "Non-current liabilities",
      "values": ["2000", "1800", "1600"],
      "unit": "crores",
      "confidence": "high"
    },
    {
      "line_item": "Current liabilities",
      "values": ["1000", "1000", "1000"],
      "unit": "crores",
      "confidence": "high"
    }
  ],
  "years": ["2025", "2024", "2023"],
  "currency": "INR",
  "fiscal_year": "2024-25",
  "overall_confidence": "high"
}

IMPORTANT: Even if Balance Sheet data is limited, include at least Total Assets, Total Liabilities, and Total Equity if they exist.`
      }],
      temperature: 0.1,
      max_tokens: 4000
    });

    const content = response.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (error) {
    console.error('Financial extraction error:', error);
    return null;
  }
}

async function analyzeEarnings(text) {
  try {
    const response = await groq1.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `Analyze earnings call and return ONLY valid JSON:

${text.substring(0, 10000)}

Return this structure:
{
  "management_tone": "optimistic",
  "confidence_level": "high",
  "tone_explanation": "Management expressed strong confidence...",
  "key_positives": ["point1", "point2", "point3"],
  "key_concerns": ["concern1", "concern2"],
  "forward_guidance": {
    "revenue": "Q4: $900-950M",
    "margin": "22-25%",
    "capex": "$50-60M",
    "other": "Expanding capacity by 20%"
  },
  "capacity_utilization": "Operating at 85% capacity...",
  "growth_initiatives": ["AI product launch", "International expansion"],
  "notable_quotes": ["We see unprecedented demand", "Best quarter in company history"],
  "analysis_confidence": "high"
}`
      }],
      temperature: 0.3
    });

    const content = response.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (error) {
    console.error('Earnings analysis error:', error);
    return null;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'ok', 
      message: 'API is working!',
      env_check: {
        key1: process.env.GROQ_API_KEY_1 ? 'Set ✓' : 'Missing ✗',
        key2: process.env.GROQ_API_KEY_2 ? 'Set ✓' : 'Missing ✗'
      }
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Processing request...');

    if (!process.env.GROQ_API_KEY_1 || !process.env.GROQ_API_KEY_2) {
      return res.status(500).json({ 
        error: 'API keys not configured'
      });
    }

    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const buffer = Buffer.concat(buffers);

    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    
    if (!boundaryMatch) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    const parts = parseMultipart(buffer, boundaryMatch[1]);
    
    // IMPORTANT: Accept both 'file' and 'document' field names
    const filePart = parts.find(p => p.filename && (p.name === 'file' || p.name === 'document'));
    const analysisType = parts.find(p => p.name === 'analysisType')?.content || 'earnings';

    if (!filePart) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File received:', filePart.filename);
    console.log('Analysis type:', analysisType);

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
      return res.status(400).json({ error: 'Could not extract text from file. For scanned PDFs, please convert to TXT using PDF2Go first.' });
    }

    console.log('Text extracted, length:', text.length);

    let analysis;
    if (analysisType === 'financial') {
      analysis = await extractFinancialData(text);
    } else {
      analysis = await analyzeEarnings(text);
    }

    if (!analysis) {
      return res.status(500).json({ error: 'Analysis failed. Please try again.' });
    }

    // If balance sheet is empty but we have income statement, try to find balance sheet in the text
    if (analysisType === 'financial' && 
        analysis.income_statement && 
        analysis.income_statement.length > 0 &&
        (!analysis.balance_sheet || analysis.balance_sheet.length === 0)) {
      
      console.log('Balance sheet empty, checking if it exists in document...');
      
      // Check if document mentions balance sheet
      const hasBalanceSheet = text.toLowerCase().includes('balance sheet') || 
                             text.toLowerCase().includes('statement of financial position') ||
                             text.toLowerCase().includes('total assets') ||
                             text.toLowerCase().includes('shareholders equity');
      
      if (hasBalanceSheet) {
        console.log('Balance sheet detected in document, re-extracting with focus on balance sheet...');
        
        // Try again with balance sheet specific prompt
        const bsResponse = await groq2.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{
            role: 'user',
            content: `Focus ONLY on extracting Balance Sheet / Statement of Financial Position from this text.

${text.substring(0, 15000)}

Return ONLY JSON array of balance sheet line items:
{
  "balance_sheet": [
    {
      "line_item": "Non-current assets",
      "values": ["value1", "value2", "value3"],
      "unit": "crores",
      "confidence": "high"
    }
  ],
  "years": ["2025", "2024", "2023"]
}`
          }],
          temperature: 0.1,
          max_tokens: 3000
        });
        
        const bsContent = bsResponse.choices[0].message.content.trim();
        const bsJsonMatch = bsContent.match(/\{[\s\S]*\}/);
        
        if (bsJsonMatch) {
          const bsData = JSON.parse(bsJsonMatch[0]);
          if (bsData.balance_sheet && bsData.balance_sheet.length > 0) {
            analysis.balance_sheet = bsData.balance_sheet;
            console.log('Balance sheet extracted:', bsData.balance_sheet.length, 'items');
          }
        }
      }
    }

    console.log('Analysis complete');
    if (analysisType === 'financial') {
  console.log('DEBUG - Income statement items:', analysis.income_statement?.length || 0);
  console.log('DEBUG - Balance sheet items:', analysis.balance_sheet?.length || 0);
  if (analysis.balance_sheet) {
    console.log('DEBUG - Balance sheet data:', JSON.stringify(analysis.balance_sheet.slice(0, 2)));
  }
}

    // Return in the format your frontend expects
    return res.status(200).json({
      success: true,
      analysisType: analysisType,
      analysis: analysis
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};