import { useState, useRef, useEffect } from "react";
import "./App.css";

const QUICK_CHIPS = [
  { label: "Sorting", icon: "⇅" },
  { label: "Graph traversal", icon: "◈" },
  { label: "Dynamic programming", icon: "⊞" },
  { label: "Hash tables", icon: "#" },
  { label: "Time complexity", icon: "O" },
];

const SUGGESTIONS = [
  { icon: "🌲", text: "What is a binary search tree?", tag: "Trees" },
  { icon: "📐", text: "Explain Big O notation", tag: "Complexity" },
  { icon: "🔀", text: "How does merge sort work?", tag: "Sorting" },
  { icon: "📦", text: "Difference between stack and queue?", tag: "Structures" },
];

function TypingDots() {
  return (
    <span className="typing-dots">
      <span />
      <span />
      <span />
    </span>
  );
}

function MessageBubble({ m, index }) {
  const isBot = m.role === "bot";
  return (
    <div className={`msg-row ${m.role}`} style={{ animationDelay: `${index * 0.04}s` }}>
      <div className={`avatar ${m.role}`}>
        {isBot ? (
          <span className="avatar-icon">⬡</span>
        ) : (
          <span className="avatar-icon">α</span>
        )}
      </div>
      <div className="msg-content">
        <div className={`bubble ${m.role}`}>
          {m.loading ? <TypingDots /> : <span className="bubble-text">{m.text}</span>}
        </div>
        {m.standalone && m.standalone !== m.text && (
          <div className="rewritten-tag">
            <span className="rewrite-icon">↺</span> Interpreted as: "{m.standalone}"
          </div>
        )}
        <div className="msg-meta">
          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([
    "Binary search trees",
    "Big O notation",
    "Graph traversal",
  ]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function autoResize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }

  async function send(text) {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: data.answer, standalone: data.standalone },
      ]);
      setHistory((prev) => [q.slice(0, 30), ...prev.slice(0, 9)]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "⚠️ Server error. Is the backend running?" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([]);
  }

  return (
    <div className={`app ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-hex">⬡</span>
          <div className="logo-text-block">
            <span className="logo-name">DSA Assistant</span>
            <span className="logo-sub">RAG · Pinecone · Ollama</span>
          </div>
        </div>

        <button className="new-chat-btn" onClick={clearChat}>
          <span className="btn-plus">+</span> New Conversation
        </button>

        <div className="history-section">
          <p className="section-label">Recent</p>
          <ul className="history-list">
            {history.map((h, i) => (
              <li key={i} className="history-item" onClick={() => send(h)}>
                <span className="history-icon">▸</span>
                <span className="history-text">{h}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="sidebar-footer">
          <div className="model-pill">
            <span className="model-dot" />
            <span>deepseek-r1:1.5b</span>
          </div>
          <div className="footer-info">Local model · Offline capable</div>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        {/* Topbar */}
        <header className="topbar">
          <button
            className="topbar-toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            title="Toggle sidebar"
          >
            ☰
          </button>
          <div className="topbar-center">
            <span className="topbar-title">Chat</span>
            <span className="topbar-status">
              <span className="status-dot" /> Model ready
            </span>
          </div>
          <button className="topbar-clear" onClick={clearChat} title="Clear chat">
            <span>⌫</span> Clear
          </button>
        </header>

        {/* Chat area */}
        <div className="chat-area">
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-hex-ring">
                <span className="empty-icon">⬡</span>
              </div>
              <h1 className="empty-title">What do you want to learn?</h1>
              <p className="empty-sub">
                Ask about any data structure or algorithm. Powered by your local RAG pipeline.
              </p>
              <div className="suggest-grid">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    className="suggest-card"
                    onClick={() => send(s.text)}
                  >
                    <span className="suggest-icon">{s.icon}</span>
                    <span className="suggest-tag">{s.tag}</span>
                    <span className="suggest-text">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="messages-list">
            {messages.map((m, i) => (
              <MessageBubble key={i} m={m} index={i} />
            ))}
            {loading && (
              <div className="msg-row bot">
                <div className="avatar bot">
                  <span className="avatar-icon">⬡</span>
                </div>
                <div className="msg-content">
                  <div className="bubble bot">
                    <TypingDots />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={bottomRef} />
        </div>

        {/* Input zone */}
        <div className="input-zone">
          <div className="quick-chips">
            {QUICK_CHIPS.map((c, i) => (
              <button
                key={i}
                className="chip"
                onClick={() => setInput(c.label)}
              >
                <span className="chip-icon">{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>
          <div className="input-wrap">
            <div className="input-inner">
              <textarea
                ref={textareaRef}
                value={input}
                rows={1}
                placeholder="Ask about arrays, trees, graphs..."
                onChange={(e) => {
                  setInput(e.target.value);
                  autoResize();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                disabled={loading}
              />
              <button
                className="send-btn"
                onClick={() => send()}
                disabled={loading || !input.trim()}
              >
                <span className="send-arrow">↑</span>
              </button>
            </div>
            <p className="input-hint">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </main>
    </div>
  );
}