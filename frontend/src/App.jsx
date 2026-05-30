import { useState, useRef, useEffect } from "react";
import "./App.css";

const QUICK_CHIPS = ["sorting algorithms", "graph traversal", "dynamic programming", "hash tables", "time complexity"];

const SUGGESTIONS = [
  { icon: "📌", text: "What is a binary search tree?" },
  { icon: "📊", text: "Explain Big O notation" },
  { icon: "🔀", text: "How does merge sort work?" },
  { icon: "📦", text: "Difference between stack and queue?" },
];

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(["Binary search trees", "Big O notation", "Graph traversal"]);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function autoResize() {
    const ta = textareaRef.current;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }

  async function send(text) {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages(prev => [...prev, { role: "bot", text: data.answer, standalone: data.standalone }]);
      setHistory(prev => [q.slice(0, 28), ...prev.slice(0, 9)]);
    } catch {
      setMessages(prev => [...prev, { role: "bot", text: "⚠️ Server error. Is the backend running?" }]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() { setMessages([]); }

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="logo-icon">📚</span>
          <span className="logo-text">DSA Assistant</span>
        </div>
        <button className="new-chat-btn" onClick={clearChat}>+ New chat</button>
        <p className="history-label">Recent</p>
        <ul className="history-list">
          {history.map((h, i) => (
            <li key={i} className="history-item" onClick={() => send(h)}>
              💬 {h}
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <div className="model-badge">
            🤖 deepseek-r1:1.5b
            <span className="status-dot" />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        <div className="topbar">
          <span className="topbar-title">💬 Chat</span>
          <div className="topbar-actions">
            <button className="icon-btn" onClick={clearChat} title="Clear">🗑</button>
          </div>
        </div>

        <div className="chat-area">
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">💡</div>
              <h2>Ask about DSA</h2>
              <p>Powered by Pinecone + Ollama RAG pipeline</p>
              <div className="suggest-grid">
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} className="suggest-card" onClick={() => send(s.text)}>
                    <span>{s.icon}</span>{s.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              <div className={`avatar ${m.role}`}>{m.role === "bot" ? "🤖" : "🧑"}</div>
              <div className="bubble">
                <div className={`bubble-inner ${m.role}`}>{m.text}</div>
                {m.standalone && m.standalone !== m.text && (
                  <div className="rewritten-tag">🔄 Rewritten: "{m.standalone}"</div>
                )}
                <div className="bubble-meta">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="msg bot">
              <div className="avatar bot">🤖</div>
              <div className="bubble">
                <div className="bubble-inner bot">
                  <div className="typing"><span /><span /><span /></div>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="input-zone">
          <div className="quick-chips">
            {QUICK_CHIPS.map((c, i) => (
              <button key={i} className="chip" onClick={() => setInput(c)}>{c}</button>
            ))}
          </div>
          <div className="input-wrap">
            <textarea
              ref={textareaRef}
              value={input}
              rows={1}
              placeholder="Ask about arrays, trees, graphs..."
              onChange={e => { setInput(e.target.value); autoResize(); }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              disabled={loading}
            />
            <button className="send-btn" onClick={() => send()} disabled={loading || !input.trim()}>
              ↑
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}