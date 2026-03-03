// UI-only changes; logic unchanged
import { useState, useEffect, useRef } from "react";
import { Loader2, AlertCircle, ListChecks, Languages, Check, X, ArrowRight, RefreshCw, BarChart2, ChevronLeft } from "lucide-react";
import AppHeader from "../components/AppHeader";
import { loadCsv } from "../utils/csvLoader";

const LS_KEY   = "qazaqai_attempts";
const POOL_SIZE = 10;

// ── helpers ───────────────────────────────────────────────────────────────────
function saveAttempt(entry) {
  try {
    const prev = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    localStorage.setItem(LS_KEY, JSON.stringify([...prev, entry]));
  } catch {}
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr, n) {
  return shuffle(arr).slice(0, n);
}

function normalise(s) {
  return (s || "").trim().toLowerCase().replace(/[.!?,;:]+$/, "").replace(/\s+/g, " ");
}

function hexRgb(hex) {
  const h = hex.replace("#","");
  return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`;
}

// ── category filter ───────────────────────────────────────────────────────────
const MIN_POOL = 10;

function applyFilter(rows) {
  try {
    const cat = localStorage.getItem("qazaqai_active_category");
    if (!cat) return rows;
    const filtered = rows.filter(s => String(s.category_id) === String(cat));
    return filtered.length >= MIN_POOL ? filtered : rows;
  } catch {
    return rows;
  }
}

// ── TYPE SELECTOR ─────────────────────────────────────────────────────────────
function TypeSelector({ onSelect }) {
  const TYPES = [
    { id: "multichoice",    icon: ListChecks, accent: "#c8880a", title: "Выбери перевод",  desc: "Выбери точный перевод казахского предложения из 4 вариантов" },
    { id: "translate_check", icon: Languages,  accent: "#1fa89a", title: "Введи перевод",   desc: "Напиши перевод сам — система проверит с учётом пунктуации" },
  ];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:".6rem" }}>
      <div style={{ fontSize:".67rem", fontWeight:700, color:"#a08060", letterSpacing:".13em", textTransform:"uppercase", marginBottom:".6rem" }}>
        Тип теста
      </div>
      {TYPES.map(({ id, icon:Icon, accent, title, desc }) => {
        const rgb = hexRgb(accent);
        return (
          <button key={id}
            onClick={() => onSelect(id)}
            style={{
              cursor:"pointer", borderRadius:13, padding:"1.1rem 1.2rem",
              border:"1px solid rgba(180,130,40,.18)", background:"#fff",
              display:"flex", alignItems:"center", gap:"1rem", textAlign:"left",
              position:"relative", overflow:"hidden",
              boxShadow:"0 1px 6px rgba(120,80,20,.06)",
              transition:"border-color .22s, box-shadow .22s, transform .2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.borderColor="rgba(180,130,40,.36)"; e.currentTarget.style.boxShadow="0 6px 24px rgba(120,80,20,.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.borderColor="rgba(180,130,40,.18)"; e.currentTarget.style.boxShadow="0 1px 6px rgba(120,80,20,.06)"; }}
          >
            <div style={{ position:"absolute", top:0, left:"1.2rem", width:32, height:2, background:`linear-gradient(90deg,${accent},transparent)`, borderRadius:"0 0 2px 2px" }} />
            <div style={{ width:42, height:42, borderRadius:11, flexShrink:0, background:`rgba(${rgb},.1)`, border:`1px solid rgba(${rgb},.22)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Icon size={18} style={{ color:accent }} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:".9rem", color:"#2c2010", marginBottom:".22rem", lineHeight:1.3 }}>{title}</div>
              <div style={{ fontSize:".8rem", color:"#8a6030", lineHeight:1.5 }}>{desc}</div>
            </div>
            <ArrowRight size={15} style={{ color:"rgba(180,130,40,.35)", flexShrink:0 }} />
          </button>
        );
      })}
    </div>
  );
}

