import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

class AIEngineService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.trim() : null;
    this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    this.model = 'llama-3.3-70b-versatile';
  }

  /**
   * Internal helper to handle API calls with exponential backoff on 429 errors.
   */
  async callWithRetry(config, maxRetries = 3) {
    let delay = 1000;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await axios.post(this.apiUrl, config.data, { headers: config.headers });
        } catch (error) {
            const isRateLimit = error.response?.status === 429;
            const isLastRetry = i === maxRetries - 1;

            if (isRateLimit && !isLastRetry) {
                const env = process.env.NODE_ENV || 'development';
                if (env !== 'production') {
                    console.warn(`[AI Engine] Rate limited (429). Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
                }
                await new Promise(res => setTimeout(res, delay));
                delay *= 2; 
                continue;
            }
            throw error;
        }
    }
  }

  async processAI(userInput, role, context = {}) {
    try {
      if (!this.apiKey) {
        throw new Error('GROQ_API_KEY is not configured');
      }

      const SYSTEM_PROMPT = `
You are the HTCMS Global Intelligence Assistant. You have ELITE access to all ULB modules including Property Tax, Water Tax, Shop Management, Staff Attendance, and System Analytics.

Your role:
- Be the absolute authority on HTCMS data.
- Provide comprehensive, intelligent answers across ALL modules.
- Behave like a senior consultant (helpful, data-driven, professional).
- Proactively analyze the "Global ULB Context" provided to find correlations.

-------------------------------------

DATA HANDLING (Global ULB Super-Context):

You will receive a deep JSON object containing:
1. 'properties', 'payments', 'assessments', 'wards', 'staff', 'utility', 'system_summary'.

You must:
- Connect dots between modules.
- ALWAYS use 'system_summary.total_collection' and 'system_summary.total_outstanding' for general financial questions.
- FOR WARD SPECIFIC QUESTIONS: You MUST use 'system_summary.ward_breakdown'. It contains accurate totals matching the dashboard.
- If the ward is missing from breakdown, use the GET_WARD_SUMMARY action.

-------------------------------------

ACTION EXECUTION:
Available Actions:
0. 'GET_WARD_SUMMARY': { ward_no }
1. 'ADD_PROPERTY': { owner_name, property_number, ward_id }
2. 'ADD_CITIZEN': { name, mobile }
3. 'ASSIGN_TASK': { collector_id, property_id }
4. 'COLLECT_PAYMENT': { demand_no, amount }

-------------------------------------

LOGIC RULES:
1. Accuracy: Use provided numbers ONLY or say "Data not available."
2. Currency: Format in Indian style (₹1,00,000.00).
3. Formatting: Return RAW CLEAN TEXT ONLY. NEVER use double stars (**), headers (#), or asterisks.

JSON RESPONSE FORMAT:
{
  "type": "RESULT | ACTION",
  "message": "User-facing message here in clean text",
  "action": "ACTION_NAME (if type ACTION)",
  "params": { ... (if type ACTION) },
  "data": []
}
`;

      const history = context.history || [];
      const historyMessages = history.slice(-5).map(h => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.content
      }));

      const ulbData = context.ulbData || {};
      const userRole = role || 'user';

      // Advanced Payload Management
      const contextStr = JSON.stringify(ulbData);
      const safeContext = contextStr.length > 25000 ? contextStr.substring(0, 25000) + "... [Truncated for stability]" : contextStr;

      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...historyMessages,
        { 
          role: 'user', 
          content: `ROLE: ${userRole} | ULB: ${context.ulbName || 'HTCMS'}\nQUERY: ${userInput}\nCONTEXT: ${safeContext}`
        }
      ];

      const response = await this.callWithRetry({
        data: {
          model: this.model,
          messages,
          temperature: 0,
          response_format: { type: 'json_object' }
        },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const content = response.data.choices[0].message.content;
      
      const env = process.env.NODE_ENV || 'development';
      if (env !== 'production') {
          console.log('[AI Engine]: Response successfully parsed.');
      }

      return JSON.parse(content);
    } catch (error) {
      const isProd = process.env.NODE_ENV === 'production';
      if (isProd) {
          console.error(`[AI Engine Error]: ${error.response?.status || 500} - ${error.message}`);
      } else {
          console.error(`[AI Engine Dev Error]: ${error.response?.status || 'N/A'} - ${error.message}`);
          if (error.response?.data?.error?.message) {
              console.error('Reason:', error.response.data.error.message);
          }
      }
      throw error;
    }
  }
}

export const aiEngine = new AIEngineService();
