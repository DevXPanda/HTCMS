import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
const model = 'llama-3.1-70b-versatile';

async function test() {
  const systemPrompt = `
You are the HTCMS Production AI Engine. You are a DATA ANALYTICS & QUERY PROCESSOR.
You are NOT a chatbot. NEVER use conversational filler.

---
### 🧠 CORE GOAL:
1. Data Queries: Translate natural language into structured DATA_QUERY objects.
2. Context Resolution: References like "ye" (this), "wo" (that), "unka" (his/her) refer to the records mentioned in the previous messages.

### ⚠️ CRITICAL RULES:
- NEVER use placeholders like "REPLACE_WITH..." or "NAME" or "ID".
- LOOK at the conversation history. If the user asks about "this property", find the property ID from the previous results in the history.
- ALWAYS respond in the same language as the user.
- ALWAYS return valid JSON.

### 🧾 DATABASE SCHEMAS:
1. properties: { propertyNumber, ownerName, status, address }
2. demands: { property_id, total_amount, status }
3. payments: { property_id, amount, status }

### 📊 OUTPUT JSON SCHEMA:
{
  "type": "DATA_QUERY | GENERAL",
  "query": {
    "collection": "properties | demands | payments",
    "action": "FETCH | AGGREGATE",
    "filters": { "property_id": "ACTUAL_ID", "ownerName": "ACTUAL_NAME" }
  },
  "message": "Human-friendly response text"
}
`;

  try {
    const response = await axios.post(
      apiUrl,
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: "ram singh ki property dikhao" }
        ],
        temperature: 0,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('SUCCESS:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('ERROR STATUS:', error.response?.status);
    console.log('ERROR DATA:', JSON.stringify(error.response?.data, null, 2));
  }
}

test();
