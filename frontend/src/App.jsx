// UI-only changes; logic unchanged
import { useState, useEffect, useRef } from "react";

// Landing
import Navbar      from "./components/Navbar";
import Hero        from "./components/Hero";
import Footer      from "./components/Footer";
import Features    from "./sections/Features";
import Modules     from "./sections/Modules";
import AILogic     from "./sections/AILogic";
import HowItWorks  from "./sections/HowItWorks";
import FAQ         from "./sections/FAQ";

// Learn views
import Onboarding     from "./views/Onboarding";
import LearningHome   from "./views/LearningHome";
import DictionaryView from "./views/DictionaryView";
import GrammarView    from "./views/GrammarView";
import ExercisesView  from "./views/ExercisesView";
import TestsView      from "./views/TestsView";
import ProgressView   from "./views/ProgressView";
import AITutorView    from "./views/AITutorView";

const LS_KEY = "qazaqai_categories";

function ScreenTransition({ viewKey, children }) {
  const [visible, setVisible] = useState(false);
  const prev = useRef(null);
  useEffect(() => {
    if (prev.current !== viewKey) {
      setVisible(false);
      const t = setTimeout(() => { prev.current = viewKey; setVisible(true); }, 20);
      return () => clearTimeout(t);
    }
  }, [viewKey]);
  useEffect(() => { setVisible(true); }, []);
  return (
    <>
      <style>{`
        @keyframes screenFadeSlide { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .screen-enter { animation: screenFadeSlide 0.28s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>
      <div key={viewKey} className={visible ? "screen-enter" : ""} style={{ opacity: visible ? undefined : 0 }}>
        {children}
      </div>
    </>
  );
}

export default function App() {
  const [mode, setMode]             = useState("landing");
  const [activeView, setActiveView] = useState("onboarding");
  const [categories, setCategories] = useState(() => {
    try { const s = localStorage.getItem(LS_KEY); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });

  useEffect(() => {
    if (mode === "landing") {
      document.body.style.overflow = "";
      window.scrollTo({ top: 0 });
    }
  }, [mode]);

  const handleStartLearning      = () => { setActiveView(categories.length > 0 ? "home" : "onboarding"); setMode("learn"); };
  const handleOnboardingComplete = (cats) => { setCategories(cats); setActiveView("home"); };
  const nav                      = (v) => setActiveView(v);
  const goHome                   = () => setActiveView("home");
  const goProgress               = () => setActiveView("progress");
  const handleExit               = () => setMode("landing");

  if (mode === "learn") {
    let screen;
    if      (activeView === "onboarding")  screen = <Onboarding     onComplete={handleOnboardingComplete} onExit={handleExit} />;
    else if (activeView === "home")        screen = <LearningHome   onNavigate={nav} onExit={handleExit} categories={categories} />;
    else if (activeView === "dictionary")  screen = <DictionaryView onBack={goHome} onExit={handleExit} />;
    else if (activeView === "grammar")     screen = <GrammarView    onBack={goHome} onExit={handleExit} />;
    else if (activeView === "exercises")   screen = <ExercisesView  onBack={goHome} onExit={handleExit} />;
    else if (activeView === "tests")       screen = <TestsView      onBack={goHome} onExit={handleExit} onProgress={goProgress} />;
    else if (activeView === "progress")    screen = <ProgressView   onBack={goHome} onExit={handleExit} />;
    else if (activeView === "ai_tutor")    screen = <AITutorView    onBack={goHome} onExit={handleExit} />;

    return <ScreenTransition viewKey={activeView}>{screen}</ScreenTransition>;
  }

  return (
    <div style={{ background: "#faf7f2", minHeight: "100vh" }}>
      <Navbar onStartLearning={handleStartLearning} />
      <Hero   onStartLearning={handleStartLearning} />
      <Features />
      <Modules />
      <AILogic />
      <HowItWorks />
      <FAQ />
      <Footer />
    </div>
  );
}
