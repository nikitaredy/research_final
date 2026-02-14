// api/analyze.js - Minimal test version
const Groq = require('groq-sdk');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Quick test response
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
    // Check API keys
    if (!process.env.GROQ_API_KEY_1 || !process.env.GROQ_API_KEY_2) {
      return res.status(500).json({ 
        error: 'API keys not configured',
        help: 'Set GROQ_API_KEY_1 and GROQ_API_KEY_2 in Vercel environment variables'
      });
    }

    // Initialize Groq
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY_1 });

    // Simple test - just return success for now
    return res.status(200).json({
      success: true,
      message: 'Serverless function is working!',
      note: 'This is a test response. Full implementation coming next.'
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
};