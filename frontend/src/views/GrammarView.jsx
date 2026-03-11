// UI-only changes; logic unchanged
import { useState, useEffect, useMemo } from "react";
import { Loader2, FileQuestion, ChevronDown, Search, X, Tag } from "lucide-react";
import AppHeader from "../components/AppHeader";
import { loadCsv } from "../utils/csvLoader";

const DIFF_META = {
  "1": { label: "Базовый",     color: "#c8880a" },
  "2": { label: "Средний",     color: "#1fa89a" },
  "3": { label: "Продвинутый", color: "#b84020" },
};

function hexRgb(hex) {
  const h = hex.replace("#","");
  return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`;
}

// ── Empty state ───────────────────────────────────────────────────────────────
function GrammarEmpty({ error }) {
  const is404 = error && (error.includes("404") || error.includes("Failed to load"));
  return (
    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"2rem 1.5rem" }}>
      <div style={{ maxWidth:420, textAlign:"center" }}>
        <div style={{
          width:68, height:68, borderRadius:20, margin:"0 auto 1.5rem",
          background:"rgba(200,136,10,.08)", border:"1px solid rgba(200,136,10,.2)",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <FileQuestion size={28} style={{ color:"#c8880a", opacity:.8 }} />
        </div>
        <h2 style={{ fontSize:"1.2rem", fontWeight:800, color:"#2c2010", marginBottom:".6rem" }}>
          {is404 ? "grammar.csv не найден" : "Ошибка загрузки"}
        </h2>
        <p style={{ color:"#7a5a30", fontSize:".875rem", lineHeight:1.75, marginBottom:"1.5rem" }}>
          {is404
            ? "Добавьте файл с данными по грамматике в папку проекта:"
            : error}
        </p>
        {is404 && (
          <div style={{
            background:"#fff", border:"1px solid rgba(180,130,40,.18)",
            borderRadius:12, padding:"1rem 1.25rem", textAlign:"left",
            boxShadow:"0 2px 10px rgba(120,80,20,.07)",
          }}>
            <div style={{ fontSize:".68rem", fontWeight:700, color:"#a08060", letterSpacing:".1em", textTransform:"uppercase", marginBottom:".6rem" }}>
              Путь к файлу
            </div>
            <code style={{ fontSize:".82rem", color:"#b84020", fontFamily:"monospace", letterSpacing:".02em" }}>
              frontend/public/data/grammar.csv
            </code>
            <div style={{ marginTop:"1rem", fontSize:".75rem", color:"#8a6030", lineHeight:1.65 }}>
              Ожидаемые колонки:<br />
              <code style={{ color:"#6b5030", fontSize:".72rem" }}>
                id, title_ru, rule_ru, example_kaz, example_ru, category, difficulty, tags
              </code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Single accordion card ─────────────────────────────────────────────────────
function GrammarCard({ rule, index, isInView }) {
  const [open, setOpen] = useState(false);
  const diff = DIFF_META[rule.difficulty] || { label: rule.difficulty, color: "#b06820" };
  const rgb  = hexRgb(diff.color);

  return (
    <div
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? "none" : "translateY(16px)",
        transition: `opacity .45s cubic-bezier(0.22,1,0.36,1) ${Math.min(index,8)*45}ms, transform .45s cubic-bezier(0.22,1,0.36,1) ${Math.min(index,8)*45}ms`,
        background: "#fff",
        border: `1px solid ${open ? `rgba(${rgb},.3)` : "rgba(180,130,40,.16)"}`,
        borderRadius: 13,
        overflow: "hidden",
        boxShadow: open ? `0 4px 18px rgba(120,80,20,.10)` : "0 1px 5px rgba(120,80,20,.05)",
      }}
      className="grammar-card"
    >
      {/* Header row */}
      <button
        className="grammar-card-btn"
        onClick={() => setOpen(o => !o)}
        style={{
          width:"100%", textAlign:"left", padding:"1rem 1.15rem",
          display:"flex", alignItems:"center", gap:".85rem",
          background:"none", border:"none", cursor:"pointer", minHeight:52,
        }}
      >
        {/* Diff dot */}
        <span style={{ width:8, height:8, borderRadius:"50%", background:diff.color, flexShrink:0 }} />

        <span style={{ flex:1, fontWeight:600, fontSize:".9rem", color: open ? "#2c2010" : "#4a3018", lineHeight:1.4, transition:"color .2s" }}>
          {rule.title_ru}
        </span>

        {rule.category && (
          <span style={{
            display:"none",
            fontSize:".65rem", fontWeight:600, color:`rgba(${rgb},.9)`, letterSpacing:".04em",
            background:`rgba(${rgb},.09)`, border:`1px solid rgba(${rgb},.2)`,
            borderRadius:99, padding:".15rem .5rem", flexShrink:0,
          }} className="grammar-cat-badge">
            {rule.category}
          </span>
        )}

        <span style={{
          width:26, height:26, borderRadius:"50%", flexShrink:0,
          background: open ? `rgba(${rgb},.1)` : "rgba(180,130,40,.08)",
          border: `1px solid ${open ? `rgba(${rgb},.28)` : "rgba(180,130,40,.18)"}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          transform: open ? "rotate(180deg)" : "none",
          transition:"transform .25s cubic-bezier(.4,0,.2,1), background .2s, border-color .2s",
        }}>
          <ChevronDown size={13} style={{ color: open ? diff.color : "#a08060" }} />
        </span>
      </button>

      {/* Expandable body */}
      <div style={{ maxHeight: open ? "600px" : 0, overflow:"hidden", transition:"max-height .35s cubic-bezier(.4,0,.2,1)" }}>
        <div style={{ padding:"0 1.15rem 1.15rem", display:"flex", flexDirection:"column", gap:"1rem" }}>

          {rule.rule_ru && (
            <p style={{ color:"#6b5030", fontSize:".875rem", lineHeight:1.8 }}>
              {rule.rule_ru}
            </p>
          )}

          {(rule.example_kaz || rule.example_ru) && (
            <div style={{
              background:`rgba(${rgb},.05)`, border:`1px solid rgba(${rgb},.18)`,
              borderRadius:11, padding:".85rem 1rem",
            }}>
              {rule.example_kaz && (
                <p style={{ fontWeight:700, fontSize:".95rem", color:"#2c2010", marginBottom:".35rem", letterSpacing:".01em" }}>
                  {rule.example_kaz}
                </p>
              )}
              {rule.example_ru && (
                <p style={{ color:"#8a6030", fontSize:".82rem", fontStyle:"italic" }}>
                  {rule.example_ru}
                </p>
              )}
            </div>
          )}

          {rule.tags && rule.tags.trim() && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:".4rem", alignItems:"center" }}>
              <Tag size={11} style={{ color:"#a08060", flexShrink:0 }} />
              {rule.tags.split(";").map(t => t.trim()).filter(Boolean).map(tag => (
                <span key={tag} style={{
                  fontSize:".65rem", color:"#7a5a30",
                  background:"rgba(180,130,40,.08)", border:"1px solid rgba(180,130,40,.18)",
                  borderRadius:99, padding:".15rem .5rem",
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────
export default function GrammarView({ onBack, onExit }) {
  const [rules, setRules]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [query, setQuery]     = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    loadCsv("/data/grammar.csv")
      .then(rows => { setRules(rows); setLoading(false); setTimeout(() => setMounted(true), 30); })
      .catch(err  => { setError(err.message); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return rules;
    const q = query.toLowerCase();
    return rules.filter(r =>
      (r.title_ru  || "").toLowerCase().includes(q) ||
      (r.rule_ru   || "").toLowerCase().includes(q) ||
      (r.category  || "").toLowerCase().includes(q) ||
      (r.tags      || "").toLowerCase().includes(q)
    );
  }, [rules, query]);

  return (
    <div style={{ minHeight:"100dvh", background:"#faf7f2", display:"flex", flexDirection:"column" }}>
      <style>{`
        .grammar-card { transition: border-color .2s, box-shadow .2s; }
        .grammar-card:hover { border-color: rgba(180,130,40,.32) !important; box-shadow: 0 4px 16px rgba(120,80,20,.10) !important; }
        @media (min-width:480px) { .grammar-cat-badge { display:inline-flex !important; } }
        .g-search-input::placeholder { color: #b09070; }
        .g-search-input { outline: none; }
        .g-search-wrap:focus-within { border-color: rgba(200,136,10,.42) !important; box-shadow: 0 0 0 3px rgba(200,136,10,.12) !important; }
        .g-clear-btn:focus-visible { outline: 2px solid rgba(200,136,10,.5); outline-offset: 2px; border-radius: 4px; }
        .grammar-card-btn:focus-visible { outline: 2px solid rgba(200,136,10,.45); outline-offset: -2px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin .9s linear infinite; }
      `}</style>

      <AppHeader title="Грамматика" onBack={onBack} onExit={onExit} />

      {/* Loading */}
      {loading && (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:".75rem", color:"#a08060", fontSize:".875rem" }}>
          <Loader2 size={22} className="spin" style={{ color:"#c8880a" }} />
          Загрузка правил…
        </div>
      )}

      {!loading && error && <GrammarEmpty error={error} />}

      {!loading && !error && (
        <div style={{ flex:1, overflowY:"auto", padding:"1.5rem 1.25rem 3rem" }}>
          <div style={{ maxWidth:680, margin:"0 auto" }}>

            {/* Search */}
            <div style={{
              display:"flex", alignItems:"center", gap:".75rem",
              background:"#fff", border:"1px solid rgba(180,130,40,.2)",
              borderRadius:11, padding:".55rem .9rem", marginBottom:"1.5rem",
              boxShadow:"0 1px 5px rgba(120,80,20,.06)",
              transition:"border-color .2s, box-shadow .2s",
            }} className="g-search-wrap">
              <Search size={15} style={{ color:"#b09070", flexShrink:0 }} />
              <input
                className="g-search-input"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Поиск по теме, категории, тегам…"
                style={{
                  flex:1, background:"none", border:"none",
                  fontSize:".875rem", color:"#2c2010", fontFamily:"inherit",
                }}
              />
              {query && (
                <button onClick={() => setQuery("")} className="g-clear-btn" style={{ background:"none", border:"none", cursor:"pointer", color:"#b09070", display:"flex" }}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Count */}
            <div style={{ fontSize:".72rem", color:"#a08060", fontWeight:600, marginBottom:"1rem", letterSpacing:".04em" }}>
              {query
                ? `Найдено: ${filtered.length} из ${rules.length}`
                : `Всего правил: ${rules.length}`}
            </div>

            {filtered.length === 0 && (
              <div style={{ textAlign:"center", padding:"3rem 0", color:"#a08060", fontSize:".875rem" }}>
                Ничего не найдено по запросу «{query}»
              </div>
            )}

            <div style={{ display:"flex", flexDirection:"column", gap:".55rem" }}>
              {filtered.map((rule, i) => (
                <GrammarCard key={rule.id || i} rule={rule} index={i} isInView={mounted} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
