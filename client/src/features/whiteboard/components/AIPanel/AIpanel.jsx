import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Bot, User, Wand2, ChevronRight } from 'lucide-react';
import { useWhiteboardStore } from '../../store/useWhiteboardStore';
 
// ─── Prompt suggestions ───────────────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: '🎨', text: 'Add a color scheme for a dashboard UI' },
  { icon: '📐', text: 'Create a simple flowchart layout'       },
  { icon: '✏️', text: 'Describe the shapes on my canvas'      },
  { icon: '🧠', text: 'Suggest improvements to my wireframe'  },
];
 
// ─── Message bubble ──────────────────────────────────────────────────────────
const MessageBubble = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white ${
          isUser ? 'bg-indigo-600' : 'bg-gradient-to-br from-violet-600 to-indigo-600'
        }`}
      >
        {isUser ? <User size={13} /> : <Bot size={13} />}
      </div>
      {/* Content */}
      <div
        className={`max-w-[85%] px-3 py-2.5 rounded-xl text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-white/8 text-gray-200 border border-white/8 rounded-tl-sm'
        }`}
      >
        {msg.content}
        {msg.isStreaming && (
          <span className="inline-flex ml-1">
            <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms'   }} />
            <span className="w-1 h-1 rounded-full bg-current animate-bounce mx-0.5" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        )}
      </div>
    </div>
  );
};
 
// ─── Build a canvas context snapshot for the AI ───────────────────────────────
const buildCanvasContext = (canvas) => {
  if (!canvas) return 'Canvas is empty.';
  const objects = canvas.getObjects();
  if (!objects.length) return 'The canvas is currently empty — no objects placed yet.';
 
  const summary = objects.map((obj, i) => {
    const base = `[${i + 1}] ${obj.customName || obj.type} at (${Math.round(obj.left)}, ${Math.round(obj.top)})`;
    const dims = `${Math.round(obj.getScaledWidth())}×${Math.round(obj.getScaledHeight())}`;
    const fill = obj.fill ? ` fill=${obj.fill}` : '';
    return `${base}, size ${dims}${fill}`;
  });
 
  return `Canvas contains ${objects.length} object(s):\n${summary.join('\n')}`;
};
 
// ─── Main AIPanel ─────────────────────────────────────────────────────────────
const AIPanel = () => {
  const { canvas } = useWhiteboardStore();
  const [messages,    setMessages]    = useState([
    {
      role: 'assistant',
      content: 'Hi! I\'m your AI canvas assistant. I can help you describe, analyze, and improve your whiteboard. Ask me anything about your design!',
    },
  ]);
  const [input,       setInput]       = useState('');
  const [isLoading,   setIsLoading]   = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);
 
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
 
  const sendMessage = async (text = input.trim()) => {
    if (!text || isLoading) return;
    setInput('');
 
    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
 
    // Build conversation history (last 10 messages for context window)
    const history = [...messages.slice(-9), userMsg];
    const canvasCtx = buildCanvasContext(canvas);
 
    const systemPrompt = `You are an expert UI/UX and visual design assistant embedded in a collaborative whiteboard tool called "Whiteboard". 
You have access to the user's current canvas state:
 
--- CANVAS STATE ---
${canvasCtx}
--- END CANVAS STATE ---
 
Help the user with:
- Analyzing and describing their canvas/design
- Suggesting visual improvements, layout ideas, or color schemes
- Explaining design concepts and patterns
- Answering questions about their whiteboard content
 
Keep responses concise, friendly, and actionable. Use markdown sparingly (this is a chat UI).`;
 
    // Streaming placeholder
    const placeholderMsg = { role: 'assistant', content: '', isStreaming: true };
    setMessages((prev) => [...prev, placeholderMsg]);
 
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system:     systemPrompt,
          messages:   history.map(({ role, content }) => ({ role, content })),
        }),
      });
 
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${response.status}`);
      }
 
      const data    = await response.json();
      const content = data.content
        ?.filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('') || 'Sorry, I couldn\'t generate a response. Please try again.';
 
      setMessages((prev) =>
        prev.map((m, i) => i === prev.length - 1 ? { role: 'assistant', content } : m)
      );
    } catch (err) {
      const errContent = err.message?.includes('401')
        ? 'Authentication error — make sure the Anthropic API key is configured on your server.'
        : err.message?.includes('429')
          ? 'Rate limited. Please wait a moment and try again.'
          : `Error: ${err.message}. Check your API configuration.`;
 
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 ? { role: 'assistant', content: errContent } : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };
 
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
 
  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center gap-2.5 px-3 py-3 border-b border-white/8">
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/40">
          <Sparkles size={13} className="text-white" />
        </div>
        <div>
          <p className="text-white text-sm font-semibold leading-tight">AI Assistant</p>
          <p className="text-gray-500 text-[10px]">Canvas-aware · Powered by Claude</p>
        </div>
      </div>
 
      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}
        {isLoading && messages[messages.length - 1]?.isStreaming === undefined && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Loader2 size={13} className="text-white animate-spin" />
            </div>
            <div className="px-3 py-2.5 rounded-xl bg-white/8 border border-white/8">
              <div className="flex gap-1">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
 
      {/* ── Suggestions (only shown when no user messages yet) ── */}
      {messages.filter((m) => m.role === 'user').length === 0 && (
        <div className="px-3 pb-2">
          <p className="text-[9px] uppercase tracking-widest text-gray-600 font-semibold mb-2">
            Try asking…
          </p>
          <div className="space-y-1">
            {SUGGESTIONS.map(({ icon, text }) => (
              <button
                key={text}
                onClick={() => sendMessage(text)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/4 hover:bg-white/8 border border-white/6 hover:border-white/12 text-gray-400 hover:text-gray-200 transition-all text-xs text-left"
              >
                <span className="text-sm">{icon}</span>
                <span className="flex-1 truncate">{text}</span>
                <ChevronRight size={11} className="opacity-40 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
 
      {/* ── Input area ── */}
      <div className="p-3 border-t border-white/8">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your canvas…"
              disabled={isLoading}
              className="w-full resize-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all disabled:opacity-50"
              style={{ maxHeight: '120px', overflowY: 'auto' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
            />
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        <p className="text-[9px] text-gray-600 mt-1.5 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};
 
export default AIPanel;