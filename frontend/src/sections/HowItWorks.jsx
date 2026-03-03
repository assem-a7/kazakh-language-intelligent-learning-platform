// UI-only changes; logic unchanged
import { MousePointerClick, BookMarked, BarChart2 } from "lucide-react";
import useInView from "../hooks/useInView";

const STEPS = [
  {
    n: "1",
    icon: MousePointerClick,
    accent: "#c8880a",
    title: "Выбери темы и категории",
    desc: "Укажи интересующие тебя области: путешествия, работа, культура, быт. Система выстраивает персональный список слов и тем для изучения.",
  },
  {
    n: "2",
    icon: BookMarked,
    accent: "#1fa89a",
    title: "Учись по модулям",
    desc: "Проходи словарь, грамматику и упражнения в своём темпе. После каждого блока — контрольный тест для фиксации уровня.",
  },
  {
    n: "3",
    icon: BarChart2,
    accent: "#b84020",
    title: "Следи за прогрессом",
    desc: "Дашборд показывает точность по всем темам. Если раздел не усвоен — система предложит целевые упражнения для повторения.",
  },
];

function hexRgb(hex) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
}

export default function HowItWorks() {
  const { ref: headRef,  isInView: headIn  } = useInView({ threshold: 0.3 });
  const { ref: stepsRef, isInView: stepsIn } = useInView({ threshold: 0.1 });

  return (
    <section id="how" style={{ background: "#faf7f2", padding: "6rem 0" }}>
      <style>{`
        .hwc {
          transition: border-color .25s, box-shadow .25s, transform .25s;
        }
        .hwc:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 10px 36px rgba(120,80,20,.13) !important;
        }
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
            Как это работает
          </span>
          <h2 style={{ fontSize:"clamp(1.8rem,4vw,2.75rem)", fontWeight:900, color:"#2c2010", lineHeight:1.15, letterSpacing:"-.03em", marginBottom:".9rem" }}>
            Три шага к<br />
            <span style={{ background:"linear-gradient(120deg,#c8880a,#b84020)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
              уверенному казахскому
            </span>
          </h2>
          <p style={{ color:"#7a5a30", fontSize:"1rem", maxWidth:420, margin:"0 auto", lineHeight:1.75 }}>
            Последовательная структура — от выбора тем до анализа результатов.
          </p>
        </div>

        {/* Steps */}
        <div
          ref={stepsRef}
          style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:"1.1rem" }}
        >
          {STEPS.map((step, i) => {
            const { n, icon: Icon, accent, title, desc } = step;
            const rgb = hexRgb(accent);
            return (
              <div
                key={n}
                className="hwc"
                style={{
                  opacity: stepsIn ? 1 : 0,
                  transform: stepsIn ? "translateY(0)" : "translateY(28px)",
                  transition: `opacity .6s cubic-bezier(0.22,1,0.36,1) ${i*110}ms, transform .6s cubic-bezier(0.22,1,0.36,1) ${i*110}ms`,
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

                {/* number + icon */}
                <div style={{ display:"flex", alignItems:"center", gap:".85rem" }}>
                  <div style={{
                    width:36, height:36, borderRadius:"50%", flexShrink:0,
                    background:`rgba(${rgb},.1)`,
                    border:`1px solid rgba(${rgb},.24)`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    <span style={{ fontSize:".85rem", fontWeight:900, color: accent }}>{n}</span>
                  </div>
                  <div style={{
                    width:36, height:36, borderRadius:10, flexShrink:0,
                    background:`rgba(${rgb},.08)`,
                    border:`1px solid rgba(${rgb},.16)`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    <Icon size={16} style={{ color: accent }} />
                  </div>
                </div>

                {/* text */}
                <div>
                  <h3 style={{ color:"#2c2010", fontWeight:700, fontSize:"1rem", lineHeight:1.35, marginBottom:".45rem" }}>
                    {title}
                  </h3>
                  <p style={{ color:"#6b5030", fontSize:".84rem", lineHeight:1.75 }}>
                    {desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
