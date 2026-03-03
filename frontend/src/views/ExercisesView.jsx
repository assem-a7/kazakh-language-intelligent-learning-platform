// UI-only changes; logic unchanged
import { useState, useEffect, useCallback } from "react";
import { Loader2, AlertCircle, Languages, AlignLeft, ListChecks, ArrowRight, Check, X, RefreshCw, ChevronLeft } from "lucide-react";
import AppHeader from "../components/AppHeader";
import { loadCsv } from "../utils/csvLoader";

const LS_ATTEMPTS_KEY = "qazaqai_attempts";

const TYPES = [
  { id: "translate",   icon: Languages,  accent: "#c8880a", title: "Перевод",                  desc: "Переведи казахское предложение на русский" },
  { id: "fill",        icon: AlignLeft,  accent: "#1fa89a", title: "Заполни пропуск",           desc: "Восстанови пропущенное слово в предложении" },
  { id: "multichoice", icon: ListChecks, accent: "#b84020", title: "Выбери правильный перевод", desc: "Выбери точный перевод из четырёх вариантов" },
];

function hexRgb(hex) {
  const h = hex.replace("#","");
  return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`;
}

// ── localStorage helpers ──────────────────────────────────────────────────────
function saveAttempt(entry) {
  try {
    const raw  = localStorage.getItem(LS_ATTEMPTS_KEY);
    const prev = raw ? JSON.parse(raw) : [];
    localStorage.setItem(LS_ATTEMPTS_KEY, JSON.stringify([...prev, entry]));
  } catch {}
}

// ── Pick N unique random items from array ─────────────────────────────────────
function pickRandom(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

// ── Translate exercise ────────────────────────────────────────────────────────
function TranslateExercise({ sentence, onResult }) {
  const [value, setValue]   = useState("");
  const [submitted, setSub] = useState(false);

  const handleSubmit = () => {
    if (!value.trim()) return;
    setSub(true);
  };

  const handleNext = () => {
    saveAttempt({ ts: Date.now(), view:"exercises", type:"translate", sentence_id: sentence.id, correct: null, time_ms: null });
    onResult();
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.1rem" }}>
      <div style={{ background:`rgba(200,136,10,.06)`, border:`1px solid rgba(200,136,10,.2)`, borderRadius:12, padding:"1.15rem" }}>
        <div style={{ fontSize:".65rem", fontWeight:700, color:"#a86810", letterSpacing:".08em", textTransform:"uppercase", marginBottom:".55rem" }}>Казахский</div>
        <p style={{ fontSize:"1.05rem", fontWeight:700, color:"#2c2010", lineHeight:1.45 }}>{sentence.kaz}</p>
      </div>

      <div>
        <label style={{ display:"block", fontSize:".72rem", fontWeight:700, color:"#a08060", letterSpacing:".07em", textTransform:"uppercase", marginBottom:".45rem" }}>
          Твой перевод
        </label>
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          disabled={submitted}
          placeholder="Введи перевод на русском…"
          rows={2}
          style={{
            width:"100%", background: submitted ? "#f5f0e8" : "#fff",
            border:`1px solid ${submitted ? "rgba(180,130,40,.22)" : "rgba(180,130,40,.22)"}`,
            borderRadius:11, padding:".7rem .95rem", fontSize:".9rem", color:"#2c2010",
            resize:"vertical", outline:"none", boxSizing:"border-box", fontFamily:"inherit",
            transition:"border-color .2s",
          }}
        />
      </div>

      {submitted && (
        <div style={{ background:"rgba(200,136,10,.06)", border:"1px solid rgba(200,136,10,.2)", borderRadius:11, padding:".9rem 1rem" }}>
          <div style={{ fontSize:".65rem", fontWeight:700, color:"#a86810", letterSpacing:".08em", textTransform:"uppercase", marginBottom:".4rem" }}>Перевод из датасета</div>
          <p style={{ color:"#6b5030", fontSize:".875rem", fontStyle:"italic" }}>{sentence.ru}</p>
        </div>
      )}

      <div style={{ display:"flex", gap:".75rem" }}>
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            style={{
              flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:".4rem",
              background:"linear-gradient(115deg,#c8880a,#b06820)",
              border:"none", borderRadius:99, padding:".65rem 1.5rem", minHeight:44,
              fontWeight:700, fontSize:".875rem", color:"#fff",
              opacity: value.trim() ? 1 : .35, cursor: value.trim() ? "pointer" : "not-allowed",
              boxShadow:"0 2px 10px rgba(200,136,10,.3)",
              transition:"opacity .2s",
            }}
          >
            Проверить
          </button>
        ) : (
          <button onClick={handleNext} style={{
            flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:".4rem",
            background:"#fff", border:"1px solid rgba(180,130,40,.28)",
            borderRadius:99, padding:".65rem 1.5rem", minHeight:44,
            fontWeight:600, fontSize:".875rem", color:"#7a5a30", cursor:"pointer",
            boxShadow:"0 1px 5px rgba(120,80,20,.08)",
          }}>
            Следующее <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Multichoice exercise ──────────────────────────────────────────────────────
function MultiChoiceExercise({ sentence, distractors, onResult }) {
  const [selected, setSelected] = useState(null);
  const [startTs]               = useState(Date.now());

  const options = useState(() => {
    const wrong = pickRandom(distractors.filter(s => s.id !== sentence.id), 3).map(s => s.ru);
    const opts  = [...wrong, sentence.ru].sort(() => Math.random() - .5);
    return opts;
  })[0];

  const handlePick = (opt) => {
    if (selected !== null) return;
    const correct = opt === sentence.ru;
    setSelected(opt);
    saveAttempt({ ts: Date.now(), view:"exercises", type:"multichoice", sentence_id: sentence.id, correct, time_ms: Date.now() - startTs });
  };

  const colorFor = (opt) => {
    if (selected === null) return { border:"rgba(180,130,40,.18)", bg:"#fff" };
    if (opt === sentence.ru)  return { border:"rgba(31,168,154,.45)",  bg:"rgba(31,168,154,.06)" };
    if (opt === selected)     return { border:"rgba(184,64,32,.4)",    bg:"rgba(184,64,32,.05)"  };
    return { border:"rgba(180,130,40,.12)", bg:"#faf7f2" };
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.1rem" }}>
      <div style={{ background:"rgba(184,64,32,.05)", border:"1px solid rgba(184,64,32,.18)", borderRadius:12, padding:"1.15rem" }}>
        <div style={{ fontSize:".65rem", fontWeight:700, color:"#b84020", letterSpacing:".08em", textTransform:"uppercase", marginBottom:".55rem" }}>Казахский</div>
        <p style={{ fontSize:"1.05rem", fontWeight:700, color:"#2c2010", lineHeight:1.45 }}>{sentence.kaz}</p>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:".5rem" }}>
        {options.map((opt, i) => {
          const { border, bg } = colorFor(opt);
          const isCorrect = selected && opt === sentence.ru;
          const isWrong   = selected === opt && opt !== sentence.ru;
          return (
            <button key={i} onClick={() => handlePick(opt)} style={{
              textAlign:"left", padding:".8rem .95rem",
              background:bg, border:`1px solid ${border}`,
              borderRadius:11, cursor: selected ? "default" : "pointer",
              display:"flex", alignItems:"center", gap:".75rem",
              boxShadow:"0 1px 4px rgba(120,80,20,.05)",
              transition:"border-color .2s, background .2s",
            }}>
              {isCorrect && <Check size={14} style={{ color:"#1fa89a", flexShrink:0 }} />}
              {isWrong   && <X     size={14} style={{ color:"#b84020", flexShrink:0 }} />}
              {!isCorrect && !isWrong && (
                <span style={{ width:14, height:14, borderRadius:"50%", border:"1px solid rgba(180,130,40,.28)", flexShrink:0 }} />
              )}
              <span style={{ fontSize:".875rem", color: isCorrect ? "#1fa89a" : isWrong ? "#b84020" : "#4a3018" }}>
                {opt}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <button onClick={onResult} style={{
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

// ── Fill-blank exercise ───────────────────────────────────────────────────────
function FillExercise({ sentence, onResult }) {
  const [startTs]          = useState(Date.now());
  const words  = sentence.kaz.trim().split(/\s+/);
  const target = words[words.length - 1];
  const stem   = words.slice(0, -1).join(" ");

  const [value, setValue]   = useState("");
  const [submitted, setSub] = useState(false);
  const correct = value.trim().toLowerCase() === target.toLowerCase();

  const handleSubmit = () => {
    if (!value.trim()) return;
    setSub(true);
    saveAttempt({ ts: Date.now(), view:"exercises", type:"fill", sentence_id: sentence.id, correct, time_ms: Date.now() - startTs });
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.1rem" }}>
      <div style={{ background:"rgba(31,168,154,.05)", border:"1px solid rgba(31,168,154,.2)", borderRadius:12, padding:"1.15rem" }}>
        <div style={{ fontSize:".65rem", fontWeight:700, color:"#1a8880", letterSpacing:".08em", textTransform:"uppercase", marginBottom:".55rem" }}>Заполни пропуск</div>
        <p style={{ fontSize:"1rem", fontWeight:700, color:"#2c2010", lineHeight:1.55 }}>
          {stem}{" "}
          <span style={{
            display:"inline-block", minWidth:72, height:"1.4em",
            background: submitted ? (correct ? "rgba(31,168,154,.1)" : "rgba(184,64,32,.08)") : "rgba(180,130,40,.08)",
            border: `1px solid ${submitted ? (correct ? "rgba(31,168,154,.35)" : "rgba(184,64,32,.3)") : "rgba(180,130,40,.22)"}`,
            borderRadius:6, padding:"0 .4em", verticalAlign:"middle",
            color: submitted ? (correct ? "#1fa89a" : "#b84020") : "#4a3018",
            transition:"background .2s, border-color .2s, color .2s",
          }}>
            {submitted ? target : " "}
          </span>
        </p>
        <p style={{ marginTop:".55rem", color:"#8a6030", fontSize:".8rem", fontStyle:"italic" }}>{sentence.ru}</p>
      </div>

      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !submitted) handleSubmit(); }}
        disabled={submitted}
        placeholder="Введи пропущенное слово…"
        style={{
          width:"100%", boxSizing:"border-box",
          background: submitted ? "#f5f0e8" : "#fff",
          border:`1px solid ${submitted ? (correct ? "rgba(31,168,154,.35)" : "rgba(184,64,32,.3)") : "rgba(180,130,40,.22)"}`,
          borderRadius:11, padding:".7rem .95rem", fontSize:".9rem",
          color:"#2c2010", outline:"none", fontFamily:"inherit",
          transition:"border-color .2s",
        }}
      />

      {submitted && (
        <div style={{
          display:"flex", alignItems:"center", gap:".6rem",
          padding:".65rem .95rem", borderRadius:10,
          background: correct ? "rgba(31,168,154,.06)" : "rgba(184,64,32,.06)",
          border: `1px solid ${correct ? "rgba(31,168,154,.25)" : "rgba(184,64,32,.22)"}`,
        }}>
          {correct
            ? <Check size={14} style={{ color:"#1fa89a", flexShrink:0 }} />
            : <X     size={14} style={{ color:"#b84020", flexShrink:0 }} />}
          <span style={{ fontSize:".85rem", color: correct ? "#1fa89a" : "#b84020", fontWeight:600 }}>
            {correct ? "Верно!" : `Правильный ответ: ${target}`}
          </span>
        </div>
      )}

      <div style={{ display:"flex", gap:".75rem" }}>
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            style={{
              flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:".4rem",
              background:"linear-gradient(115deg,#1fa89a,#178a7e)",
              border:"none", borderRadius:99, padding:".65rem 1.5rem", minHeight:44,
              fontWeight:700, fontSize:".875rem", color:"#fff",
              opacity: value.trim() ? 1 : .35, cursor: value.trim() ? "pointer" : "not-allowed",
              boxShadow:"0 2px 10px rgba(31,168,154,.3)",
              transition:"opacity .2s",
            }}
          >
            Проверить
          </button>
        ) : (
          <button onClick={onResult} style={{
            flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:".4rem",
            background:"#fff", border:"1px solid rgba(180,130,40,.28)",
            borderRadius:99, padding:".65rem 1.5rem", minHeight:44,
            fontWeight:600, fontSize:".875rem", color:"#7a5a30", cursor:"pointer",
            boxShadow:"0 1px 5px rgba(120,80,20,.08)",
          }}>
            Следующее <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Active exercise wrapper ───────────────────────────────────────────────────
function ActiveExercise({ type, sentences, onBack }) {
  const [pool]        = useState(() => pickRandom(sentences, Math.min(20, sentences.length)));
  const [idx, setIdx] = useState(0);

  if (pool.length === 0) {
    return (
      <div style={{ textAlign:"center", padding:"3rem 0", color:"#a08060", fontSize:".875rem" }}>
        Недостаточно предложений для упражнений
      </div>
    );
  }

  const sentence = pool[idx];
  const meta     = TYPES.find(t => t.id === type);
  const rgb      = hexRgb(meta.accent);
  const progress = `${idx + 1} / ${pool.length}`;

  const handleNext = () => {
    if (idx + 1 < pool.length) setIdx(i => i + 1);
    else onBack();
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.1rem" }}>
      {/* Progress bar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
        <button
          onClick={onBack}
          style={{
            display:"flex", alignItems:"center", gap:".35rem",
            fontSize:".8rem", color:"#a08060", background:"none", border:"none", cursor:"pointer",
            transition:"color .2s",
          }}
          onMouseEnter={e => e.currentTarget.style.color="#4a2e08"}
          onMouseLeave={e => e.currentTarget.style.color="#a08060"}
        >
          <ChevronLeft size={14} /> {meta.title}
        </button>
        <div style={{ flex:1, height:3, background:"rgba(180,130,40,.12)", borderRadius:99, overflow:"hidden" }}>
          <div style={{ height:"100%", borderRadius:99, background:`linear-gradient(90deg,${meta.accent},rgba(${rgb},.4))`, width:`${((idx+1)/pool.length)*100}%`, transition:"width .3s" }} />
        </div>
        <span style={{ fontSize:".72rem", color:"#a08060", whiteSpace:"nowrap", fontWeight:600 }}>{progress}</span>
      </div>

      {type === "translate"   && <TranslateExercise   key={idx} sentence={sentence} onResult={handleNext} />}
      {type === "multichoice" && <MultiChoiceExercise key={idx} sentence={sentence} distractors={sentences} onResult={handleNext} />}
      {type === "fill"        && <FillExercise        key={idx} sentence={sentence} onResult={handleNext} />}
    </div>
  );
}

// ── category filter helper ────────────────────────────────────────────────────
const MIN_POOL = 20;

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

// ── Main view ─────────────────────────────────────────────────────────────────
export default function ExercisesView({ onBack, onExit }) {
  const [sentences, setSentences]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [activeType, setActiveType]   = useState(null);

  useEffect(() => {
    loadCsv("/data/sentences.csv")
      .then(rows => { setSentences(applyFilter(rows)); setLoading(false); })
      .catch(err  => { setError(err.message); setLoading(false); });
  }, []);

  return (
    <div style={{ minHeight:"100dvh", background:"#faf7f2", display:"flex", flexDirection:"column" }}>
      <style>{`
        .ex-tc {
          cursor:pointer; border-radius:13px; padding:1.1rem 1.2rem;
          border:1px solid rgba(180,130,40,.18); background:#fff;
          display:flex; align-items:center; gap:1rem; text-align:left;
          box-shadow:0 1px 6px rgba(120,80,20,.06);
          position:relative; overflow:hidden;
          transition:border-color .22s, box-shadow .22s, transform .2s;
        }
        .ex-tc:hover { transform:translateY(-2px); border-color:rgba(180,130,40,.36); box-shadow:0 6px 24px rgba(120,80,20,.12); }
        .ex-tc:focus-visible { outline:2px solid rgba(200,136,10,.5); outline-offset:2px; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .spin { animation:spin .9s linear infinite; }
      `}</style>

      <AppHeader
        title={activeType ? TYPES.find(t => t.id === activeType)?.title : "Упражнения"}
        onBack={activeType ? () => setActiveType(null) : onBack}
        onExit={onExit}
      />

      <div style={{ flex:1, overflowY:"auto", padding:"1.75rem 1.25rem 3rem" }}>
        <div style={{ maxWidth:640, margin:"0 auto" }}>

          {/* Loading */}
          {loading && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:".75rem", padding:"4rem 0", color:"#a08060", fontSize:".875rem" }}>
              <Loader2 size={22} className="spin" style={{ color:"#c8880a" }} />
              Загрузка предложений…
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{
              display:"flex", alignItems:"flex-start", gap:".75rem",
              background:"rgba(184,64,32,.06)", border:"1px solid rgba(184,64,32,.22)",
              borderRadius:13, padding:"1.25rem",
            }}>
              <AlertCircle size={18} style={{ color:"#b84020", flexShrink:0, marginTop:1 }} />
              <div>
                <div style={{ fontWeight:700, color:"#b84020", fontSize:".875rem", marginBottom:".3rem" }}>Не удалось загрузить предложения</div>
                <div style={{ fontSize:".8rem", color:"#6b5030" }}>{error}</div>
              </div>
            </div>
          )}

          {/* Type selector */}
          {!loading && !error && !activeType && (
            <>
              <div style={{ fontSize:".67rem", fontWeight:700, color:"#a08060", letterSpacing:".13em", textTransform:"uppercase", marginBottom:".9rem" }}>
                Тип упражнения
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:".6rem" }}>
                {TYPES.map(t => {
                  const { id, icon:Icon, accent, title, desc } = t;
                  const rgb = hexRgb(accent);
                  return (
                    <div key={id} className="ex-tc" onClick={() => setActiveType(id)}>
                      <div style={{ position:"absolute", top:0, left:"1.2rem", width:32, height:2, background:`linear-gradient(90deg,${accent},transparent)`, borderRadius:"0 0 2px 2px" }} />
                      <div style={{ width:42, height:42, borderRadius:11, flexShrink:0, background:`rgba(${rgb},.1)`, border:`1px solid rgba(${rgb},.22)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Icon size={18} style={{ color:accent }} />
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:".9rem", color:"#2c2010", marginBottom:".22rem", lineHeight:1.3 }}>{title}</div>
                        <div style={{ fontSize:".8rem", color:"#8a6030", lineHeight:1.5 }}>{desc}</div>
                      </div>
                      <ArrowRight size={15} style={{ color:"rgba(180,130,40,.35)", flexShrink:0 }} />
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop:"1.5rem", fontSize:".72rem", color:"#b09070", textAlign:"center" }}>
                {(() => {
                  try {
                    const cat = localStorage.getItem("qazaqai_active_category");
                    return cat
                      ? `Категория: ${cat} · предложений в пуле: ${sentences.length}`
                      : `Загружено предложений: ${sentences.length}`;
                  } catch { return `Загружено предложений: ${sentences.length}`; }
                })()}
              </div>
            </>
          )}

          {/* Active exercise */}
          {!loading && !error && activeType && (
            <ActiveExercise
              type={activeType}
              sentences={sentences}
              onBack={() => setActiveType(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
