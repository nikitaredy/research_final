# 🚀 Research Intelligence Portal - Complete Setup Guide

A professional research portal with TWO AI-powered tools:
- ✅ **Financial Statement Extraction** (DeepSeek - FREE & Smart)
- ✅ **Earnings Call Analysis** (Groq - FREE & Fast)

---

## 🎯 Step 1: Get FREE API Keys

### Groq API (for Earnings Analysis)
1. Go to: **https://console.groq.com/keys**
2. Sign up (FREE account)
3. Click **"Create API Key"**
4. Copy your key (starts with `gsk_...`)

**Free Tier:** 14,400 requests/day!

### DeepSeek API (for Financial Extraction)
1. Go to: **https://platform.deepseek.com/api_keys**
2. Sign up (FREE account)
3. Click **"Create API Key"**
4. Copy your key (starts with `sk-...`)

**Free Tier:** $5 credit (lasts months!)

---

## 📦 Step 2: Install Dependencies

```bash
npm install
```

This installs:
- `groq-sdk` - Groq API client
- `openai` - DeepSeek client (OpenAI-compatible)
- `pdf-parse` - PDF text extraction
- `xlsx` - Excel file generation

---

## 🔑 Step 3: Set API Keys

### For Local Testing:

**Mac/Linux:**
```bash
export GROQ_API_KEY='gsk_your_groq_key_here'
export DEEPSEEK_API_KEY='sk_your_deepseek_key_here'
```

**Windows (Command Prompt):**
```cmd
set GROQ_API_KEY=gsk_your_groq_key_here
set DEEPSEEK_API_KEY=sk_your_deepseek_key_here
```

**Windows (PowerShell):**
```powershell
$env:GROQ_API_KEY='gsk_your_groq_key_here'
$env:DEEPSEEK_API_KEY='sk_your_deepseek_key_here'
```

### For Vercel Deployment:

```bash
vercel env add GROQ_API_KEY
# Paste your Groq key

vercel env add DEEPSEEK_API_KEY
# Paste your DeepSeek key
```

---

## 🚀 Step 4: Run the Application

```bash
node server.js
```

You'll see:
```
🚀 Research Intelligence Portal Running!

📊 Access at: http://localhost:3000

🤖 APIs:
   - Groq (Earnings Analysis): ✅
   - DeepSeek (Financial Extraction): ✅

💡 Get free API keys:
   - Groq: https://console.groq.com/keys
   - DeepSeek: https://platform.deepseek.com/api_keys
```

Open: **http://localhost:3000**

---

## 💡 How to Use

### Option A: Financial Statement Extraction

1. **Upload** annual report PDF
2. **Select** "Financial Statement Extraction"
3. **Click** "Analyze Document"
4. **Wait** 15-30 seconds
5. **Download** Excel file with extracted data!

**Output includes:**
- Income Statement (Revenue, Costs, Net Income, etc.)
- Balance Sheet (Assets, Liabilities, Equity)
- Multi-year comparisons
- Confidence scores
- Downloadable Excel file

### Option B: Earnings Call Analysis

1. **Upload** earnings call transcript PDF/TXT
2. **Select** "Earnings Call / Management Commentary Summary"
3. **Click** "Analyze Document"
4. **Wait** 10-20 seconds
5. **Review** comprehensive analysis!

**Output includes:**
- Management tone & confidence
- Key positives & concerns
- Forward guidance (revenue, margin, capex)
- Capacity utilization trends
- Growth initiatives
- Notable quotes

---

## 🎨 Features

### Modern Dark UI
- Professional dark theme
- Drag-and-drop file upload
- Analysis type selector
- Real-time loading states
- Beautiful result display

### Dual AI System
- **Groq (Llama 3.3 70B)** - Lightning fast earnings analysis
- **DeepSeek** - Intelligent financial data extraction
- Automatic fallback if APIs fail
- Pattern-based extraction as backup

