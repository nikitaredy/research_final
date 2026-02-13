// modules/excelGenerator.js
// PROFESSIONAL EXCEL GENERATION MODULE

const ExcelJS = require('exceljs');

class ExcelGenerator {
  async generate(analysis) {
    const workbook = new ExcelJS.Workbook();
    
    // Income Statement Sheet
    const isSheet = workbook.addWorksheet('Income Statement');
    this.styleSheet(isSheet, analysis, 'income_statement');
    
    // Balance Sheet (if exists)
    if (analysis.balance_sheet && analysis.balance_sheet.length > 0) {
      const bsSheet = workbook.addWorksheet('Balance Sheet');
      this.styleSheet(bsSheet, analysis, 'balance_sheet');
    }
    
    // Cash Flow (if exists)
    if (analysis.cash_flow && analysis.cash_flow.length > 0) {
      const cfSheet = workbook.addWorksheet('Cash Flow');
      this.styleSheet(cfSheet, analysis, 'cash_flow');
    }
    
    // Metadata Sheet
    const metaSheet = workbook.addWorksheet('Metadata');
    this.addMetadataSheet(metaSheet, analysis);
    
    return await workbook.xlsx.writeBuffer();
  }

  styleSheet(sheet, analysis, dataKey) {
    // Setup columns
    const columns = [
      { header: 'Line Item', key: 'line_item', width: 40 }
    ];
    
    (analysis.years || []).forEach(year => {
      columns.push({ header: year, key: year.replace(/\s+/g, '_'), width: 20 });
    });
    
    columns.push(
      { header: 'Unit', key: 'unit', width: 15 },
      { header: 'Confidence', key: 'confidence', width: 15 }
    );
    
    sheet.columns = columns;
    
    // Style header
    const headerRow = sheet.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A5F' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Add data
    (analysis[dataKey] || []).forEach(item => {
      const row = { 
        line_item: item.line_item, 
        unit: item.unit || analysis.unit,
        confidence: item.confidence 
      };
      
      (item.values || []).forEach((val, idx) => {
        const yearKey = (analysis.years || [])[idx];
        if (yearKey) {
          row[yearKey.replace(/\s+/g, '_')] = val;
        }
      });
      
      const newRow = sheet.addRow(row);
      
      // Style numbers
      newRow.eachCell((cell, colNumber) => {
        if (colNumber > 1 && colNumber <= (analysis.years || []).length + 1) {
          cell.numFmt = '#,##0.00_);[Red](#,##0.00)';
        }
        
        // Color code confidence
        if (colNumber === columns.length) { // Confidence column
          if (item.confidence === 'high') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF90EE90' }
            };
          } else if (item.confidence === 'medium') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFE4B5' }
            };
          }
        }
      });
    });
  }

  addMetadataSheet(sheet, analysis) {
    sheet.columns = [
      { header: 'Property', key: 'property', width: 25 },
      { header: 'Value', key: 'value', width: 40 }
    ];
    
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    
    const metadata = [
      { property: 'Currency', value: analysis.currency },
      { property: 'Unit', value: analysis.unit },
      { property: 'Overall Confidence', value: analysis.overall_confidence },
      { property: 'Extraction Date', value: new Date().toLocaleString() },
      { property: 'Income Statement Items', value: analysis.income_statement?.length || 0 },
      { property: 'Balance Sheet Items', value: analysis.balance_sheet?.length || 0 },
      { property: 'Cash Flow Items', value: analysis.cash_flow?.length || 0 },
      { property: 'Notes', value: analysis.extraction_notes || 'None' }
    ];
    
    metadata.forEach(item => sheet.addRow(item));
  }
}

module.exports = ExcelGenerator;