import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Sparkles, Loader2, Maximize2, Minimize2, Search, TrendingUp, HelpCircle } from 'lucide-react';
import aiService from '../../services/aiService';
import { useAuth } from '../../contexts/AuthContext';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import './AIAssistant.css';

const AIAssistant = () => {
  const auth = useAuth();
  const staffAuth = useStaffAuth();
  const isAuthenticated = auth?.isAuthenticated || staffAuth?.isAuthenticated;
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', type: 'GENERAL', message: 'Hello! I am your ULB Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAuthenticated) {
      scrollToBottom();
    }
  }, [messages, isAuthenticated]);

  if (!isAuthenticated) return null;

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userPrompt = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', message: userPrompt }]);
    setIsLoading(true);

    try {
      // Send the last 5 messages for context
      const chatHistory = messages.slice(-5).map(m => ({
        role: m.role,
        content: m.message || m.summary || "Data Table Results"
      }));

      const response = await aiService.ask(userPrompt, chatHistory);

      // The response object already contains type, message, and data
      setMessages(prev => [...prev, { role: 'assistant', ...response }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        type: 'GENERAL',
        message: 'Sorry, I encountered an error. Please try again later.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatRichText = (text) => {
    if (!text) return '';

    // 1. Force remove all stars (User: "dont add star remove it")
    let clean = text.replace(/\*/g, '');

    // 2. Highlighters
    const idRegex = /(PR\d+|PC\d+|PA\d+|PI\d+)/g;
    const amountRegex = /(₹\s?[\d,.]+|\b\d[\d,]*\.\d{2}\b)/g;

    const parts = clean.split(/(\s+)/);

    return parts.map((part, i) => {
      if (idRegex.test(part)) return <span key={i} className="ai-highlight-id">{part}</span>;
      if (amountRegex.test(part)) return <span key={i} className="ai-highlight-amount">{part}</span>;
      return part;
    });
  };

  const renderDataContent = (msg) => {
    const messageText = msg.message || msg.summary || msg.result || '';

    return (
      <div className="ai-multi-content">
        {messageText && (
          <p className="ai-message-text">
            {formatRichText(messageText)}
          </p>
        )}

        {msg.type === 'RESULT' && Array.isArray(msg.data) && msg.data.length > 0 && (
          <div className="ai-data-table-container">
            <div className="ai-data-header"><Search size={14} /><span>Query Results</span></div>
            <div className="ai-table-wrapper">
              <table className="ai-data-table">
                <thead>
                  <tr>
                    {Object.keys(msg.data[0]).map(key => <th key={key}>{key.replace(/_/g, ' ').toUpperCase()}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {msg.data.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((val, j) => {
                        const cellStr = String(val);
                        const isAmt = cellStr.includes('₹') || (!isNaN(val) && Number(val) > 100);
                        return <td key={j} className={isAmt ? 'ai-table-amt' : ''}>{cellStr}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) {
    return (
      <button className="ai-floating-btn" onClick={() => setIsOpen(true)}>
        <Sparkles size={28} />
      </button>
    );
  }

  return (
    <div className={`ai-chat-window ${isMinimized ? 'minimized' : ''}`}>
      <div className="ai-chat-header">
        <div className="ai-header-info">
          <Sparkles size={20} className="ai-icon-pulse" />
          <span>ULB AI Intelligence</span>
        </div>
        <div className="ai-header-actions">
          <button onClick={() => setIsMinimized(!isMinimized)}>
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button onClick={() => setIsOpen(false)}><X size={16} /></button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="ai-messages-container">
            {messages.map((msg, idx) => (
              <div key={idx} className={`ai-message ${msg.role}`}>
                <div className="ai-message-bubble">
                  {msg.role === 'assistant' ? renderDataContent(msg) : msg.message}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="ai-message assistant">
                <div className="ai-message-bubble loading">
                  <Loader2 className="animate-spin" size={18} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="ai-chat-input" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Ask anything (tax, property, summary...)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()}>
              <Send size={18} />
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default AIAssistant;