### Excel Export
- Professional formatted spreadsheets
- Multiple sheets (Income Statement, Balance Sheet, Metadata)
- Confidence scoring for each line item
- Ready for further analysis

---

## 🔧 Configuration

### Change AI Models

**Groq models** (in `server.js` line ~105):
```javascript
model: 'llama-3.3-70b-versatile', // Fast & smart
// Or try: 'mixtral-8x7b-32768' for even faster
```

**DeepSeek models** (in `server.js` line ~152):
```javascript
model: 'deepseek-chat', // Default
// Or: 'deepseek-coder' for technical docs
```

### Adjust Text Limits

**Earnings analysis** (line ~85):
```javascript
${text.substring(0, 10000)} // Adjust character limit
```

**Financial extraction** (line ~136):
```javascript
${text.substring(0, 12000)} // Adjust character limit
```

---

## 📊 API Costs

Both are essentially **FREE**!

| API | Free Tier | Cost per Request | Good For |
|-----|-----------|------------------|----------|
| **Groq** | 14,400/day | $0.00 | Fast analysis |
| **DeepSeek** | $5 credit | ~$0.001 | Smart extraction |

You can analyze **hundreds of documents** for free!

---

## 🚀 Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variables
vercel env add GROQ_API_KEY
vercel env add DEEPSEEK_API_KEY

# Deploy to production
vercel --prod
```

Your live URL: `your-project.vercel.app`

---

## 🐛 Troubleshooting

### "API key not set"
Make sure environment variables are set:
```bash
echo $GROQ_API_KEY
echo $DEEPSEEK_API_KEY
```

### "Failed to parse PDF"
- Ensure PDF has selectable text (not scanned image)
- Try converting to TXT first
- Check file isn't password protected

### "JSON parsing error"
- App automatically falls back to pattern matching
- You'll still get results!
- For best quality, make sure API keys are set

### Slow performance
- First request is slower (cold start)
- Subsequent requests are faster
- Groq is faster than DeepSeek

---

## 📁 Project Structure

```
research-portal/
├── server.js           # Backend (Groq + DeepSeek)
├── index.html          # Frontend UI
├── styles.css          # Dark theme styling
├── script.js           # Frontend logic
├── package.json        # Dependencies
├── vercel.json         # Deployment config
└── sample-earnings-call.txt
```

---

## ✨ Example Outputs

### Financial Extraction Example:
```
Income Statement
- Revenue: [$100M, $90M, $80M]
- Cost of Revenue: [$60M, $55M, $50M]
- Gross Profit: [$40M, $35M, $30M]
- Operating Income: [$20M, $18M, $15M]
- Net Income: [$15M, $13M, $11M]

Confidence: High | Currency: USD | Years: 2024, 2023, 2022
```

### Earnings Analysis Example:
```
Management Tone: Optimistic
Confidence: High

Key Positives:
- Record revenue of $842M (47% YoY growth)
- Gross margin expanded to 68%
- Customer retention at 98%

Forward Guidance:
- Q4 Revenue: $900-950M
- Operating Margin: 22-25%
- FY Revenue: $3.1-3.2B
```

---

## 🎓 Tips for Best Results

1. **Financial Extraction:**
   - Use annual reports or 10-K filings
   - PDFs with clear financial tables work best
   - Multi-year data gets extracted automatically

2. **Earnings Analysis:**
   - Full transcripts work better than summaries
   - Include Q&A section for better context
   - TXT format is faster than PDF

3. **General:**
   - Clear, well-formatted documents = better results
   - First analysis takes longer (AI model loading)
   - Check confidence scores in results

---

## 🎉 You're Ready!

Your research portal is production-ready with:
- ✅ TWO AI-powered tools
- ✅ FREE APIs (Groq + DeepSeek)
- ✅ Professional dark UI
- ✅ Excel export
- ✅ Vercel deployment ready
- ✅ Fallback systems
- ✅ Complete documentation

**Start analyzing!** 🚀📊
