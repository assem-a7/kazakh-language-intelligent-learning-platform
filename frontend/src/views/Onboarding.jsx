import { useState, useEffect } from "react";
import { ArrowRight, Check, Loader2, AlertCircle } from "lucide-react";
import AppHeader from "../components/AppHeader";
import { loadCsv } from "../utils/csvLoader";

const LS_KEY = "qazaqai_categories";

export default function Onboarding({ onComplete, onExit }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  // ── logic unchanged ──────────────────────────────────────────────
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
  // ─────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#faf7f2",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Georgia', 'Times New Roman', serif",
    }}>
      <style>{`
        /* ── tokens ─────────────────────────────── */
        :root {
          --bg:        #faf7f2;
          --card:      #ffffff;
          --text:      #2c2010;
          --text-sec:  #7a5a30;
          --text-muted:#a08060;
          --border:    rgba(180,130,40,.25);
          --shadow:    0 2px 10px rgba(120,80,20,.07);
          --amber:     #c8880a;
          --terra:     #b84020;
          --teal:      #1fa89a;
          --r-card:    14px;
          --r-btn:     12px;
        }

        /* ── grid ───────────────────────────────── */
        .ob-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        @media (min-width: 560px) {
          .ob-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
        }
        @media (min-width: 900px) {
          .ob-grid { grid-template-columns: repeat(3, 1fr); }
        }

        /* ── card ───────────────────────────────── */
        .ob-chip {
          cursor: pointer;
          border-radius: var(--r-card);
          padding: 1rem 1.1rem 1rem;
          border: 1.5px solid var(--border);
          background: var(--card);
          box-shadow: var(--shadow);
          transition: border-color .2s, background .2s, transform .18s, box-shadow .2s;
          display: flex;
          flex-direction: column;
          gap: 0;
          text-align: left;
          position: relative;
          overflow: hidden;
        }
        .ob-chip:hover {
          border-color: rgba(200,136,10,.38);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(120,80,20,.12);
        }
        .ob-chip.sel {
          border-color: rgba(200,136,10,.55);
          background: rgba(200,136,10,.045);
          box-shadow: 0 4px 16px rgba(200,136,10,.1);
        }

        /* ── check badge ────────────────────────── */
        .ob-check {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #c8880a, #b84020);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: scale(.4);
          transition: opacity .18s, transform .2s;
          flex-shrink: 0;
        }
        .ob-chip.sel .ob-check {
          opacity: 1;
          transform: scale(1);
        }

        /* ── card inner text ─────────────────────── */
        .ob-icon {
          font-size: 1.5rem;
          line-height: 1;
          margin-bottom: 8px;
          display: block;
        }
        .ob-name {
          font-weight: 800;
          font-size: .9rem;
          color: #2c2010;
          line-height: 1.35;
          margin-bottom: 5px;
          padding-right: 22px; /* don't overlap badge */
        }
        .ob-desc {
          font-size: .78rem;
          color: #7a5a30;
          line-height: 1.5;
          font-family: 'Georgia', serif;
        }

        /* ── step badge ──────────────────────────── */
        .ob-step {
          display: inline-flex;
          align-items: center;
          gap: .35rem;
          background: rgba(200,136,10,.09);
          border: 1px solid rgba(200,136,10,.25);
          border-radius: 99px;
          padding: .28rem .75rem;
          font-size: .7rem;
          font-weight: 700;
          color: #c8880a;
          letter-spacing: .06em;
          margin-bottom: 1.1rem;
        }

        /* ── heading ─────────────────────────────── */
        .ob-title {
          font-size: clamp(1.55rem, 4vw, 2.1rem);
          font-weight: 800;
          color: #2c2010;
          margin: 0 0 .55rem;
          line-height: 1.25;
          font-family: 'Georgia', serif;
        }
        .ob-subtitle {
          color: #7a5a30;
          font-size: .9rem;
          line-height: 1.7;
          font-family: 'Georgia', serif;
          margin: 0;
        }

        /* ── footer ──────────────────────────────── */
        .ob-footer {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          background: rgba(250,247,242,.94);
          backdrop-filter: blur(18px);
          border-top: 1px solid rgba(180,130,40,.18);
          padding: .9rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          z-index: 30;
        }
        .ob-count {
          color: #a08060;
          font-size: .8rem;
        }

        /* ── continue button ─────────────────────── */
        .ob-continue {
          display: inline-flex;
          align-items: center;
          gap: .45rem;
          background: linear-gradient(90deg, #c8880a 0%, #b84020 100%);
          border-radius: var(--r-btn);
          padding: .65rem 1.65rem;
          min-height: 44px;
          font-size: .875rem;
          font-weight: 700;
          color: #fff;
          border: none;
          cursor: pointer;
          transition: transform .2s, box-shadow .2s, opacity .2s;
          letter-spacing: .01em;
          font-family: 'Georgia', serif;
        }
        .ob-continue:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(200,136,10,.32);
        }
        .ob-continue:disabled {
          opacity: .35;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* ── error box ───────────────────────────── */
        .ob-error {
          display: flex;
          align-items: flex-start;
          gap: .75rem;
          background: rgba(184,64,32,.06);
          border: 1.5px solid rgba(184,64,32,.2);
          border-radius: var(--r-card);
          padding: 1.1rem 1.25rem;
        }

        /* ── spin ────────────────────────────────── */
        @keyframes ob-spin { to { transform: rotate(360deg); } }
        .ob-spin { animation: ob-spin .9s linear infinite; }
      `}</style>

      <AppHeader title="Настройка профиля" onExit={onExit} showBack={false} />

      <div style={{ flex: 1, overflowY: "auto", padding: "2.25rem 1.5rem 7rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          {/* ── Heading block ───────────────────────────────────── */}
          <div style={{ marginBottom: "2.25rem" }}>
            <div className="ob-step">ШАГ 1 ИЗ 2</div>
            <h1 className="ob-title">
              Выбери темы, которые{" "}
              <span style={{
                background: "linear-gradient(90deg,#c8880a,#b84020)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                тебя интересуют
              </span>
            </h1>
            <p className="ob-subtitle">
              Система подберёт словарный набор и примеры из этих областей.
            </p>
          </div>

          {/* ── Loading ─────────────────────────────────────────── */}
          {loading && (
            <div style={{
              display: "flex", justifyContent: "center", alignItems: "center",
              gap: ".75rem", padding: "3rem 0",
              color: "#a08060", fontSize: ".875rem",
            }}>
              <Loader2 size={20} className="ob-spin" style={{ color: "#c8880a" }} />
              Загрузка категорий…
            </div>
          )}

          {/* ── Error ───────────────────────────────────────────── */}
          {error && (
            <div className="ob-error">
              <AlertCircle size={18} style={{ color: "#b84020", flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 700, color: "#b84020", fontSize: ".875rem", marginBottom: ".25rem" }}>
                  Не удалось загрузить категории
                </div>
                <div style={{ fontSize: ".8rem", color: "#a08060" }}>{error}</div>
              </div>
            </div>
          )}

          {/* ── Category grid ───────────────────────────────────── */}
          {!loading && !error && (
            <div className="ob-grid">
              {categories.map((cat) => {
                const isSel = selected.includes(cat.slug);
                return (
                  <button
                    key={cat.slug}
                    className={`ob-chip${isSel ? " sel" : ""}`}
                    onClick={() => toggle(cat.slug)}
                  >
                    {/* checkmark badge */}
                    <div className="ob-check">
                      <Check size={11} color="#fff" strokeWidth={3} />
                    </div>

                    {/* icon */}
                    {cat.icon && (
                      <span className="ob-icon">{cat.icon}</span>
                    )}

                    {/* name — primary label */}
                    <span className="ob-name">{cat.name_ru}</span>

                    {/* description — secondary label */}
                    {cat.description_ru && (
                      <span className="ob-desc">{cat.description_ru}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* ── Sticky footer ───────────────────────────────────────── */}
      {!loading && !error && (
        <div className="ob-footer">
          <span className="ob-count">
            {selected.length === 0
              ? "Выбери хотя бы одну категорию"
              : `Выбрано: ${selected.length} из ${categories.length}`}
          </span>
          <button
            className="ob-continue"
            disabled={selected.length === 0}
            onClick={handleContinue}
          >
            Продолжить <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
