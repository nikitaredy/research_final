# 📊 Research Intelligence Portal

A professional AI-powered research portal for financial analysis with two specialized tools:
- **Financial Statement Extraction** - Extract structured data from annual reports to Excel
- **Earnings Call Analysis** - Comprehensive analysis of earnings transcripts

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![Free](https://img.shields.io/badge/API-100%25%20Free-brightgreen.svg)

## 🌐 Live Demo

**Try it now:** [https://your-project-url.vercel.app](https://research-final-nine.vercel.app/)

> 🎯 Upload a financial PDF and see AI-powered analysis in action!

---

## ✨ Features

- 🤖 **Dual AI Analysis** - Powered by Groq's Llama 3.3 70B model
- 📈 **Financial Extraction** - Extract Income Statement, Balance Sheet data with confidence scores
- 💼 **Earnings Analysis** - Management tone, guidance, initiatives, and quotes
- 📥 **Excel Export** - Download structured financial data as spreadsheets
- 🎨 **Modern Dark UI** - Professional, responsive interface
- ⚡ **Lightning Fast** - Groq API delivers results in seconds
- 💯 **100% Free** - No payment required, generous rate limits

## 🚀 Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- Two free Groq API keys ([Get them here](https://console.groq.com/keys))

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/research-intelligence-portal.git
cd research-intelligence-portal
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Groq API keys:
```env
GROQ_API_KEY_1=gsk_your_first_key_here
GROQ_API_KEY_2=gsk_your_second_key_here
```

4. **Run the application**
```bash
npm start
```

5. **Open your browser**
```
http://localhost:3000
```

## 🔑 Getting API Keys

### Create Two Free Groq Accounts

**Why two accounts?** Each free account gets 14,400 requests/day. Two accounts = 28,800 requests/day!

1. **First Account:**
   - Go to [console.groq.com/keys](https://console.groq.com/keys)
   - Sign up with your primary email
   - Create API key → Copy to `GROQ_API_KEY_1`

2. **Second Account:**
   - Sign out and return to [console.groq.com/keys](https://console.groq.com/keys)
   - Sign up with a different email (work email, secondary Gmail, etc.)
   - Create API key → Copy to `GROQ_API_KEY_2`

**Both accounts are 100% FREE with no payment info required!**

## 📖 How to Use

### Financial Statement Extraction

1. Upload an annual report or 10-K filing (PDF format)
2. Select "Financial Statement Extraction"
3. Click "Analyze Document"
4. Review extracted data with confidence scores
5. Download as Excel spreadsheet

**Output includes:**
- Income Statement (Revenue, Costs, Net Income, EPS, etc.)
- Balance Sheet (Assets, Liabilities, Equity)
- Multi-year comparisons
- Confidence scoring for each line item
- Currency and fiscal year metadata

### Earnings Call Analysis

1. Upload earnings call transcript (PDF or TXT format)
2. Select "Earnings Call / Management Commentary Summary"
3. Click "Analyze Document"
4. Review comprehensive analysis

**Output includes:**
- Management tone & confidence level
- Key positives and concerns (3-5 each)
- Forward guidance (revenue, margin, capex)
- Capacity utilization trends
- Growth initiatives
- Notable management quotes
- Analysis confidence assessment

## 🚀 Deploy to Vercel

### Manual Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Add environment variables in Vercel dashboard
# Or via CLI:
vercel env add GROQ_API_KEY_1
vercel env add GROQ_API_KEY_2

# Deploy to production
vercel --prod
```

Your app will be live at: `your-project.vercel.app`

**Note:** The `vercel.json` file is configured to automatically use your environment variables.

## 📁 Project Structure

```
research-intelligence-portal/
├── server.js              # Backend server with API integration
├── index.html             # Frontend interface
├── styles.css             # Dark theme styling
├── script.js              # Frontend logic
├── package.json           # Dependencies
├── .env.example           # Environment variables template
├── .env.local            # Your API keys (gitignored)
├── .gitignore            # Git ignore rules
├── vercel.json           # Vercel deployment config
└── README.md             # This file
```

## 🛠️ Technologies Used

- **Backend:** Node.js (native HTTP server, no frameworks)
- **AI/LLM:** Groq API (Llama 3.3 70B Versatile)
- **PDF Processing:** pdf-parse
- **Excel Generation:** ExcelJS (secure, actively maintained)
- **Frontend:** Vanilla JavaScript, CSS3
- **Deployment:** Vercel

### 🔒 Security Note

This project uses **ExcelJS** instead of SheetJS (xlsx) to avoid known security vulnerabilities:
- ✅ No prototype pollution issues
- ✅ No ReDoS vulnerabilities  
- ✅ Actively maintained with security updates
- ✅ Better feature set and performance

## 💰 Cost & Rate Limits

| Resource | Free Tier | Cost |
|----------|-----------|------|
| Groq Account #1 | 14,400 requests/day | FREE |
| Groq Account #2 | 14,400 requests/day | FREE |
| **Total** | **28,800 requests/day** | **$0.00** |

**You can analyze hundreds of documents daily at zero cost!**

## 🔧 Configuration

### Change AI Model

Edit `server.js` (lines ~110 and ~160):
```javascript
model: 'llama-3.3-70b-versatile', // Current model
```

Other available Groq models:
- `mixtral-8x7b-32768` - Faster, less accurate
- `llama-3.1-70b-versatile` - Older version

### Adjust Context Length

**Earnings analysis** (`server.js` line ~90):
```javascript
${text.substring(0, 10000)} // Characters to analyze
```

**Financial extraction** (`server.js` line ~140):
```javascript
${text.substring(0, 12000)} // Characters to analyze
```

## 🐛 Troubleshooting

### API Keys Not Working
- Ensure `.env.local` file exists in root directory
- Check that keys start with `gsk_`
- Verify both `GROQ_API_KEY_1` and `GROQ_API_KEY_2` are set
- Restart the server after changing `.env.local`

### PDF Parsing Errors
- Ensure PDF contains selectable text (not scanned images)
- Try converting PDF to TXT first
- Check that PDF is not password protected

### Rate Limit Errors
- You've exceeded 14,400 requests on one account
- The app will automatically use the other account
- Wait 24 hours for rate limits to reset
- Consider creating a third Groq account if needed

## 📊 Example Outputs

### Financial Extraction
```
Income Statement
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                2024    2023    2022
Revenue         $100M   $90M    $80M
Gross Profit    $40M    $35M    $30M
Net Income      $15M    $13M    $11M

Confidence: High | Currency: USD
```

### Earnings Analysis
```
Management Tone: Optimistic
Confidence: High

Key Positives:
• Record revenue of $842M (47% YoY growth)
• Gross margin expanded to 68%
• Customer retention at 98%

Forward Guidance:
• Q4 Revenue: $900-950M
• Operating Margin: 22-25%
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Groq](https://groq.com/) for providing fast, free AI inference
- [Meta](https://ai.meta.com/) for the Llama 3.3 model
- Built for L2 Research Tool Implementation Assignment

---

**Built with ❤️ for financial analysts and researchers**
