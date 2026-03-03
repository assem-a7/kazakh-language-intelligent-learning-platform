// UI-only changes; logic unchanged
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
    <div style={{ minHeight: "100dvh", background: "#faf7f2", display: "flex", flexDirection: "column" }}>
      <style>{`
        .ob-chip {
          cursor: pointer; border-radius: 13px; padding: .9rem 1rem;
          border: 1px solid rgba(180,130,40,.18); background: #fff;
          box-shadow: 0 1px 5px rgba(120,80,20,.06);
          transition: border-color .22s, box-shadow .22s, transform .18s;
          display: flex; flex-direction: column; gap: .3rem;
          text-align: left; position: relative; overflow: hidden;
        }
        .ob-chip:hover {
          border-color: rgba(200,136,10,.38);
          box-shadow: 0 4px 16px rgba(120,80,20,.12);
          transform: translateY(-2px);
        }
        .ob-chip.sel {
          border-color: rgba(200,136,10,.55);
          background: rgba(200,136,10,.06);
          box-shadow: 0 4px 18px rgba(200,136,10,.14);
        }
        .ob-chip:focus-visible { outline: 2px solid rgba(200,136,10,.5); outline-offset: 2px; }
        .ob-check {
          position: absolute; top: 8px; right: 8px;
          width: 18px; height: 18px; border-radius: 50%;
          background: linear-gradient(135deg, #c8880a, #b84020);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transform: scale(.5);
          transition: opacity .18s, transform .18s;
        }
        .ob-chip.sel .ob-check { opacity: 1; transform: scale(1); }
        .ob-continue {
          display: inline-flex; align-items: center; gap: .45rem;
          background: linear-gradient(115deg, #c8880a 0%, #b06820 50%, #a84820 100%);
          background-size: 200% 200%; animation: obGrad 5s ease infinite;
          border-radius: 99px; padding: .7rem 2rem; min-height: 44px;
          font-size: .9rem; font-weight: 700; color: #fff;
          box-shadow: 0 3px 14px rgba(200,136,10,.32);
          transition: transform .2s, box-shadow .22s;
        }
        .ob-continue:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 26px rgba(200,136,10,.42); }
        .ob-continue:disabled { opacity: .35; cursor: not-allowed; }
        @keyframes obGrad { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        .ob-footer {
          position: fixed; bottom: 0; left: 0; right: 0;
          background: rgba(250,247,242,.95);
          backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
          border-top: 1px solid rgba(180,130,40,.16);
          box-shadow: 0 -4px 20px rgba(120,80,20,.08);
          padding: 1rem 1.5rem;
          display: flex; align-items: center; justify-content: space-between;
          gap: 1rem; z-index: 30;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin .9s linear infinite; }
      `}</style>

      <AppHeader title="Настройка профиля" onExit={onExit} showBack={false} />

      <div style={{ flex: 1, overflowY: "auto", padding: "2.5rem 1.5rem 7rem" }}>
        <div style={{ maxWidth: 660, margin: "0 auto" }}>

          {/* Heading */}
          <div style={{ textAlign: "center", marginBottom: "2.25rem" }}>
            <div style={{
              display: "inline-flex", alignItems: "center",
              background: "rgba(200,136,10,.1)", border: "1px solid rgba(200,136,10,.24)",
              borderRadius: 99, padding: ".3rem .9rem", marginBottom: "1.25rem",
              fontSize: ".72rem", fontWeight: 700, color: "#a86810", letterSpacing: ".08em",
            }}>
              ШАГ 1 ИЗ 2
            </div>
            <h1 style={{ fontSize: "clamp(1.5rem,4vw,2.1rem)", fontWeight: 900, color: "#2c2010", marginBottom: ".65rem", lineHeight: 1.2, letterSpacing: "-.025em" }}>
              Выбери темы, которые{" "}
              <span style={{ background: "linear-gradient(120deg,#c8880a,#b84020)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                тебя интересуют
              </span>
            </h1>
            <p style={{ color: "#7a5a30", fontSize: ".9rem", lineHeight: 1.7, maxWidth: 440, margin: "0 auto" }}>
              Система подберёт словарный набор и примеры из этих областей.
            </p>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: ".75rem", padding: "3rem 0", color: "#a08060", fontSize: ".875rem" }}>
              <Loader2 size={20} className="spin" style={{ color: "#c8880a" }} />
              Загрузка категорий…
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: ".75rem",
              background: "rgba(184,64,32,.06)", border: "1px solid rgba(184,64,32,.22)",
              borderRadius: 13, padding: "1.1rem 1.25rem",
            }}>
              <AlertCircle size={18} style={{ color: "#b84020", flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 700, color: "#b84020", fontSize: ".875rem", marginBottom: ".25rem" }}>
                  Не удалось загрузить категории
                </div>
                <div style={{ fontSize: ".8rem", color: "#6b5030" }}>{error}</div>
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
                    <div className="ob-check"><Check size={10} color="#fff" /></div>
                    <span style={{ fontSize: "1.4rem", lineHeight: 1 }}>{cat.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: ".875rem", color: isSel ? "#2c2010" : "#4a3018", lineHeight: 1.3 }}>
                      {cat.name_ru}
                    </span>
                    <span style={{ fontSize: ".72rem", color: "#8a6030", lineHeight: 1.5 }}>
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
          <span style={{ color: "#8a6030", fontSize: ".8rem", fontWeight: 500 }}>
            {selected.length === 0
              ? "Выбери хотя бы одну тему"
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
