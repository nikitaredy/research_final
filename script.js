let selectedFile = null;
let analysisType = 'earnings'; // Default

// File upload handling
const uploadBox = document.getElementById('uploadBox');
const fileInput = document.getElementById('fileInput');
const fileSelected = document.getElementById('fileSelected');
const fileName = document.getElementById('fileName');
const analyzeBtn = document.getElementById('analyzeBtn');

// Drag and drop
uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.classList.add('dragover');
});

uploadBox.addEventListener('dragleave', () => {
    uploadBox.classList.remove('dragover');
});

uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

uploadBox.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    const validTypes = ['application/pdf', 'text/plain'];
    if (!validTypes.includes(file.type)) {
        alert('Please upload a PDF or TXT file');
        return;
    }

    selectedFile = file;
    fileName.textContent = file.name;
    fileSelected.style.display = 'flex';
    document.getElementById('uploadSection').querySelector('.upload-box').style.display = 'none';
    analyzeBtn.disabled = false;
}

function removeFile() {
    selectedFile = null;
    fileInput.value = '';
    fileSelected.style.display = 'none';
    document.getElementById('uploadSection').querySelector('.upload-box').style.display = 'block';
    analyzeBtn.disabled = true;
}

function selectAnalysis(type) {
    analysisType = type;
    document.querySelectorAll('.analysis-card').forEach(card => {
        card.classList.remove('active');
    });
    document.querySelector(`[data-type="${type}"]`).classList.add('active');
    document.getElementById(type).checked = true;
}

async function analyzeDocument() {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('analysisType', analysisType);

    document.getElementById('loading').style.display = 'block';
    document.getElementById('results').style.display = 'none';
    
    const loadingText = document.getElementById('loadingText');
    loadingText.textContent = analysisType === 'financial' 
        ? 'Extracting financial data with DeepSeek...' 
        : 'Analyzing earnings call with Groq...';

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Analysis failed');
        }

        displayResults(data);
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

function displayResults(data) {
    const resultsDiv = document.getElementById('results');
    
    if (data.analysisType === 'earnings') {
        resultsDiv.innerHTML = generateEarningsHTML(data.analysis);
    } else {
        resultsDiv.innerHTML = generateFinancialHTML(data.analysis);
    }
    
    resultsDiv.style.display = 'block';
    resultsDiv.scrollIntoView({ behavior: 'smooth' });
}

function generateEarningsHTML(analysis) {
    return `
        <div class="result-header">
            <h2>Earnings Call Analysis</h2>
        </div>

        <div class="result-section">
            <h3>📈 Management Assessment</h3>
            <div class="metric-grid">
                <div class="metric-card">
                    <div class="metric-label">Tone</div>
                    <div class="metric-value">${analysis.management_tone || 'N/A'}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Confidence Level</div>
                    <div class="metric-value">${analysis.confidence_level || 'N/A'}</div>
                </div>
            </div>
            <p style="color: #a1a1aa; margin-top: 1rem;">${analysis.tone_explanation || ''}</p>
        </div>

        <div class="result-section">
            <h3>✅ Key Positives</h3>
            <ul class="insights-list">
                ${(analysis.key_positives || []).map(p => `<li>${p}</li>`).join('')}
            </ul>
        </div>

        <div class="result-section">
            <h3>⚠️ Key Concerns</h3>
            <ul class="insights-list concerns">
                ${(analysis.key_concerns || []).map(c => `<li>${c}</li>`).join('')}
            </ul>
        </div>

        <div class="result-section">
            <h3>🎯 Forward Guidance</h3>
            <div class="table-container">
                <table>
                    <tr>
                        <th>Metric</th>
                        <th>Guidance</th>
                    </tr>
                    <tr>
                        <td>Revenue</td>
                        <td>${analysis.forward_guidance?.revenue || 'Not provided'}</td>
                    </tr>
                    <tr>
                        <td>Margin</td>
                        <td>${analysis.forward_guidance?.margin || 'Not provided'}</td>
                    </tr>
                    <tr>
                        <td>CapEx</td>
                        <td>${analysis.forward_guidance?.capex || 'Not provided'}</td>
                    </tr>
                    <tr>
                        <td>Other</td>
                        <td>${analysis.forward_guidance?.other || 'Not provided'}</td>
                    </tr>
                </table>
            </div>
        </div>

        <div class="result-section">
            <h3>🏭 Capacity Utilization</h3>
            <p style="color: #e4e4e7;">${analysis.capacity_utilization || 'Not discussed'}</p>
        </div>

        <div class="result-section">
            <h3>🚀 Growth Initiatives</h3>
            <ul class="insights-list">
                ${(analysis.growth_initiatives || []).map(i => `<li>${i}</li>`).join('')}
            </ul>
        </div>

        <div class="result-section">
            <h3>💬 Notable Quotes</h3>
            ${(analysis.notable_quotes || []).map(q => `
                <div style="background: #0a0a0a; border-left: 3px solid #3b82f6; padding: 1rem 1.25rem; border-radius: 4px; margin-bottom: 0.75rem; font-style: italic; color: #e4e4e7;">
                    "${q}"
                </div>
            `).join('')}
        </div>

        <div class="result-section" style="background: #1e2837; padding: 1rem; border-radius: 8px;">
            <p style="color: #a1a1aa; font-size: 0.875rem;">
                <strong>Analysis Confidence:</strong> ${analysis.analysis_confidence || 'N/A'}
            </p>
        </div>
    `;
}

function generateFinancialHTML(analysis) {
    return `
        <div class="result-header">
            <h2>Financial Statement Extraction</h2>
            <button class="download-btn" onclick="downloadExcel()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-15"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download Excel
            </button>
        </div>

        <div class="result-section">
            <h3>📊 Income Statement</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Line Item</th>
                            ${(analysis.years || []).map(y => `<th>${y}</th>`).join('')}
                            <th>Unit</th>
                            <th>Confidence</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(analysis.income_statement || []).map(item => `
                            <tr>
                                <td>${item.line_item}</td>
                                ${item.values.map(v => `<td>${v || '-'}</td>`).join('')}
                                <td>${item.unit || ''}</td>
                                <td><span style="color: ${getConfidenceColor(item.confidence)}">${item.confidence}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        ${analysis.balance_sheet && analysis.balance_sheet.length > 0 ? `
        <div class="result-section">
            <h3>💰 Balance Sheet</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Line Item</th>
                            ${(analysis.years || []).map(y => `<th>${y}</th>`).join('')}
                            <th>Unit</th>
                            <th>Confidence</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${analysis.balance_sheet.map(item => `
                            <tr>
                                <td>${item.line_item}</td>
                                ${item.values.map(v => `<td>${v || '-'}</td>`).join('')}
                                <td>${item.unit || ''}</td>
                                <td><span style="color: ${getConfidenceColor(item.confidence)}">${item.confidence}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        ` : ''}

        <div class="result-section" style="background: #1e2837; padding: 1rem; border-radius: 8px;">
            <p style="color: #a1a1aa; font-size: 0.875rem;">
                <strong>Currency:</strong> ${analysis.currency || 'Unknown'} | 
                <strong>Fiscal Year:</strong> ${analysis.fiscal_year || 'N/A'} |
                <strong>Extraction Confidence:</strong> ${analysis.overall_confidence || 'Medium'}
            </p>
        </div>
    `;
}

function getConfidenceColor(confidence) {
    if (confidence === 'high') return '#10b981';
    if (confidence === 'medium') return '#f59e0b';
    return '#ef4444';
}

function downloadExcel() {
    // Trigger Excel download
    window.location.href = '/api/download-excel';
}