// ── PROGRESS BAR ─────────────────────────────────────────────────────────────
function ProgressBar({ current, total, accent = "#c8880a" }) {
  const rgb = hexRgb(accent);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:".85rem" }}>
      <div style={{ flex:1, height:3, background:"rgba(180,130,40,.12)", borderRadius:99, overflow:"hidden" }}>
        <div style={{ height:"100%", borderRadius:99, background:`linear-gradient(90deg,${accent},rgba(${rgb},.4))`, width:`${(current/total)*100}%`, transition:"width .35s ease" }} />
      </div>
      <span style={{ fontSize:".72rem", color:"#a08060", whiteSpace:"nowrap", flexShrink:0, fontWeight:600 }}>{current}/{total}</span>
    </div>
  );
}

// ── MULTICHOICE QUESTION ──────────────────────────────────────────────────────
function MultiChoiceQ({ sentence, pool, onAnswer }) {
  const options = useRef(null);
  if (!options.current) {
    const wrong = pickRandom(pool.filter(s => s.id !== sentence.id && s.ru && s.ru.trim()), 3).map(s => s.ru);
    options.current = shuffle([...wrong, sentence.ru]);
  }
  const [picked, setPicked] = useState(null);
  const startTs = useRef(Date.now());

  const handle = (opt) => {
    if (picked) return;
    const correct = opt === sentence.ru;
    setPicked(opt);
    saveAttempt({ ts: Date.now(), view:"tests", type:"multichoice", sentence_id: sentence.id, correct, time_ms: Date.now() - startTs.current });
    setTimeout(() => onAnswer(correct), 900);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
      <div style={{ background:"rgba(200,136,10,.06)", border:"1px solid rgba(200,136,10,.2)", borderRadius:12, padding:"1.1rem" }}>
        <div style={{ fontSize:".65rem", fontWeight:700, color:"#a86810", letterSpacing:".08em", textTransform:"uppercase", marginBottom:".5rem" }}>Казахский</div>
        <p style={{ fontSize:"1.05rem", fontWeight:700, color:"#2c2010", lineHeight:1.45 }}>{sentence.kaz}</p>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:".5rem" }}>
        {options.current.map((opt, i) => {
          const isCorrect = opt === sentence.ru;
          const isWrong   = picked === opt && !isCorrect;
          const revealed  = !!picked;
          let border = "rgba(180,130,40,.18)", bg = "#fff";
          if (revealed && isCorrect) { border = "rgba(31,168,154,.45)"; bg = "rgba(31,168,154,.06)"; }
          if (isWrong)               { border = "rgba(184,64,32,.4)";   bg = "rgba(184,64,32,.05)";  }
          if (revealed && !isCorrect && !isWrong) { border = "rgba(180,130,40,.12)"; bg = "#faf7f2"; }
          return (
            <button key={i} onClick={() => handle(opt)} style={{
              textAlign:"left", padding:".75rem .95rem",
              background:bg, border:`1px solid ${border}`,
              borderRadius:11, cursor: picked ? "default" : "pointer",
              display:"flex", alignItems:"center", gap:".75rem",
              boxShadow:"0 1px 4px rgba(120,80,20,.05)",
              transition:"border-color .2s, background .2s",
            }}>
              {revealed && isCorrect && <Check size={14} style={{ color:"#1fa89a", flexShrink:0 }} />}
              {isWrong               && <X     size={14} style={{ color:"#b84020", flexShrink:0 }} />}
              {!revealed             && <span style={{ width:14, height:14, borderRadius:"50%", border:"1px solid rgba(180,130,40,.28)", flexShrink:0, display:"inline-block" }} />}
              {revealed && !isCorrect && !isWrong && <span style={{ width:14, height:14, flexShrink:0 }} />}
              <span style={{ fontSize:".875rem", color: isWrong ? "#b84020" : revealed && isCorrect ? "#1fa89a" : "#4a3018" }}>{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── TRANSLATE-CHECK QUESTION ──────────────────────────────────────────────────
function TranslateCheckQ({ sentence, onAnswer }) {
  const [value, setValue]   = useState("");
  const [result, setResult] = useState(null);
  const startTs = useRef(Date.now());

  const handle = () => {
    if (!value.trim()) return;
    const correct = normalise(value) === normalise(sentence.ru);
    const timems  = Date.now() - startTs.current;
    setResult({ correct, expected: sentence.ru });
    saveAttempt({ ts: Date.now(), view:"tests", type:"translate_check", sentence_id: sentence.id, correct, time_ms: timems });
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
      <div style={{ background:"rgba(31,168,154,.05)", border:"1px solid rgba(31,168,154,.2)", borderRadius:12, padding:"1.1rem" }}>
        <div style={{ fontSize:".65rem", fontWeight:700, color:"#1a8880", letterSpacing:".08em", textTransform:"uppercase", marginBottom:".5rem" }}>Казахский</div>
        <p style={{ fontSize:"1.05rem", fontWeight:700, color:"#2c2010", lineHeight:1.45 }}>{sentence.kaz}</p>
      </div>

      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        disabled={!!result}
        placeholder="Введи перевод на русском…"
        rows={2}
        style={{
          width:"100%", boxSizing:"border-box",
          background: result ? "#f5f0e8" : "#fff",
          border:`1px solid ${result ? (result.correct ? "rgba(31,168,154,.35)" : "rgba(184,64,32,.3)") : "rgba(180,130,40,.22)"}`,
          borderRadius:11, padding:".7rem .95rem", fontSize:".9rem",
          color:"#2c2010", resize:"vertical", outline:"none", fontFamily:"inherit",
          transition:"border-color .2s",
        }}
        onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey && !result) { e.preventDefault(); handle(); } }}
      />

      {result && (
        <div style={{
          display:"flex", flexDirection:"column", gap:".5rem",
          background: result.correct ? "rgba(31,168,154,.06)" : "rgba(184,64,32,.06)",
          border:`1px solid ${result.correct ? "rgba(31,168,154,.25)" : "rgba(184,64,32,.22)"}`,
          borderRadius:11, padding:".85rem .95rem",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:".5rem" }}>
            {result.correct ? <Check size={14} style={{ color:"#1fa89a" }} /> : <X size={14} style={{ color:"#b84020" }} />}
            <span style={{ fontWeight:700, fontSize:".875rem", color: result.correct ? "#1fa89a" : "#b84020" }}>
              {result.correct ? "Верно!" : "Неверно"}
            </span>
          </div>
          {!result.correct && (
            <p style={{ fontSize:".82rem", color:"#7a5a30", fontStyle:"italic", marginLeft:"1.4rem" }}>
              Правильный ответ: {result.expected}
            </p>
          )}
        </div>
      )}

      {!result ? (
        <button onClick={handle} disabled={!value.trim()} style={{
          display:"flex", alignItems:"center", justifyContent:"center", gap:".4rem",
          background:"linear-gradient(115deg,#1fa89a,#178a7e)",
          border:"none", borderRadius:99, padding:".65rem 1.5rem", minHeight:44,
          fontWeight:700, fontSize:".875rem", color:"#fff",
          opacity: value.trim() ? 1 : .35, cursor: value.trim() ? "pointer" : "not-allowed",
          boxShadow:"0 2px 10px rgba(31,168,154,.28)",
          transition:"opacity .2s",
        }}>
          Проверить
        </button>
      ) : (
        <button onClick={() => onAnswer(result.correct)} style={{
          display:"flex", alignItems:"center", justifyContent:"center", gap:".4rem",
          background:"#fff", border:"1px solid rgba(180,130,40,.28)",
          borderRadius:99, padding:".65rem 1.5rem", minHeight:44,
          fontWeight:600, fontSize:".875rem", color:"#7a5a30", cursor:"pointer",
          boxShadow:"0 1px 5px rgba(120,80,20,.08)",
        }}>
          Следующее <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

// ── RESULT SCREEN ─────────────────────────────────────────────────────────────
function ResultScreen({ correct, total, onRetry, onProgress }) {
  const pct   = Math.round((correct / total) * 100);
  const color = pct >= 70 ? "#1fa89a" : pct >= 50 ? "#c8880a" : "#b84020";
  const rgb   = hexRgb(color);
  return (
    <div style={{ textAlign:"center", padding:"1rem 0" }}>
      <div style={{
        width:90, height:90, borderRadius:"50%", margin:"0 auto 1.5rem",
        background:`rgba(${rgb},.08)`, border:`2px solid rgba(${rgb},.35)`,
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      }}>
        <span style={{ fontSize:"1.5rem", fontWeight:900, color }}>{pct}%</span>
      </div>
      <h2 style={{ fontSize:"1.25rem", fontWeight:800, color:"#2c2010", marginBottom:".5rem" }}>
        {pct >= 70 ? "Отличный результат" : pct >= 50 ? "Неплохо" : "Нужно повторить"}
      </h2>
      <p style={{ color:"#8a6030", fontSize:".875rem", marginBottom:"2rem" }}>
        Верно: {correct} из {total}
      </p>
      {pct < 50 && (
        <div style={{
          background:"rgba(184,64,32,.06)", border:"1px solid rgba(184,64,32,.2)",
          borderRadius:12, padding:".9rem 1rem", marginBottom:"1.5rem", textAlign:"left",
        }}>
          <p style={{ fontSize:".82rem", color:"#6b5030", lineHeight:1.7 }}>
            💡 <strong style={{ color:"#4a2e08" }}>Рекомендация:</strong> пройди раздел «Упражнения → Выбери правильный перевод» перед следующим тестом.
          </p>
        </div>
      )}
      <div style={{ display:"flex", gap:".75rem", justifyContent:"center", flexWrap:"wrap" }}>
        <button onClick={onRetry} style={{
          display:"flex", alignItems:"center", gap:".4rem",
          background:"#fff", border:"1px solid rgba(180,130,40,.28)",
          borderRadius:99, padding:".65rem 1.5rem", minHeight:44,
          fontWeight:600, fontSize:".875rem", color:"#7a5a30", cursor:"pointer",
          boxShadow:"0 1px 5px rgba(120,80,20,.08)",
        }}>
          <RefreshCw size={14} /> Повторить
        </button>
        <button onClick={onProgress} style={{
          display:"flex", alignItems:"center", gap:".4rem",
          background:"linear-gradient(115deg,#c8880a,#b06820)",
          border:"none", borderRadius:99, padding:".65rem 1.5rem", minHeight:44,
          fontWeight:700, fontSize:".875rem", color:"#fff", cursor:"pointer",
          boxShadow:"0 2px 10px rgba(200,136,10,.3)",
        }}>
          <BarChart2 size={14} /> В прогресс
        </button>
      </div>
    </div>
  );
}

// ── ACTIVE TEST ───────────────────────────────────────────────────────────────
function ActiveTest({ type, sentences, onFinish, onProgress }) {
  const pool     = useRef(pickRandom(sentences, Math.min(POOL_SIZE, sentences.length)));
  const [idx, setIdx]     = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone]   = useState(false);

  const accent = type === "multichoice" ? "#c8880a" : "#1fa89a";

  const handleAnswer = (correct) => {
    const newScore = score + (correct ? 1 : 0);
    if (idx + 1 >= pool.current.length) {
      setScore(newScore);
      setDone(true);
    } else {
      setScore(newScore);
      setIdx(i => i + 1);
    }
  };

  if (done) return <ResultScreen correct={score} total={pool.current.length} onRetry={onFinish} onProgress={onProgress} />;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
      <div style={{ display:"flex", alignItems:"center", gap:".75rem" }}>
        <button
          onClick={onFinish}
          style={{
            display:"flex", alignItems:"center", gap:".3rem",
            fontSize:".8rem", color:"#a08060", background:"none", border:"none", cursor:"pointer", transition:"color .2s",
          }}
          onMouseEnter={e=>e.currentTarget.style.color="#4a2e08"}
          onMouseLeave={e=>e.currentTarget.style.color="#a08060"}
        >
          <ChevronLeft size={14} /> Выход
        </button>
        <ProgressBar current={idx + 1} total={pool.current.length} accent={accent} />
      </div>

      {type === "multichoice"
        ? <MultiChoiceQ    key={idx} sentence={pool.current[idx]} pool={sentences} onAnswer={handleAnswer} />
        : <TranslateCheckQ key={idx} sentence={pool.current[idx]} onAnswer={handleAnswer} />
      }
    </div>
  );
}

// ── MAIN VIEW ─────────────────────────────────────────────────────────────────
export default function TestsView({ onBack, onExit, onProgress }) {
  const [sentences, setSentences] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [testType, setTestType]   = useState(null);
  const [catLabel, setCatLabel]   = useState("");

  useEffect(() => {
    loadCsv("/data/sentences.csv")
      .then(rows => { setSentences(applyFilter(rows.filter(r => r.kaz && r.ru))); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });

    try {
      const cat = localStorage.getItem("qazaqai_active_category");
      if (cat) {
        loadCsv("/data/categories.csv")
          .then(rows => {
            const found = rows.find(r => String(r.id) === String(cat) || r.slug === cat);
            if (found) setCatLabel(found.name_ru || found.slug || cat);
            else setCatLabel(cat);
          })
          .catch(() => setCatLabel(cat));
      }
    } catch {}
  }, []);

  const handleFinish = () => setTestType(null);

  return (
    <div style={{ minHeight:"100dvh", background:"#faf7f2", display:"flex", flexDirection:"column" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .9s linear infinite}`}</style>

      <AppHeader
        title={testType ? (testType === "multichoice" ? "Тест: Выбери перевод" : "Тест: Введи перевод") : "Тесты"}
        onBack={testType ? handleFinish : onBack}
        onExit={onExit}
      />

      <div style={{ flex:1, overflowY:"auto", padding:"1.75rem 1.25rem 3rem" }}>
        <div style={{ maxWidth:620, margin:"0 auto" }}>

          {loading && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:".75rem", padding:"4rem 0", color:"#a08060", fontSize:".875rem" }}>
              <Loader2 size={22} className="spin" style={{ color:"#c8880a" }} />
              Загрузка вопросов…
            </div>
          )}

          {!loading && error && (
            <div style={{ display:"flex", alignItems:"flex-start", gap:".75rem", background:"rgba(184,64,32,.06)", border:"1px solid rgba(184,64,32,.22)", borderRadius:13, padding:"1.25rem" }}>
              <AlertCircle size={18} style={{ color:"#b84020", flexShrink:0, marginTop:1 }} />
              <div>
                <div style={{ fontWeight:700, color:"#b84020", fontSize:".875rem", marginBottom:".3rem" }}>Не удалось загрузить</div>
                <div style={{ fontSize:".8rem", color:"#6b5030" }}>{error}</div>
              </div>
            </div>
          )}

          {!loading && !error && !testType && (
            <>
              {catLabel && (
                <div style={{
                  display:"inline-flex", alignItems:"center", gap:".45rem",
                  background:"rgba(200,136,10,.08)", border:"1px solid rgba(200,136,10,.22)",
                  borderRadius:99, padding:".3rem .85rem", marginBottom:"1.1rem",
                  fontSize:".75rem", fontWeight:600, color:"#a86810",
                }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:"#c8880a", display:"inline-block" }} />
                  Текущая тема: {catLabel}
                  <span style={{ color:"#b09070", fontWeight:400 }}>· {sentences.length} предл.</span>
                </div>
              )}
              <TypeSelector onSelect={setTestType} />
            </>
          )}

          {!loading && !error && testType && (
            <ActiveTest
              type={testType}
              sentences={sentences}
              onFinish={handleFinish}
              onProgress={onProgress || onBack}
            />
          )}
        </div>
      </div>
    </div>
  );
}
