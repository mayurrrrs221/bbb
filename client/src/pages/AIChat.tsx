import React, { useState } from 'react';
import { aiApi } from '../lib/api';
import { Bot, Send } from 'lucide-react';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
    };
    setMessages((prev) => [...prev, newMessage]);
    const toSend = input.trim();
    setInput('');
    setLoading(true);

    try {
      const res = await aiApi.chat(toSend, conversationId);
      const reply = res.data.data.reply as string;
      const newConversationId = res.data.data.conversationId as string;

      setConversationId(newConversationId);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', content: reply },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]">
      <div className="border-b bg-white px-6 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <Bot className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Finote AI</h1>
          <p className="text-sm text-gray-500">
            Ask anything about your spending, savings, or goals.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm mt-10">
            Start the conversation by asking about your expenses, savings plan, or
            how to reach a goal faster.
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${
              m.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-lg rounded-2xl px-4 py-2 text-sm shadow-sm ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-white text-gray-900 rounded-bl-none'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-500 rounded-2xl rounded-bl-none px-4 py-2 text-sm shadow-sm">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="border-t bg-white px-4 py-3 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Finote AI about your money..."
          className="flex-1 px-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2 rounded-full bg-blue-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
