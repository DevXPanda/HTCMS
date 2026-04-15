import { aiEngine } from '../services/aiEngine.service.js';
import { queryExecutor } from '../services/queryExecutor.service.js';
import { aiAction } from '../services/aiAction.service.js';

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

    // console.log("AI GENERATED RESPONSE:", JSON.stringify(aiResponse, null, 2));

    // 3. Handle Actions if requested by AI
    if (aiResponse.type === 'ACTION' && aiResponse.action) {
      const actionResult = await aiAction.execute({
        action: aiResponse.action,
        params: aiResponse.params
      }, req.user);

      // Return action result combined with AI message
      return res.json({
        success: true,
        type: 'RESULT', // UI usually expects RESULT
        message: aiResponse.message + "\n\n" + actionResult.message,
        data: actionResult.data || [],
        actionSuccess: actionResult.success
      });
    }

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
    const env = process.env.NODE_ENV || 'development';
    if (env !== 'production') {
      console.error('AI Controller Error:', error.message);
    } else {
      console.error(`[AI API Error]: ${error.response?.status || 500} - ${error.message}`);
    }
    res.status(500).json({
      success: false,
      message: 'Internal AI Engine Error'
    });
  }
};
