// UI-only changes; logic unchanged
import { Tag, Image, BookOpen, ClipboardCheck, BarChart2, Lightbulb } from "lucide-react";
import useInView from "../hooks/useInView";

const CARDS = [
  { icon: Tag,          title: "Выбор категорий",         desc: "Учи слова по темам, которые важны именно тебе: путешествия, бизнес, культура, быт и другое.", accent: "#c8880a" },
  { icon: Image,        title: "Словарь с изображениями", desc: "Каждое слово сопровождается изображением (image_url). Визуальная память ускоряет запоминание.", accent: "#b06820" },
  { icon: BookOpen,     title: "Грамматика",              desc: "Правила с живыми примерами на казахском и русском. Структурированно, по уровням — без воды.", accent: "#1fa89a" },
  { icon: ClipboardCheck,title:"Тесты",                  desc: "Проверяй знания по словарю и грамматике. Результаты сохраняются — видна динамика по каждой теме.", accent: "#b84020" },
  { icon: BarChart2,    title: "Дашборд прогресса",       desc: "Статистика: точность по разделам, серия дней, среднее время ответа — на одном экране.", accent: "#a84020" },
  { icon: Lightbulb,    title: "Умные рекомендации",      desc: "Если результат теста ниже порога, система предлагает целевые упражнения для закрепления слабых мест.", accent: "#c8880a" },
];

function hexRgb(hex) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
}

function FeatureCard({ card, delay, isInView }) {
  const { icon: Icon, title, desc, accent } = card;
  const rgb = hexRgb(accent);
  return (
    <div
      className="fc"
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
      <div style={{ position:"absolute", top:0, left:"1.5rem", width:36, height:2, background:`linear-gradient(90deg,${accent},transparent)`, borderRadius:"0 0 2px 2px" }} />
      <div style={{ width:42, height:42, borderRadius:11, flexShrink:0, background:`rgba(${rgb},.1)`, border:`1px solid rgba(${rgb},.2)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <Icon size={19} style={{ color: accent }} />
      </div>
      <div>
        <h3 style={{ color:"#2c2010", fontWeight:700, fontSize:".975rem", marginBottom:".45rem", lineHeight:1.3 }}>{title}</h3>
        <p style={{ color:"#6b5030", fontSize:".84rem", lineHeight:1.7 }}>{desc}</p>
      </div>
    </div>
  );
}

export default function Features() {
  const { ref: headRef, isInView: headInView } = useInView({ threshold: 0.3 });
  const { ref: gridRef, isInView: gridInView } = useInView({ threshold: 0.05 });

  return (
    <section id="features" style={{ background: "#f5f0e8", padding: "6rem 0" }}>
      <style>{`
        .fc { transition: border-color .25s, box-shadow .25s, transform .25s !important; }
        .fc:hover { transform: translateY(-4px) !important; box-shadow: 0 8px 28px rgba(120,80,20,.13) !important; }
      `}</style>
      <div style={{ maxWidth:"72rem", margin:"0 auto", padding:"0 1.5rem" }}>
        {/* Header */}
        <div ref={headRef} style={{ textAlign:"center", marginBottom:"3.5rem", opacity:headInView?1:0, transform:headInView?"translateY(0)":"translateY(24px)", transition:"opacity .6s, transform .6s" }}>
          <span style={{ fontSize:".68rem", fontWeight:700, color:"#a08060", letterSpacing:".14em", textTransform:"uppercase", display:"block", marginBottom:".9rem" }}>
            Возможности
          </span>
          <h2 style={{ fontSize:"clamp(1.8rem,4vw,2.75rem)", fontWeight:900, color:"#2c2010", lineHeight:1.15, letterSpacing:"-.03em", marginBottom:".9rem" }}>
            Всё для изучения<br />
            <span style={{ background:"linear-gradient(120deg,#c8880a,#b84020)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
              казахского языка
            </span>
          </h2>
          <p style={{ color:"#7a5a30", fontSize:"1rem", maxWidth:480, margin:"0 auto", lineHeight:1.75 }}>
            Шесть инструментов, связанных в единую учебную траекторию.
          </p>
        </div>
        {/* Grid */}
        <div ref={gridRef} style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:"1.1rem" }}>
          {CARDS.map((card, i) => <FeatureCard key={card.title} card={card} delay={i*75} isInView={gridInView} />)}
        </div>
      </div>
    </section>
  );
}
