// modules/financialExtractor.js
// PRECISION FINANCIAL EXTRACTION MODULE

const TableExtractor = require('./tableExtractor');

class FinancialExtractor {
  constructor(groqClient) {
    this.groq = groqClient;
    this.tableExtractor = new TableExtractor();
  }

  async extract(text) {
    console.log('🧠 [Financial Extractor] Starting precision extraction...');
    
    // First, extract tables
    const tables = this.tableExtractor.extractTables(text);
    const tableSummary = this.tableExtractor.formatForPrompt(tables);
    
    const prompt = `You are an expert financial data extraction AI. Extract ALL financial statement data with EXACT precision.

${tableSummary}

DOCUMENT TEXT:
${text.substring(0, 25000)}

CRITICAL RULES:
1. Extract EVERY line item from financial tables
2. Preserve EXACT numbers with commas (e.g., 3,558.65)
3. Keep parentheses for negatives (e.g., (1,234) = -1,234)
4. Use EXACT line item names from document
5. Identify ALL time periods

Respond with THIS EXACT JSON structure:

{
  "currency": "INR",
  "unit": "crores",
  "years": ["detected period 1", "detected period 2"],
  "income_statement": [
    {
      "line_item": "exact line item name",
      "values": ["exact number 1", "exact number 2"],
      "unit": "detected unit",
      "confidence": "high"
    }
  ],
  "balance_sheet": [],
  "cash_flow": [],
  "overall_confidence": "high",
  "extraction_notes": "any notes about extraction"
}`;

    try {
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a precision financial extraction expert. Extract EXACT numbers. Preserve all formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0,
        max_tokens: 6000
      });

      let response = completion.choices[0].message.content;
      response = response.trim().replace(/```json|```/g, '');
      
      const start = response.indexOf('{');
      const end = response.lastIndexOf('}') + 1;
      if (start >= 0 && end > start) {
        response = response.substring(start, end);
      }

      const parsed = JSON.parse(response);
      
      // Enhance with table data if AI missed something
      const needsEnhancement = 
        (tables.incomeStatement.length > 0 && (!parsed.income_statement || parsed.income_statement.length < 5)) ||
        (tables.balanceSheet.length > 0 && (!parsed.balance_sheet || parsed.balance_sheet.length < 5)) ||
        (tables.cashFlow.length > 0 && (!parsed.cash_flow || parsed.cash_flow.length < 3));
      
      if (needsEnhancement) {
        console.log('⚠️ AI extraction sparse, enhancing with table data...');
        this.enhanceWithTableData(parsed, tables);
      }
      
      return parsed;
      
    } catch (error) {
      console.error('Financial extraction error:', error.message);
      return this.fallback(text, tables);
    }
  }

  enhanceWithTableData(parsed, tables) {
    // Enhance Income Statement
    if (!parsed.income_statement) parsed.income_statement = [];
    
    tables.incomeStatement.forEach(table => {
      table.rows.forEach(row => {
        const exists = parsed.income_statement.some(
          item => item.line_item.toLowerCase() === row.line_item.toLowerCase()
        );
        
        if (!exists) {
          parsed.income_statement.push({
            line_item: row.line_item,
            values: row.values,
            unit: parsed.unit || 'crores',
            confidence: 'medium'
          });
        }
      });
    });
    
    // Enhance Balance Sheet (THIS WAS MISSING!)
    if (!parsed.balance_sheet) parsed.balance_sheet = [];
    
    tables.balanceSheet.forEach(table => {
      table.rows.forEach(row => {
        const exists = parsed.balance_sheet.some(
          item => item.line_item.toLowerCase() === row.line_item.toLowerCase()
        );
        
        if (!exists) {
          parsed.balance_sheet.push({
            line_item: row.line_item,
            values: row.values,
            unit: parsed.unit || 'crores',
            confidence: 'medium'
          });
        }
      });
    });
    
    // Enhance Cash Flow
    if (!parsed.cash_flow) parsed.cash_flow = [];
    
    tables.cashFlow.forEach(table => {
      table.rows.forEach(row => {
        const exists = parsed.cash_flow.some(
          item => item.line_item.toLowerCase() === row.line_item.toLowerCase()
        );
        
        if (!exists) {
          parsed.cash_flow.push({
            line_item: row.line_item,
            values: row.values,
            unit: parsed.unit || 'crores',
            confidence: 'medium'
          });
        }
      });
    });
  }

  fallback(text, tables) {
    console.log('📊 Using fallback extraction');
    
    const result = {
      currency: this.detectCurrency(text),
      unit: this.detectUnit(text),
      years: [],
      income_statement: [],
      balance_sheet: [],
      cash_flow: [],
      overall_confidence: "medium",
      extraction_notes: "Used fallback extraction method"
    };
    
    // Use Income Statement table data if available
    if (tables.incomeStatement.length > 0) {
      tables.incomeStatement.forEach(table => {
        if (result.years.length === 0) result.years = table.periods;
        table.rows.forEach(row => {
          result.income_statement.push({
            line_item: row.line_item,
            values: row.values,
            unit: result.unit,
            confidence: "medium"
          });
        });
      });
    }
    
    // Use Balance Sheet table data if available (THIS WAS MISSING!)
    if (tables.balanceSheet.length > 0) {
      tables.balanceSheet.forEach(table => {
        if (result.years.length === 0) result.years = table.periods;
        table.rows.forEach(row => {
          result.balance_sheet.push({
            line_item: row.line_item,
            values: row.values,
            unit: result.unit,
            confidence: "medium"
          });
        });
      });
    }
    
    // Use Cash Flow table data if available
    if (tables.cashFlow.length > 0) {
      tables.cashFlow.forEach(table => {
        if (result.years.length === 0) result.years = table.periods;
        table.rows.forEach(row => {
          result.cash_flow.push({
            line_item: row.line_item,
            values: row.values,
            unit: result.unit,
            confidence: "medium"
          });
        });
      });
    }
    
    return result;
  }

  detectCurrency(text) {
    if (text.match(/rs\.?|inr|rupee/i)) return "INR";
    if (text.match(/\$|usd|dollar/i)) return "USD";
    if (text.match(/€|eur|euro/i)) return "EUR";
    return "INR";
  }

  detectUnit(text) {
    if (text.match(/crore|cr\.?/i)) return "crores";
    if (text.match(/million|mn/i)) return "millions";
    if (text.match(/billion|bn/i)) return "billions";
    if (text.match(/lakh|lacs/i)) return "lakhs";
    return "crores";
  }
}

module.exports = FinancialExtractor;