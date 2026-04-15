import { aiEngine } from '../services/aiEngine.service.js';
import { queryExecutor } from '../services/queryExecutor.service.js';

/**
 * Controller for HTCMS Production AI Engine
 */
export const askAI = async (req, res) => {
  const { prompt, history = [], context = {} } = req.body;

  if (!prompt) {
    return res.status(400).json({ success: false, message: 'Prompt is required' });
  }

  try {
    // 1. Fetch COMPREHENSIVE ULB Data (Properties, Payments, Wards, etc.)
    const ulbData = await queryExecutor.fetchComprehensiveUlbData(req.user);

    // 2. Process query using AI Engine (ChatGPT Style)
    let aiResponse = await aiEngine.processAI(prompt, req.user.role || 'user', {
      ...context,
      history,
      ulbData,
      ulbName: req.user.ulbName || 'HTCMS ULB'
    });

    console.log("AI GENERATED RESPONSE FOR COMPREHENSIVE DATA:", JSON.stringify(aiResponse, null, 2));

    // Ensure valid JSON strictness for frontend
    if (!aiResponse || !aiResponse.type) {
      aiResponse = {
        type: 'RESULT',
        message: aiResponse.message || "Processed successfully.",
        data: []
      };
    }

    return res.json({
      success: true,
      ...aiResponse
    });

  } catch (error) {
    console.error('AI Engine Controller Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal AI Engine Error'
    });
  }
};
