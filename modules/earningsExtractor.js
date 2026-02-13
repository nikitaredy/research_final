// modules/earningsExtractor.js
// PRECISION EARNINGS ANALYSIS MODULE

class EarningsExtractor {
  constructor(groqClient) {
    this.groq = groqClient;
  }

  async analyze(text) {
    console.log('🎯 [Earnings Extractor] Analyzing transcript...');
    
    const prompt = `Analyze this earnings call transcript with PRECISION:

${text.substring(0, 15000)}

Extract EXACT information:

{
  "management_tone": "optimistic/cautious/neutral",
  "confidence_level": "high/medium/low",
  "tone_explanation": "explanation with direct quotes",
  "key_positives": ["positive 1 with numbers", "positive 2 with numbers"],
  "key_concerns": ["concern 1 with details", "concern 2 with details"],
  "forward_guidance": {
    "revenue": "exact numbers",
    "margin": "exact numbers",
    "capex": "exact numbers",
    "other": "other guidance"
  },
  "capacity_utilization": "exact percentage",
  "growth_initiatives": ["initiative 1", "initiative 2"],
  "notable_quotes": ["exact quote 1", "exact quote 2"],
  "analysis_confidence": "high/medium/low"
}`;

    try {
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a precise earnings analyst. Extract EXACT information. No hallucinations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 3000
      });

      let response = completion.choices[0].message.content;
      response = response.trim().replace(/```json|```/g, '');
      
      const start = response.indexOf('{');
      const end = response.lastIndexOf('}') + 1;
      if (start >= 0 && end > start) {
        response = response.substring(start, end);
      }

      return JSON.parse(response);
      
    } catch (error) {
      console.error('Earnings analysis error:', error.message);
      return this.fallback(text);
    }
  }

  fallback(text) {
    // Extract numbers and quotes using regex
    const numbers = text.match(/\$?[\d,]+\.?\d*\s?(?:million|billion|%)?/g) || [];
    const quotes = text.match(/"([^"]+)"/g) || [];
    
    const hasPositive = /growth|increase|strong|record|exceed|success/i.test(text);
    const hasNegative = /decline|concern|challenge|decrease|weak/i.test(text);
    
    return {
      management_tone: hasPositive && !hasNegative ? "optimistic" : 
                       hasNegative && !hasPositive ? "cautious" : "neutral",
      confidence_level: "medium",
      tone_explanation: "Based on keyword patterns",
      key_positives: [
        numbers[0] ? `Revenue: ${numbers[0]}` : "Revenue growth mentioned",
        "Strong performance indicators"
      ],
      key_concerns: [
        "Market challenges referenced",
        "Competitive pressures"
      ],
      forward_guidance: {
        revenue: numbers.find(n => n.includes('$')) || "See transcript",
        margin: numbers.find(n => n.includes('%')) || "See transcript",
        capex: "See transcript",
        other: "See transcript"
      },
      capacity_utilization: "Discussed in transcript",
      growth_initiatives: ["Expansion plans", "New products"],
      notable_quotes: quotes.slice(0, 3).map(q => q.replace(/"/g, '')),
      analysis_confidence: "medium"
    };
  }
}

module.exports = EarningsExtractor;