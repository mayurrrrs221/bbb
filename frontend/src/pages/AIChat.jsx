import { useState, useEffect, useRef } from 'react';
import { aiApi } from '@/lib/api';
import { Bot, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function AIChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await aiApi.chat(userMessage.content, conversationId);
      const { reply, conversationId: newConvId } = response.data.data;

      setConversationId(newConvId);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: reply,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      toast.error('Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]" data-testid="ai-chat-page">
      <div className="bg-white border-b px-6 py-4 flex items-center gap-3 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
          <Bot className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center">
            Finote AI Assistant
            <Sparkles className="w-4 h-4 ml-2 text-yellow-500" />
          </h1>
          <p className="text-sm text-gray-500">Your personal finance companion</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white px-4 py-6 space-y-4" data-testid="chat-messages">
        {messages.length === 0 && (
          <div className="text-center py-12 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-4">
              <Bot className="w-10 h-10 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Hi! I'm Finote AI</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Ask me about your expenses, savings goals, budgeting tips, or any financial questions.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto mt-6">
              {[
                'How much did I spend this month?',
                'Help me create a budget',
                'Tips for saving money',
                'Analyze my spending patterns',
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(suggestion)}
                  className="p-3 bg-white border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-sm text-gray-700 hover:text-indigo-700 text-left"
                  data-testid={`suggestion-${idx}`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in`}
            style={{ animationDelay: `${index * 0.05}s` }}
            data-testid={`message-${message.role}-${index}`}
          >
            <div
              className={`max-w-2xl rounded-2xl px-5 py-3 shadow-sm ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-md'
                  : 'bg-white text-gray-800 rounded-bl-md border border-gray-200'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center mb-2">
                  <Bot className="w-4 h-4 text-indigo-600 mr-2" />
                  <span className="text-xs font-semibold text-indigo-600">Finote AI</span>
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-indigo-100' : 'text-gray-400'}`}>
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-slide-in">
            <div className="bg-white text-gray-500 rounded-2xl rounded-bl-md px-5 py-3 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="border-t bg-white px-4 py-4 flex items-center gap-3 shadow-lg" data-testid="chat-input-form">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything about your finances..."
          className="flex-1 px-5 py-3 border-2 border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          disabled={loading}
          data-testid="chat-input"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-3 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
          data-testid="chat-send-button"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}