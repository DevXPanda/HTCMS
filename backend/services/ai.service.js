import axios from 'axios';

class AIService {
  constructor() {
    this.apiKey = (process.env.GROQ_API_KEY || '').trim();
    this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    this.model = 'llama-3.1-8b-instant';
  }

  async analyze(prompt, context = {}) {
    try {
      if (!this.apiKey) {
        throw new Error('GROQ_API_KEY is not configured in environment variables');
      }

      const instructions = `
### ROLE: Strict HTCMS Data Query Engine
### RULES:
- ALWAYS return ONLY valid JSON.
- If data requested (property, tax, payment), generate: {"type": "DATA_QUERY", "query": {"collection": "properties|demands", "filters": {...}, "sort": {...}, "limit": N}}
- Specific property ID -> filter by property_id.
- Specific owner name -> filter by owner_name.
- "sabse jyada pending" -> demands, status: pending, sort amount: -1, limit: 1.
- Respond in matching language (Hindi/English/Hinglish).

### CONTEXT:
- Role: ${context.role || 'user'}
- Question: ${prompt}
`;

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            { role: 'system', content: 'You are an HTCMS AI Assistant. ALWAYS respond in valid JSON format. Never include introductory text or markdown.' },
            { role: 'user', content: instructions }
          ],
          temperature: 0, // Lower temperature for more consistent JSON
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      console.log('--- AI Response Received ---');
      console.log(content);
      return content;
    } catch (error) {
      if (error.response) {
        console.error('Groq API Error Status:', error.response.status);
        console.error('Groq API Error Data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('AI Service Error:', error.message);
      }
      throw error;
    }
  }
}

export default new AIService();
