// modules/tableExtractor.js
// PROFESSIONAL TABLE EXTRACTION MODULE

class TableExtractor {
  /**
   * Extract tables from text
   */
  extractTables(text) {
    const tables = {
      incomeStatement: [],
      balanceSheet: [],
      cashFlow: [],
      all: []
    };
    
    const lines = text.split('\n');
    let currentTable = [];
    let inTable = false;
    
    for (let line of lines) {
      // Detect table boundaries
      if (line.includes('📊 TABLE_ROW:') || line.includes('DETECTED TABLES:')) {
        inTable = true;
        continue;
      }
      
      if (line.includes('='.repeat(80)) && inTable) {
        if (currentTable.length > 0) {
          const parsed = this.parseTable(currentTable);
          tables.all.push(parsed);
          
          // Categorize table
          if (this.isIncomeStatement(parsed)) {
            tables.incomeStatement.push(parsed);
          } else if (this.isBalanceSheet(parsed)) {
            tables.balanceSheet.push(parsed);
          } else if (this.isCashFlow(parsed)) {
            tables.cashFlow.push(parsed);
          }
          
          currentTable = [];
        }
        inTable = false;
        continue;
      }
      
      if (inTable && line.trim() && !line.includes('--- PAGE')) {
        currentTable.push(line.replace('📊 TABLE_ROW:', '').trim());
      }
    }
    
    return tables;
  }

  /**
   * Parse table into structured format
   */
  parseTable(tableRows) {
    const parsed = {
      headers: [],
      rows: [],
      periods: []
    };
    
    tableRows.forEach((row, index) => {
      // Try to detect headers (first row often has periods)
      if (index === 0) {
        const possibleHeaders = row.split(/\s{2,}|\t/);
        possibleHeaders.forEach(header => {
          if (header.match(/quarter|ended|as at|year|month|period/i)) {
            parsed.headers.push(header.trim());
          }
          if (header.match(/\d{4}|\d{1,2}\s+[a-z]+/i)) {
            parsed.periods.push(header.trim());
          }
        });
      }
      
      // Extract line item and numbers
      const numbers = row.match(/\d+[,.]?\d*|\(\d+[,.]?\d*\)/g) || [];
      if (numbers.length > 0) {
        // Get line item (text before first number)
        const firstNumberIndex = row.search(/\d/);
        const lineItem = firstNumberIndex > 0 
          ? row.substring(0, firstNumberIndex).trim() 
          : `Line Item ${parsed.rows.length + 1}`;
        
        parsed.rows.push({
          line_item: lineItem,
          values: numbers
        });
      }
    });
    
    return parsed;
  }

  /**
   * Detect if table is income statement
   */
  isIncomeStatement(table) {
    const keywords = ['revenue', 'income', 'cost', 'expense', 'profit', 'ebitda', 'eps'];
    return this.checkKeywords(table, keywords);
  }

  /**
   * Detect if table is balance sheet
   */
  isBalanceSheet(table) {
    const keywords = ['asset', 'liability', 'equity', 'share capital', 'reserve', 'borrowing'];
    return this.checkKeywords(table, keywords);
  }

  /**
   * Detect if table is cash flow
   */
  isCashFlow(table) {
    const keywords = ['cash flow', 'operating', 'investing', 'financing', 'net cash'];
    return this.checkKeywords(table, keywords);
  }

  /**
   * Check table for keywords
   */
  checkKeywords(table, keywords) {
    const text = JSON.stringify(table).toLowerCase();
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * Format tables for AI prompt
   */
  formatForPrompt(tables) {
    let formatted = '\n--- EXTRACTED TABLES ---\n';
    
    if (tables.incomeStatement.length > 0) {
      formatted += '\nINCOME STATEMENT TABLES:\n';
      tables.incomeStatement.forEach((table, idx) => {
        formatted += `Table ${idx + 1}:\n`;
        formatted += `Periods: ${table.periods.join(', ')}\n`;
        formatted += `Rows: ${table.rows.length}\n`;
        table.rows.slice(0, 5).forEach(row => {
          formatted += `  ${row.line_item}: ${row.values.join(' | ')}\n`;
        });
      });
    }
    
    if (tables.balanceSheet.length > 0) {
      formatted += '\nBALANCE SHEET TABLES:\n';
      tables.balanceSheet.forEach((table, idx) => {
        formatted += `Table ${idx + 1}: ${table.rows.length} rows\n`;
      });
    }
    
    return formatted;
  }
}

module.exports = TableExtractor;