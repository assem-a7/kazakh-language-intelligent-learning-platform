// UI-only changes; logic unchanged
import { useEffect, useRef } from "react";
import { ArrowRight, BookOpen, BarChart2, PenLine, Sparkles } from "lucide-react";

const smoothScroll = (href) => {
  const el = document.querySelector(href);
  if (el) el.scrollIntoView({ behavior: "smooth" });
};

const WHAT_YOU_GET = [
  { icon: BookOpen,  label: "Словарь с изображениями и примерами" },
  { icon: PenLine,   label: "Упражнения и тесты с автопроверкой" },
  { icon: BarChart2, label: "Личная статистика: точность по темам и серия дней" },
];

export default function Hero({ onStartLearning }) {
  const heroRef = useRef(null);

  useEffect(() => {
    const els = heroRef.current?.querySelectorAll(".fu");
    if (!els) return;
    els.forEach((el, i) => {
      el.style.animationDelay = `${i * 0.10}s`;
      el.style.animationFillMode = "both";
    });
  }, []);

  return (
    <section id="hero" ref={heroRef} style={{ background: "var(--bg,#faf7f2)", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes fuAnim { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        .fu { animation: fuAnim .62s cubic-bezier(0.22,1,0.36,1) both; }

        .h-badge {
          display:inline-flex; align-items:center; gap:.4rem;
          background:rgba(200,136,10,.1); border:1px solid rgba(200,136,10,.24);
          border-radius:99px; padding:.3rem .85rem;
          font-size:.78rem; font-weight:600; color:#a86810; letter-spacing:.03em;
        }
        .h-h1 {
          font-size:clamp(2.1rem,5vw,3.4rem);
          font-weight:900; line-height:1.1; letter-spacing:-.04em; color:#2c2010;
        }
        .h-h1 .hl {
          background:linear-gradient(120deg,#c8880a 0%,#b06820 45%,#a84820 100%);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }
        .h-sub { font-size:clamp(.9rem,1.8vw,1.05rem); color:#6b5030; line-height:1.75; max-width:560px; }

        .h-btn-p {
          display:inline-flex; align-items:center; gap:.5rem;
          border-radius:99px; padding:.75rem 1.9rem; min-height:48px;
          font-size:.9375rem; font-weight:700; letter-spacing:.01em; color:#fff;
          background:linear-gradient(115deg,#c8880a 0%,#b06820 50%,#a84820 100%);
          background-size:200% 200%; animation:hBtnG 5s ease infinite;
          box-shadow:0 3px 16px rgba(200,136,10,.38);
          transition:transform .2s,box-shadow .2s;
        }
        .h-btn-p:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(200,136,10,.45); }
        @keyframes hBtnG { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }

        .h-btn-g {
          display:inline-flex; align-items:center; gap:.5rem;
          border-radius:99px; padding:.75rem 1.75rem; min-height:48px;
          font-size:.9375rem; font-weight:600; color:#6b5030;
          background:rgba(180,130,40,.08); border:1px solid rgba(180,130,40,.24);
          transition:background .2s,border-color .2s,transform .2s;
        }
        .h-btn-g:hover { background:rgba(180,130,40,.15); border-color:rgba(180,130,40,.4); transform:translateY(-1px); }

        .h-card {
          background:#fff; border:1px solid rgba(180,130,40,.16);
          border-radius:11px; box-shadow:0 2px 10px rgba(120,80,20,.07);
          padding:.8rem 1.05rem; display:flex; align-items:center; gap:.8rem;
          transition:box-shadow .22s,transform .2s;
        }
        .h-card:hover { box-shadow:0 5px 20px rgba(120,80,20,.12); transform:translateY(-1px); }
        .h-icon-box {
          width:34px; height:34px; border-radius:9px; flex-shrink:0;
          background:rgba(200,136,10,.1); border:1px solid rgba(200,136,10,.2);
          display:flex; align-items:center; justify-content:center;
        }
        /* right ornamental bar */
        .h-orn { position:absolute; top:0; right:0; bottom:0; width:3px; background:linear-gradient(180deg,#c8880a,#1fa89a,#b84020); opacity:.2; }
      `}</style>

      <div className="h-orn" />

      <div style={{ maxWidth:"72rem", margin:"0 auto", padding:"4.5rem 1.5rem 4rem" }}>
        <div>
          {/* Badge */}
          <div className="fu" style={{ marginBottom:"1.1rem" }}>
            <span className="h-badge"><Sparkles size={12} />Казахский язык — системно</span>
          </div>

          {/* Headline */}
          <h1 className="fu h-h1" style={{ marginBottom:"1rem" }}>
            Освой казахский язык<br />
            <span className="hl">осознанно и с результатом</span>
          </h1>

          {/* Subheadline */}
          <p className="fu h-sub" style={{ marginBottom:"1.75rem" }}>
            Адаптивная система с модулями словаря, грамматики и тестов.
            Персональная статистика — точность по каждой теме, серия дней и анализ ошибок.
          </p>

          {/* CTAs */}
          <div className="fu" style={{ display:"flex", flexWrap:"wrap", gap:".75rem", marginBottom:"2.25rem" }}>
            <button className="h-btn-p" onClick={() => onStartLearning && onStartLearning()}>
              Начать обучение <ArrowRight size={17} />
            </button>
            <button className="h-btn-g" onClick={() => smoothScroll("#modules")}>
              Посмотреть модули
            </button>
          </div>

          {/* What you get */}
          <div className="fu">
            <p style={{ fontSize:".68rem", fontWeight:700, color:"#a08060", letterSpacing:".12em", textTransform:"uppercase", marginBottom:".55rem" }}>
              Что входит
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:".5rem" }}>
              {WHAT_YOU_GET.map(({ icon: Icon, label }) => (
                <div key={label} className="h-card">
                  <div className="h-icon-box"><Icon size={15} color="#c8880a" /></div>
                  <span style={{ fontSize:".875rem", fontWeight:500, color:"#4a2e08", lineHeight:1.4 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
