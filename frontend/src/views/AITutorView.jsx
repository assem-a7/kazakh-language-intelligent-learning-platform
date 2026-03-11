import { useState, useRef, useEffect } from "react";
import { Send, Trash2, Bot, User, Loader2, AlertCircle } from "lucide-react";
import AppHeader from "../components/AppHeader";

const API_URL = "http://localhost:8000";
const LS_KEY  = "qazaqai_tutor_history";
const MAX_HIST = 50;

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
}
function saveHistory(msgs) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(msgs.slice(-MAX_HIST))); }
  catch {}
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex", flexDirection: isUser ? "row-reverse" : "row",
      gap: ".6rem", alignItems: "flex-start", marginBottom: ".1rem",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
        background: isUser
          ? "linear-gradient(135deg,#c8880a,#b84020)"
          : "linear-gradient(135deg,#1fa89a,#0e7a72)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 8px rgba(120,80,20,.15)",
      }}>
        {isUser ? <User size={14} color="#fff" /> : <Bot size={14} color="#fff" />}
      </div>
      <div style={{
        maxWidth: "75%",
        background: isUser ? "linear-gradient(135deg,#c8880a,#b06820)" : "#fff",
        color: isUser ? "#fff" : "#2c2010",
        border: isUser ? "none" : "1px solid rgba(180,130,40,.2)",
        borderRadius: isUser ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
        padding: ".7rem .95rem",
        fontSize: ".875rem", lineHeight: 1.65,
        boxShadow: isUser ? "0 3px 12px rgba(200,136,10,.25)" : "0 2px 8px rgba(120,80,20,.07)",
        whiteSpace: "pre-wrap",
      }}>
        {msg.content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: ".6rem", alignItems: "flex-start" }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg,#1fa89a,#0e7a72)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Bot size={14} color="#fff" />
      </div>
      <div style={{
        background: "#fff", border: "1px solid rgba(180,130,40,.2)",
        borderRadius: "4px 14px 14px 14px", padding: ".75rem 1rem",
        display: "flex", gap: ".3rem", alignItems: "center",
      }}>
        {[0,1,2].map(i => (
          <span key={i} style={{
            width: 7, height: 7, borderRadius: "50%", background: "#c8880a", opacity: .4,
            animation: `tutorDot 1.2s ease-in-out ${i*0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

function SuggestedQuestion({ text, onClick }) {
  return (
    <button onClick={() => onClick(text)} style={{
      background: "#fff", border: "1px solid rgba(180,130,40,.25)",
      borderRadius: 99, padding: ".38rem .85rem",
      fontSize: ".775rem", fontWeight: 600, color: "#8a6030",
      cursor: "pointer", whiteSpace: "nowrap", transition: "all .18s",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(200,136,10,.5)"; e.currentTarget.style.background="rgba(200,136,10,.05)"; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(180,130,40,.25)"; e.currentTarget.style.background="#fff"; }}>
      {text}
    </button>
  );
}

const SUGGESTIONS = [
  "Сколько падежей в казахском?",
  "Что такое сингармонизм?",
  "Аудар: Мен мектепке барамын",
  "«Рахмет» дегеніміз не?",
  "Как сказать «я люблю тебя» по-казахски?",
  "Жатыс септігінің жалғаулары?",
  "Қазақ тілінде қанша әріп бар?",
  "Как образуется прошедшее время?",
];

export default function AITutorView({ onBack, onExit }) {
  const [messages, setMessages] = useState(() => loadHistory());
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);

  const userCount = messages.filter(m => m.role === "user").length;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { saveHistory(messages); }, [messages]);

  async function send(text) {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput(""); setError(null);

    setMessages(prev => [...prev, { role: "user", content: q, ts: Date.now() }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/ask-tutor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error(`Сервер қатесі: ${res.status}`);
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: "assistant", content: data.answer, ts: Date.now(),
      }]);
    } catch (err) {
      setError("Сервермен байланыс жоқ. Backend іске қосылған ба?");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Серверге қосыла алмадым. Терминалда бэкендті іске қос.",
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  function clearHistory() {
    if (window.confirm("Чат тарихын тазалайсыз ба?")) {
      setMessages([]); localStorage.removeItem(LS_KEY);
    }
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#faf7f2", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes tutorDot { 0%,80%,100%{transform:scale(1);opacity:.4} 40%{transform:scale(1.4);opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .tutor-textarea::placeholder{color:#b09070}
        .tutor-textarea:focus{outline:none;border-color:rgba(200,136,10,.45)!important;box-shadow:0 0 0 3px rgba(200,136,10,.1)!important}
      `}</style>

      <AppHeader title="AI Тьютор" onBack={onBack} onExit={onExit} />

      {/* Статус жолағы */}
      <div style={{
        background: "#fff", borderBottom: "1px solid rgba(180,130,40,.14)",
        padding: ".5rem 1.25rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#1fa89a" }} />
          <span style={{ fontSize: ".75rem", color: "#8a6030", fontWeight: 600 }}>
             AI · сұрақтар: <strong style={{ color: "#2c2010" }}>{userCount}</strong>
          </span>
        </div>
        {messages.length > 0 && (
          <button onClick={clearHistory} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: ".72rem", color: "#b09070", fontWeight: 600,
            display: "flex", alignItems: "center", gap: ".25rem",
          }}>
            <Trash2 size={11} /> Тазалау
          </button>
        )}
      </div>

      {/* Хабарламалар аймағы */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1rem" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: ".75rem" }}>

          {messages.length === 0 && (
            <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18, margin: "0 auto 1.25rem",
                background: "rgba(31,168,154,.1)", border: "1px solid rgba(31,168,154,.22)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Bot size={26} style={{ color: "#1fa89a" }} />
              </div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#2c2010", marginBottom: ".5rem" }}>
                Кез келген сұрақ қой!
              </h2>
              <p style={{ color: "#8a6030", fontSize: ".85rem", lineHeight: 1.7, maxWidth: 360, margin: "0 auto 1.5rem" }}>
                Грамматика, аударма, сөз мағынасы — AI жауап береді. Қазақша немесе орысша.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", justifyContent: "center" }}>
                {SUGGESTIONS.map(s => <SuggestedQuestion key={s} text={s} onClick={send} />)}
              </div>
            </div>
          )}

          {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Қате баннері */}
      {error && (
        <div style={{
          background: "rgba(184,64,32,.07)", border: "1px solid rgba(184,64,32,.2)",
          borderRadius: 10, margin: ".5rem 1rem", padding: ".6rem .9rem",
          display: "flex", gap: ".5rem", maxWidth: 680,
          marginLeft: "auto", marginRight: "auto",
        }}>
          <AlertCircle size={14} style={{ color: "#b84020", flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: ".775rem", color: "#7a2010" }}>{error}</span>
        </div>
      )}

      {/* Енгізу аймағы */}
      <div style={{
        background: "#fff", borderTop: "1px solid rgba(180,130,40,.16)",
        padding: ".85rem 1rem", boxShadow: "0 -2px 12px rgba(120,80,20,.07)",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: ".6rem", alignItems: "flex-end" }}>
          <textarea
            ref={textareaRef}
            className="tutor-textarea"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Сұрақты жаз… (Enter — жіберу)"
            rows={2}
            style={{
              flex: 1, resize: "none", fontFamily: "inherit",
              background: "#fff", border: "1px solid rgba(180,130,40,.25)",
              borderRadius: 12, padding: ".65rem .9rem",
              fontSize: ".875rem", color: "#2c2010", lineHeight: 1.5,
              transition: "border-color .2s, box-shadow .2s",
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: input.trim() && !loading
                ? "linear-gradient(135deg,#c8880a,#b84020)"
                : "rgba(180,130,40,.12)",
              border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: input.trim() && !loading ? "0 3px 12px rgba(200,136,10,.3)" : "none",
              transition: "all .2s",
            }}
          >
            {loading
              ? <Loader2 size={17} style={{ color: "#c8880a", animation: "spin .85s linear infinite" }} />
              : <Send size={17} color={input.trim() ? "#fff" : "#a08060"} />}
          </button>
        </div>
      </div>
    </div>
  );
}
