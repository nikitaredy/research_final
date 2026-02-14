// script.js - Enhanced with proper file upload handling
let selectedFile = null;
let analysisType = 'earnings';

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadState = document.getElementById('uploadState');
const fileSelected = document.getElementById('fileSelected');
const fileName = document.getElementById('fileName');
const fileMeta = document.getElementById('fileMeta');
const analyzeBtn = document.getElementById('analyzeBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const resultsDiv = document.getElementById('results');
const toastContainer = document.getElementById('toastContainer');

// Initialize event listeners
function init() {
    // File upload handling
    uploadArea.addEventListener('click', (e) => {
        // Don't trigger if clicking remove button
        if (!e.target.closest('.remove-file')) {
            fileInput.click();
        }
    });

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    // Remove file button
    document.getElementById('removeFileBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        removeFile();
    });

    // Browse button
    document.getElementById('browseBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    // Analysis card selection
    document.querySelectorAll('.analysis-card').forEach(card => {
        card.addEventListener('click', () => {
            const type = card.dataset.type;
            selectAnalysis(type);
        });
    });

    // Analyze button
    analyzeBtn.addEventListener('click', analyzeDocument);
}

// Handle file selection
function handleFileSelect(file) {
    // Validate file type
    const validTypes = ['application/pdf', 'text/plain'];
    const fileExt = file.name.split('.').pop().toLowerCase();
    
    if (!validTypes.includes(file.type) && !['pdf', 'txt'].includes(fileExt)) {
        showToast('Please upload a PDF or TXT file', 'error');
        return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
        showToast('File size must be less than 50MB', 'error');
        return;
    }

    selectedFile = file;
    
    // Update UI
    fileName.textContent = file.name;
    
    // Format file size
    const fileSize = formatFileSize(file.size);
    const fileType = file.name.split('.').pop().toUpperCase();
    fileMeta.textContent = `${fileSize} · ${fileType}`;
    
    // Show selected file state
    uploadState.style.display = 'none';
    fileSelected.style.display = 'block';
    
    // Enable analyze button
    analyzeBtn.disabled = false;
    
    showToast('File uploaded successfully', 'success');
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Remove file
function removeFile() {
    selectedFile = null;
    fileInput.value = '';
    
    // Update UI
    uploadState.style.display = 'block';
    fileSelected.style.display = 'none';
    
    // Disable analyze button
    analyzeBtn.disabled = true;
    
    showToast('File removed', 'info');
}

// Select analysis type
function selectAnalysis(type) {
    analysisType = type;
    
    // Update UI
    document.querySelectorAll('.analysis-card').forEach(card => {
        card.classList.remove('active');
        const radio = card.querySelector('.radio-custom');
        radio.classList.remove('checked');
    });
    
    const selectedCard = document.querySelector(`[data-type="${type}"]`);
    selectedCard.classList.add('active');
    const radio = selectedCard.querySelector('.radio-custom');
    radio.classList.add('checked');
    
    // Update radio input
    document.getElementById(type).checked = true;
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${type === 'success' ? '<path d="M20 6L9 17l-5-5"/>' : ''}
            ${type === 'error' ? '<circle cx="12" cy="12" r="10"/><path d="M12 8v8M12 16h.01"/>' : ''}
            ${type === 'info' ? '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' : ''}
        </svg>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Update loading progress
function updateLoadingProgress(step, message) {
    const steps = document.querySelectorAll('.step');
    steps.forEach((s, index) => {
        if (index < step) {
            s.classList.add('active');
        } else {
            s.classList.remove('active');
        }
    });
    
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = (step * 25) + '%';
    
    document.getElementById('loadingMessage').textContent = message;
}

// Analyze document
async function analyzeDocument() {
    if (!selectedFile) {
        showToast('Please select a file first', 'error');
        return;
    }

    // Show loading overlay
    loadingOverlay.style.display = 'flex';
    resultsDiv.style.display = 'none';
    
    // Update loading messages based on analysis type
    const loadingTitle = document.getElementById('loadingTitle');
    const loadingMessage = document.getElementById('loadingMessage');
    
    if (analysisType === 'financial') {
        loadingTitle.textContent = 'Extracting Financial Data';
        loadingMessage.textContent = 'Using AI to extract precise financial numbers...';
    } else {
        loadingTitle.textContent = 'Analyzing Earnings Call';
        loadingMessage.textContent = 'Processing transcript for insights...';
    }

    // Simulate progress steps
    let step = 1;
    const progressInterval = setInterval(() => {
        if (step < 4) {
            updateLoadingProgress(step, getLoadingMessage(step));
            step++;
        }
    }, 2000);

    try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('analysisType', analysisType);

        const response = await fetch('/api/analyze', {
            method: 'POST',
            body: formData
        });

        clearInterval(progressInterval);
        updateLoadingProgress(4, 'Complete!');

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Analysis failed');
        }

        // Small delay to show completion
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            displayResults(data);
            showToast('Analysis complete!', 'success');
        }, 1000);

    } catch (error) {
        clearInterval(progressInterval);
        loadingOverlay.style.display = 'none';
        showToast('Error: ' + error.message, 'error');
    }
}

// Get loading message for each step
function getLoadingMessage(step) {
    if (analysisType === 'financial') {
        const messages = [
            'Reading document and detecting tables...',
            'Extracting line items with precision...',
            'Preserving exact numbers and decimals...',
            'Formatting data for Excel export...'
        ];
        return messages[step - 1];
    } else {
        const messages = [
            'Analyzing management tone...',
            'Extracting key positives and concerns...',
            'Identifying forward guidance...',
            'Generating summary report...'
        ];
        return messages[step - 1];
    }
}

// Display results (keeping your original display logic but with better styling)
function displayResults(data) {
    if (data.analysisType === 'earnings') {
        resultsDiv.innerHTML = generateEarningsHTML(data.analysis);
    } else {
        resultsDiv.innerHTML = generateFinancialHTML(data.analysis);
    }
    
    resultsDiv.style.display = 'block';
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Your existing HTML generation functions (keep them exactly as you had)
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
    window.location.href = '/api/download-excel';
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);