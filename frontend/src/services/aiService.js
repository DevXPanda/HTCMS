import api from './api';

const aiService = {
  ask: async (prompt, history = [], context = {}) => {
    try {
      const response = await api.post('/ai/ask', { prompt, history, context });
      return response.data;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }
};

export default aiService;
