// UI-only changes; logic unchanged
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import useInView from "../hooks/useInView";

const FAQS = [
  {
    q: "С чего начать, если я совсем не знаю казахский?",
    a: "Начни с выбора категорий интересов — система сформирует стартовый словарный набор и базовые грамматические конструкции. Модули рассчитаны на постепенное погружение без предварительных знаний.",
  },
  {
    q: "Как работает словарь с изображениями?",
    a: "Каждое слово в словаре сопровождается изображением (image_url), транскрипцией и примером употребления в предложении. Слова сгруппированы по темам и категориям интересов ученика.",
  },
  {
    q: "Что происходит, если я не сдал тест?",
    a: "Если результат ниже порогового значения, система автоматически помечает тему как требующую повторения и добавляет целевые упражнения в очередь. Тест можно пройти повторно после проработки материала.",
  },
  {
    q: "Можно ли изменить категории интересов после старта?",
    a: "Да, категории редактируются в любой момент в настройках профиля. Система пересмотрит приоритеты обучения с учётом новых предпочтений.",
  },
  {
    q: "Как система формирует персональную траекторию?",
    a: "На основе выбранных категорий, истории тестов и зафиксированных ошибок система выстраивает порядок изучения тем. Темы с частыми ошибками получают приоритет повторения.",
  },
  {
    q: "Есть ли раздел грамматики для продвинутых?",
    a: "Модуль грамматики охватывает материал от базовых конструкций до сложных форм казахского языка. Каждый раздел сопровождается правилами, примерами и упражнениями для закрепления.",
  },
];

function FAQItem({ item, index, isInView }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? "translateY(0)" : "translateY(18px)",
        transition: `opacity .5s cubic-bezier(0.22,1,0.36,1) ${index*65}ms, transform .5s cubic-bezier(0.22,1,0.36,1) ${index*65}ms`,
        background: "#fff",
        border: `1px solid ${open ? "rgba(200,136,10,.28)" : "rgba(180,130,40,.14)"}`,
        borderRadius: 12,
        boxShadow: open ? "0 4px 18px rgba(120,80,20,.10)" : "0 1px 6px rgba(120,80,20,.06)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width:"100%", textAlign:"left",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          gap:"1rem", padding:"1.2rem 1.3rem",
          background:"none", border:"none", cursor:"pointer",
        }}
      >
        <span style={{
          color: open ? "#2c2010" : "#4a3018",
          fontWeight: open ? 700 : 600,
          fontSize:".9375rem", lineHeight:1.45,
          transition:"color .2s, font-weight .2s",
        }}>
          {item.q}
        </span>
        <div style={{
          width:28, height:28, borderRadius:"50%", flexShrink:0,
          background: open ? "rgba(200,136,10,.12)" : "rgba(180,130,40,.07)",
          border: `1px solid ${open ? "rgba(200,136,10,.3)" : "rgba(180,130,40,.18)"}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition:"transform .3s cubic-bezier(0.4,0,0.2,1), background .2s, border-color .2s",
        }}>
          <ChevronDown size={14} style={{ color: open ? "#c8880a" : "#a08060" }} />
        </div>
      </button>

      <div style={{
        overflow:"hidden",
        maxHeight: open ? "320px" : "0",
        transition:"max-height .38s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <p style={{
          color:"#6b5030", fontSize:".875rem", lineHeight:1.8,
          padding:"0 1.3rem 1.3rem",
        }}>
          {item.a}
        </p>
      </div>
    </div>
  );
}

export default function FAQ() {
  const { ref: headRef, isInView: headIn } = useInView({ threshold: 0.3 });
  const { ref: listRef, isInView: listIn } = useInView({ threshold: 0.05 });

  return (
    <section id="faq" style={{ background: "#f5f0e8", padding: "6rem 0" }}>
      <div style={{ maxWidth:"48rem", margin:"0 auto", padding:"0 1.5rem" }}>

        {/* Header */}
        <div
          ref={headRef}
          style={{
            textAlign:"center", marginBottom:"3rem",
            opacity: headIn ? 1 : 0,
            transform: headIn ? "translateY(0)" : "translateY(24px)",
            transition:"opacity .6s cubic-bezier(0.22,1,0.36,1), transform .6s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <span style={{ fontSize:".68rem", fontWeight:700, color:"#a08060", letterSpacing:".14em", textTransform:"uppercase", display:"block", marginBottom:".9rem" }}>
            Часто задаваемые вопросы
          </span>
          <h2 style={{ fontSize:"clamp(1.8rem,4vw,2.75rem)", fontWeight:900, color:"#2c2010", lineHeight:1.15, letterSpacing:"-.03em", marginBottom:".9rem" }}>
            Вопросы об обучении<br />
            <span style={{ background:"linear-gradient(120deg,#c8880a,#b84020)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
              и функционале системы
            </span>
          </h2>
          <p style={{ color:"#7a5a30", fontSize:"1rem", maxWidth:420, margin:"0 auto", lineHeight:1.75 }}>
            Ответы на основные вопросы по работе с платформой.
          </p>
        </div>

        {/* Accordion */}
        <div ref={listRef} style={{ display:"flex", flexDirection:"column", gap:".65rem" }}>
          {FAQS.map((item, i) => (
            <FAQItem key={i} item={item} index={i} isInView={listIn} />
          ))}
        </div>

      </div>
    </section>
  );
}
