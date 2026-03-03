/* UI-only changes; logic unchanged */
import { useState, useEffect } from "react";
import { Zap, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Возможности", href: "#features" },
  { label: "Модули",      href: "#modules" },
  { label: "AI-логика",   href: "#ai" },
  { label: "Как работает", href: "#how" },
  { label: "FAQ",          href: "#faq" },
];

const smoothScroll = (href) => {
  const el = document.querySelector(href);
  if (el) el.scrollIntoView({ behavior: "smooth" });
};

export default function Navbar({ onStartLearning }) {
  const [scrolled, setScrolled]     = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const handleNav   = (href) => { smoothScroll(href); setDrawerOpen(false); };
  const handleStart = ()     => { setDrawerOpen(false); if (onStartLearning) onStartLearning(); };

  return (
    <>
      <style>{`
        .nb {
          position: fixed; top: 0; left: 0; right: 0; z-index: 30;
          background: transparent;
          border-bottom: 1px solid transparent;
          transition: background .4s, border-color .4s, box-shadow .4s;
        }
        .nb.sc {
          background: rgba(250, 247, 242, 0.92);
          border-bottom-color: rgba(180, 130, 40, 0.16);
          backdrop-filter: blur(20px) saturate(1.6);
          -webkit-backdrop-filter: blur(20px) saturate(1.6);
          box-shadow: 0 2px 20px rgba(120, 80, 20, 0.08);
        }
        .nb-in {
          max-width: 72rem; margin: 0 auto; padding: 0 1.5rem;
          height: 62px; display: flex; align-items: center;
          justify-content: space-between; gap: 1.5rem;
        }
        .nb-logo {
          display: flex; align-items: center; gap: 0.55rem;
          cursor: pointer; user-select: none; flex-shrink: 0;
          text-decoration: none;
        }
        .nb-mark {
          width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
          background: linear-gradient(135deg, #c8880a 0%, #b06820 55%, #1fa89a 100%);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(200,136,10,.28);
        }
        .nb-brand {
          font-size: .9375rem; font-weight: 800; letter-spacing: -.03em;
          background: linear-gradient(90deg, #a86810, #c8880a);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .nb-links {
          display: none; align-items: center; gap: .15rem;
          flex: 1; justify-content: center;
        }
        @media(min-width:768px){ .nb-links{display:flex;} }
        .nb-lnk {
          position: relative;
          display: inline-flex; align-items: center;
          padding: .4rem .7rem;
          font-size: .8125rem; font-weight: 500;
          color: #7a5a30; white-space: nowrap; border-radius: 8px;
          transition: color .2s, background .2s;
        }
        .nb-lnk::after {
          content: ''; position: absolute; bottom: 3px; left: .7rem; right: .7rem;
          height: 1.5px;
          background: linear-gradient(90deg, #c8880a, #b84020);
          border-radius: 1px;
          transform: scaleX(0); transform-origin: left;
          transition: transform .26s cubic-bezier(.4,0,.2,1);
        }
        .nb-lnk:hover { color: #4a2e08; background: rgba(180,130,40,.08); }
        .nb-lnk:hover::after { transform: scaleX(1); }
        .nb-lnk:focus-visible { outline: 2px solid rgba(200,136,10,.55); outline-offset:1px; }
        .nb-right { display:flex; align-items:center; gap:.55rem; flex-shrink:0; }
        .nb-cta {
          display: none; align-items: center; justify-content: center;
          border-radius: 99px; padding: 0 1.25rem; min-height: 38px;
          font-size: .8125rem; font-weight: 700; letter-spacing: .015em;
          color: #fff; white-space: nowrap;
          background: linear-gradient(115deg, #c8880a 0%, #b06820 50%, #a84820 100%);
          background-size: 200% 200%; animation: nbGrad 6s ease infinite;
          box-shadow: 0 2px 12px rgba(200,136,10,.32);
          transition: transform .2s, box-shadow .2s;
        }
        @media(min-width:480px){ .nb-cta{display:inline-flex;} }
        .nb-cta:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(200,136,10,.4); }
        .nb-cta:focus-visible { outline: 2px solid rgba(200,136,10,.65); outline-offset:2px; }
        @keyframes nbGrad { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        .nb-burger {
          display: flex; align-items: center; justify-content: center;
          width: 38px; height: 38px; border-radius: 9px;
          border: 1px solid rgba(180,130,40,.22);
          background: rgba(180,130,40,.07);
          color: #8a6030;
          transition: background .2s, color .2s, border-color .2s;
        }
        .nb-burger:hover { background: rgba(180,130,40,.15); color: #4a2e08; border-color: rgba(180,130,40,.38); }
        @media(min-width:768px){ .nb-burger{display:none;} }
        .nb-ov {
          position:fixed; inset:0;
          background: rgba(60,35,10,.35);
          backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
          z-index: 40; opacity:0; pointer-events:none; transition:opacity .3s;
        }
        .nb-ov.op { opacity:1; pointer-events:all; }
        .nb-dr {
          position:fixed; top:0; right:0;
          width: min(300px, 84vw); height: 100dvh;
          background: #faf7f2;
          border-left: 1px solid rgba(180,130,40,.18);
          box-shadow: -8px 0 32px rgba(100,60,10,.12);
          z-index: 50; display:flex; flex-direction:column;
          padding: 1.5rem 1.5rem 2rem;
          transform: translateX(100%);
          transition: transform .36s cubic-bezier(.4,0,.2,1);
        }
        .nb-dr.op { transform: translateX(0); }
        .nb-dr-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:2rem; }
        .nb-dr-lnk {
          display:flex; align-items:center; width:100%;
          padding: .8rem 0; text-align:left;
          font-size: .9375rem; font-weight:500; color: #7a5a30;
          border-bottom: 1px solid rgba(180,130,40,.12);
          transition: color .2s, padding-left .2s;
        }
        .nb-dr-lnk:hover { color: #3a2008; padding-left: .4rem; }
        .nb-dr-cta { margin-top:auto; padding-top:1.5rem; }
        .nb-dr-cta .nb-cta {
          display:inline-flex; width:100%; min-height:48px;
          font-size:.9rem; justify-content:center;
        }
      `}</style>

      <nav className={`nb${scrolled ? " sc" : ""}`}>
        <div className="nb-in">
          <div className="nb-logo" onClick={() => smoothScroll("#hero")}>
            <div className="nb-mark"><Zap size={12} color="#fff" fill="#fff" /></div>
            <span className="nb-brand">QazaqAI</span>
          </div>

          <div className="nb-links">
            {NAV_LINKS.map(({ label, href }) => (
              <button key={href} className="nb-lnk" onClick={() => handleNav(href)}>{label}</button>
            ))}
          </div>

          <div className="nb-right">
            <button className="nb-cta" onClick={handleStart}>Начать обучение</button>
            <button className="nb-burger" onClick={() => setDrawerOpen(true)} aria-label="Открыть меню">
              <Menu size={17} />
            </button>
          </div>
        </div>
      </nav>

      <div className={`nb-ov${drawerOpen ? " op" : ""}`} onClick={() => setDrawerOpen(false)} />
      <div className={`nb-dr${drawerOpen ? " op" : ""}`}>
        <div className="nb-dr-head">
          <div className="nb-logo">
            <div className="nb-mark"><Zap size={12} color="#fff" fill="#fff" /></div>
            <span className="nb-brand">QazaqAI</span>
          </div>
          <button className="nb-burger" onClick={() => setDrawerOpen(false)} aria-label="Закрыть меню">
            <X size={17} />
          </button>
        </div>
        <nav style={{ display:"flex", flexDirection:"column", flex:1 }}>
          {NAV_LINKS.map(({ label, href }) => (
            <button key={href} className="nb-dr-lnk" onClick={() => handleNav(href)}>{label}</button>
          ))}
        </nav>
        <div className="nb-dr-cta">
          <button className="nb-cta" onClick={handleStart}>Начать обучение</button>
        </div>
      </div>
    </>
  );
}
