import { useState, useEffect } from "react";
import { ArrowRight, Check, Loader2, AlertCircle } from "lucide-react";
import AppHeader from "../components/AppHeader";
import { loadCsv } from "../utils/csvLoader";

const LS_KEY = "qazaqai_categories";

export default function Onboarding({ onComplete, onExit }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const [selected, setSelected] = useState(() => {
    try { const s = localStorage.getItem(LS_KEY); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });

  useEffect(() => {
    loadCsv("/data/categories.csv")
      .then(rows => { setCategories(rows); setLoading(false); })
      .catch(err  => { setError(err.message); setLoading(false); });
  }, []);

  const toggle = (slug) =>
    setSelected(prev => prev.includes(slug) ? prev.filter(x => x !== slug) : [...prev, slug]);

  const handleContinue = () => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(selected)); } catch {}
    onComplete(selected);
  };

  return (
    <div style={{ minHeight: "100dvh", background: "#0a0a0f", display: "flex", flexDirection: "column" }}>
      <style>{`
        .ob-chip {
          cursor: pointer; border-radius: 14px; padding: 0.85rem 1rem;
          border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.025);
          transition: border-color .22s, background .22s, transform .18s, box-shadow .22s;
          display: flex; flex-direction: column; gap: 0.25rem;
          text-align: left; position: relative; overflow: hidden;
        }
        .ob-chip:hover { border-color:rgba(34,211,238,.22);background:rgba(34,211,238,.04);transform:translateY(-2px); }
        .ob-chip.sel  { border-color:rgba(34,211,238,.45);background:rgba(34,211,238,.07);box-shadow:0 0 18px rgba(34,211,238,.08); }
        .ob-check {
          position:absolute; top:9px; right:9px; width:18px; height:18px; border-radius:50%;
          background:linear-gradient(135deg,#22d3ee,#a3e635);
          display:flex; align-items:center; justify-content:center;
          opacity:0; transform:scale(.5); transition:opacity .18s,transform .18s;
        }
        .ob-chip.sel .ob-check { opacity:1; transform:scale(1); }
        .ob-continue {
          display:inline-flex; align-items:center; gap:.45rem;
          background:linear-gradient(115deg,#22d3ee 0%,#818cf8 55%,#a3e635 100%);
          background-size:200% 200%; animation:obGrad 5s ease infinite;
          border-radius:99px; padding:.7rem 2rem; font-size:.9rem; font-weight:700; color:#0a0a0f;
          transition:transform .2s, box-shadow .22s;
        }
        .ob-continue:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 28px rgba(34,211,238,.3); }
        .ob-continue:disabled { opacity:.35; cursor:not-allowed; }
        @keyframes obGrad { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        .ob-footer {
          position:fixed; bottom:0; left:0; right:0;
          background:rgba(10,10,15,.92); backdrop-filter:blur(18px);
          border-top:1px solid rgba(255,255,255,.06);
          padding:1rem 1.5rem; display:flex; align-items:center;
          justify-content:space-between; gap:1rem; z-index:30;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.9s linear infinite; }
      `}</style>

      <AppHeader title="Настройка профиля" onExit={onExit} showBack={false} />

      <div style={{ flex: 1, overflowY: "auto", padding: "2.5rem 1.5rem 7rem" }}>
        <div style={{ maxWidth: 660, margin: "0 auto" }}>

          {/* Heading */}
          <div style={{ textAlign: "center", marginBottom: "2.25rem" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: ".4rem",
              background: "rgba(34,211,238,.08)", border: "1px solid rgba(34,211,238,.18)",
              borderRadius: 99, padding: ".3rem .8rem", marginBottom: "1.25rem",
              fontSize: ".72rem", fontWeight: 700, color: "#67e8f9", letterSpacing: ".06em",
            }}>ШАГ 1 ИЗ 2</div>
            <h1 style={{ fontSize: "clamp(1.5rem,4vw,2.1rem)", fontWeight: 900, color: "#fff", marginBottom: ".6rem", lineHeight: 1.25 }}>
              Выбери темы, которые{" "}
              <span style={{ background: "linear-gradient(135deg,#22d3ee,#818cf8 50%,#a3e635)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                тебя интересуют
              </span>
            </h1>
            <p style={{ color: "rgba(255,255,255,.38)", fontSize: ".9rem", lineHeight: 1.65 }}>
              Система подберёт словарный набор и примеры из этих областей.
            </p>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: ".75rem", padding: "3rem 0", color: "rgba(255,255,255,.3)", fontSize: ".875rem" }}>
              <Loader2 size={20} className="spin" style={{ color: "#22d3ee" }} />
              Загрузка категорий…
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: ".75rem",
              background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.2)",
              borderRadius: 14, padding: "1.1rem 1.25rem", color: "rgba(255,255,255,.6)",
            }}>
              <AlertCircle size={18} style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 600, color: "#f87171", fontSize: ".875rem", marginBottom: ".25rem" }}>
                  Не удалось загрузить категории
                </div>
                <div style={{ fontSize: ".8rem", color: "rgba(255,255,255,.4)" }}>{error}</div>
              </div>
            </div>
          )}

          {/* Category grid */}
          {!loading && !error && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(168px,1fr))", gap: ".65rem" }}>
              {categories.map((cat) => {
                const isSel = selected.includes(cat.slug);
                return (
                  <button key={cat.slug} className={`ob-chip${isSel ? " sel" : ""}`} onClick={() => toggle(cat.slug)}>
                    <div className="ob-check"><Check size={10} /></div>
                    <span style={{ fontSize: "1.35rem", lineHeight: 1 }}>{cat.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: ".85rem", color: isSel ? "#fff" : "rgba(255,255,255,.72)" }}>
                      {cat.name_ru}
                    </span>
                    <span style={{ fontSize: ".7rem", color: "rgba(255,255,255,.28)", lineHeight: 1.4 }}>
                      {cat.description_ru}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      {!loading && !error && (
        <div className="ob-footer">
          <span style={{ color: "rgba(255,255,255,.28)", fontSize: ".8rem" }}>
            {selected.length === 0
              ? "Выбери хотя бы одну категорию"
              : `Выбрано: ${selected.length} из ${categories.length}`}
          </span>
          <button className="ob-continue" disabled={selected.length === 0} onClick={handleContinue}>
            Продолжить <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
