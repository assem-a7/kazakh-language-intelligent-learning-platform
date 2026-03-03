// UI-only changes; logic unchanged
import { Image, BookOpen, PenLine, ClipboardCheck, TrendingUp } from "lucide-react";
import useInView from "../hooks/useInView";

const MODULES = [
  { num:"01", icon:Image,         title:"Словарь",    desc:"Слова с изображениями, транскрипцией и контекстными примерами. Сгруппированы по категориям интересов.", tags:["изображения","категории","контекст"], accent:"#c8880a" },
  { num:"02", icon:BookOpen,      title:"Грамматика", desc:"Правила казахского языка с разбором структуры и примерами на русском. От базовых конструкций до сложных форм.", tags:["правила","примеры","уровни"], accent:"#b06820" },
  { num:"03", icon:PenLine,       title:"Упражнения", desc:"Практические задания: перевод, вставка слова, составление предложений. Сессии повторения по результатам тестов.", tags:["практика","повторение","перевод"], accent:"#1fa89a" },
  { num:"04", icon:ClipboardCheck,title:"Тесты",      desc:"Контрольные срезы по пройденным темам — словарным и грамматическим. Фиксируют уровень на каждом этапе.", tags:["словарь","грамматика","срезы"], accent:"#b84020" },
  { num:"05", icon:TrendingUp,    title:"Прогресс",   desc:"Личная статистика: точность по темам, серия дней, среднее время ответа, последние попытки.", tags:["статистика","динамика","анализ"], accent:"#a84020" },
];

function hexRgb(hex) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
}

function ModuleCard({ mod, delay, isInView }) {
  const { num, icon: Icon, title, desc, tags, accent } = mod;
  const rgb = hexRgb(accent);
  return (
    <div
      className="mc"
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? "translateY(0)" : "translateY(28px)",
        transition: `opacity .6s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform .6s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
        background: "#fff",
        border: `1px solid rgba(${rgb},.18)`,
        borderRadius: 14,
        padding: "1.6rem 1.5rem",
        display: "flex", flexDirection: "column", gap: "1rem",
        position: "relative", overflow: "hidden",
        boxShadow: "0 2px 10px rgba(120,80,20,.06)",
      }}
    >
      {/* top accent line */}
      <div style={{ position:"absolute", top:0, left:"1.5rem", width:36, height:2, background:`linear-gradient(90deg,${accent},transparent)` }} />

      {/* Num + icon */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:".68rem", fontWeight:800, color:`rgba(${rgb},.65)`, letterSpacing:".14em" }}>{num}</span>
        <div style={{ width:40, height:40, borderRadius:11, background:`rgba(${rgb},.1)`, border:`1px solid rgba(${rgb},.2)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Icon size={18} style={{ color: accent }} />
        </div>
      </div>

      {/* Text */}
      <div>
        <h3 style={{ color:"#2c2010", fontWeight:700, fontSize:"1rem", marginBottom:".45rem", lineHeight:1.3 }}>{title}</h3>
        <p style={{ color:"#6b5030", fontSize:".84rem", lineHeight:1.7 }}>{desc}</p>
      </div>

      {/* Tags */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:".35rem", marginTop:"auto" }}>
        {tags.map(t => (
          <span key={t} style={{ fontSize:".68rem", fontWeight:600, color:accent, background:`rgba(${rgb},.08)`, border:`1px solid rgba(${rgb},.18)`, borderRadius:99, padding:".18rem .55rem", letterSpacing:".03em" }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Modules() {
  const { ref: headRef, isInView: headIn } = useInView({ threshold: 0.3 });
  const { ref: gridRef, isInView: gridIn  } = useInView({ threshold: 0.05 });

  return (
    <section id="modules" style={{ background: "#faf7f2", padding: "6rem 0" }}>
      <style>{`
        .mc { transition: border-color .25s, box-shadow .25s, transform .25s !important; }
        .mc:hover { transform: translateY(-4px) !important; box-shadow: 0 8px 28px rgba(120,80,20,.13) !important; }
      `}</style>
      <div style={{ maxWidth:"72rem", margin:"0 auto", padding:"0 1.5rem" }}>
        {/* Header */}
        <div ref={headRef} style={{ textAlign:"center", marginBottom:"3.5rem", opacity:headIn?1:0, transform:headIn?"translateY(0)":"translateY(24px)", transition:"opacity .6s,transform .6s" }}>
          <span style={{ fontSize:".68rem", fontWeight:700, color:"#a08060", letterSpacing:".14em", textTransform:"uppercase", display:"block", marginBottom:".9rem" }}>
            Учебные модули
          </span>
          <h2 style={{ fontSize:"clamp(1.8rem,4vw,2.75rem)", fontWeight:900, color:"#2c2010", lineHeight:1.15, letterSpacing:"-.03em", marginBottom:".9rem" }}>
            Пять блоков<br />
            <span style={{ background:"linear-gradient(120deg,#c8880a,#b84020)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
              единой системы
            </span>
          </h2>
          <p style={{ color:"#7a5a30", fontSize:"1rem", maxWidth:480, margin:"0 auto", lineHeight:1.75 }}>
            Каждый модуль решает конкретную учебную задачу и связан с остальными через единую траекторию.
          </p>
        </div>
        {/* Grid */}
        <div ref={gridRef} style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:"1.1rem" }}>
          {MODULES.map((mod, i) => <ModuleCard key={mod.num} mod={mod} delay={i*85} isInView={gridIn} />)}
        </div>
      </div>
    </section>
  );
}
