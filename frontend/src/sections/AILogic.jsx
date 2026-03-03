// UI-only changes; logic unchanged
import { SlidersHorizontal, AlertTriangle, RefreshCw } from "lucide-react";
import useInView from "../hooks/useInView";

const STEPS = [
  {
    icon: SlidersHorizontal,
    accent: "#c8880a",
    title: "Выбор категорий — персональная траектория",
    desc: "При старте ученик выбирает области интересов. Система формирует приоритетный набор тем и слов — обучение строится вокруг актуального контекста, а не абстрактного списка.",
    note: "Категории можно менять в любой момент",
  },
  {
    icon: AlertTriangle,
    accent: "#b84020",
    title: "Анализ ошибок по темам",
    desc: "Система отслеживает, в каких грамматических конструкциях и словарных группах ученик допускает ошибки. Данные накапливаются по каждому тестированию и упражнению.",
    note: "Ошибки видны в дашборде прогресса",
  },
  {
    icon: RefreshCw,
    accent: "#1fa89a",
    title: "Рекомендация повторения при низком результате",
    desc: "Если результат теста по теме ниже порогового значения, система добавляет тему в приоритетную очередь повторения и предлагает целевые упражнения.",
    note: "Порог задаётся автоматически на основе статистики",
  },
];

function hexRgb(hex) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
}

export default function AILogic() {
  const { ref: headRef, isInView: headIn }   = useInView({ threshold: 0.3 });
  const { ref: cardsRef, isInView: cardsIn } = useInView({ threshold: 0.08 });

  return (
    <section id="ai" style={{ background: "#f5f0e8", padding: "6rem 0", position: "relative" }}>
      <style>{`
        .aic {
          transition: border-color .25s, box-shadow .25s, transform .25s;
        }
        .aic:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 10px 36px rgba(120,80,20,.14) !important;
        }
        @keyframes aiPulse {
          0%,100% { opacity:.4; transform:scale(1); }
          50%      { opacity:1; transform:scale(1.2); }
        }
        .ai-dot { animation: aiPulse 2.4s ease-in-out infinite; }
      `}</style>

      <div style={{ maxWidth:"72rem", margin:"0 auto", padding:"0 1.5rem" }}>

        {/* Header */}
        <div
          ref={headRef}
          style={{
            textAlign:"center", marginBottom:"3.5rem",
            opacity: headIn ? 1 : 0,
            transform: headIn ? "translateY(0)" : "translateY(24px)",
            transition: "opacity .6s cubic-bezier(0.22,1,0.36,1), transform .6s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <span style={{ fontSize:".68rem", fontWeight:700, color:"#a08060", letterSpacing:".14em", textTransform:"uppercase", display:"block", marginBottom:".9rem" }}>
            AI-логика системы
          </span>
          <h2 style={{ fontSize:"clamp(1.8rem,4vw,2.75rem)", fontWeight:900, color:"#2c2010", lineHeight:1.15, letterSpacing:"-.03em", marginBottom:".9rem" }}>
            Как система принимает<br />
            <span style={{ background:"linear-gradient(120deg,#c8880a,#b84020)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
              учебные решения
            </span>
          </h2>
          <p style={{ color:"#7a5a30", fontSize:"1rem", maxWidth:480, margin:"0 auto", lineHeight:1.75 }}>
            Три механизма, которые превращают набор модулей в связную персональную траекторию.
          </p>
        </div>

        {/* Cards */}
        <div
          ref={cardsRef}
          style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:"1.1rem" }}
        >
          {STEPS.map((step, i) => {
            const { icon: Icon, accent, title, desc, note } = step;
            const rgb = hexRgb(accent);
            return (
              <div
                key={step.title}
                className="aic"
                style={{
                  opacity: cardsIn ? 1 : 0,
                  transform: cardsIn ? "translateY(0)" : "translateY(28px)",
                  transition: `opacity .65s cubic-bezier(0.22,1,0.36,1) ${i*120}ms, transform .65s cubic-bezier(0.22,1,0.36,1) ${i*120}ms`,
                  background: "#fff",
                  border: `1px solid rgba(${rgb},.18)`,
                  borderRadius: 14,
                  padding: "1.6rem 1.5rem",
                  display: "flex", flexDirection: "column", gap: "1.1rem",
                  position: "relative", overflow: "hidden",
                  boxShadow: "0 2px 10px rgba(120,80,20,.07)",
                }}
              >
                {/* top accent line */}
                <div style={{ position:"absolute", top:0, left:"1.5rem", width:36, height:2, background:`linear-gradient(90deg,${accent},transparent)` }} />

                {/* dot + icon row */}
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
                  <div
                    className="ai-dot"
                    style={{
                      width:9, height:9, borderRadius:"50%", marginTop:4, flexShrink:0,
                      background: accent,
                      boxShadow: `0 0 10px rgba(${rgb},.5)`,
                      animationDelay: `${i*0.8}s`,
                    }}
                  />
                  <div style={{ width:42, height:42, borderRadius:11, flexShrink:0, background:`rgba(${rgb},.1)`, border:`1px solid rgba(${rgb},.2)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Icon size={19} style={{ color: accent }} />
                  </div>
                </div>

                {/* text */}
                <div>
                  <h3 style={{ color:"#2c2010", fontWeight:700, fontSize:"1rem", lineHeight:1.4, marginBottom:".5rem" }}>{title}</h3>
                  <p style={{ color:"#6b5030", fontSize:".84rem", lineHeight:1.75 }}>{desc}</p>
                </div>

                {/* note chip */}
                <div style={{
                  marginTop:"auto",
                  padding:".45rem .8rem",
                  background:`rgba(${rgb},.07)`,
                  border:`1px solid rgba(${rgb},.18)`,
                  borderRadius:9,
                  fontSize:".7rem", fontWeight:600,
                  color: accent,
                }}>
                  ↳ {note}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
