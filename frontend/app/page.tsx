"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

const NAV_LINKS = [
  "Home",
  "Features",
  "Users",
  "AI Tools",
  "How It Works",
  "About",
];

const USER_ROLES = [
  {
    role: "Students",
    title: "Student Learning Portal",
    icon: (
      <svg
        width="28"
        height="28"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.6}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 14l9-5-9-5-9 5 9 5z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 14l6.16-3.422A12.083 12.083 0 0121 13c0 2.5-4 8-9 8s-9-5.5-9-8c0-.88.32-1.7.84-2.422L12 14z"
        />
      </svg>
    ),
    color: "burgundy",
    features: [
      "Access uploaded lecture materials",
      "AI lecture note explanation",
      "AI document summarization",
      "Generate practice questions",
      "Generate quizzes from notes",
      "Take online examinations",
      "Participate in voting activities",
      "Track academic progress",
    ],
  },
  {
    role: "Lecturers",
    title: "Lecturer Management Portal",
    icon: (
      <svg
        width="28"
        height="28"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.6}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    color: "gold",
    features: [
      "Upload lecture resources",
      "Manage course materials",
      "Create assessments",
      "Monitor student activities",
      "Provide digital learning resources",
      "Support AI-enhanced education",
    ],
  },
  {
    role: "Administrators",
    title: "Administrative Control Portal",
    icon: (
      <svg
        width="28"
        height="28"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.6}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
    color: "green",
    features: [
      "Manage platform users",
      "Create voting activities",
      "Manage online examinations",
      "Monitor system activities",
      "Control academic workflows",
      "View analytics dashboard",
    ],
  },
];

const AI_FEATURES = [
  {
    title: "AI Lecture Assistant",
    desc: "Students upload or access lecture notes and let AI explain complex topics in simpler, clear language.",
    icon: (
      <svg
        width="24"
        height="24"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.6}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>
    ),
  },
  {
    title: "AI Summarization Engine",
    desc: "Convert lengthy lecture materials into concise, understandable summaries in seconds.",
    icon: (
      <svg
        width="24"
        height="24"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.6}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 6h16M4 12h10M4 18h7"
        />
      </svg>
    ),
  },
  {
    title: "AI Quiz Generator",
    desc: "Automatically generate practice questions and quizzes directly from academic resources.",
    icon: (
      <svg
        width="24"
        height="24"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.6}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
    ),
  },
  {
    title: "Smart Academic Assistant",
    desc: "Provide instant academic support and personalized learning guidance 24/7.",
    icon: (
      <svg
        width="24"
        height="24"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.6}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    ),
  },
  {
    title: "Examination System",
    desc: "Secure, monitored online assessment environment for fair academic evaluations.",
    icon: (
      <svg
        width="24"
        height="24"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.6}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
  {
    title: "Voting System",
    desc: "Digital voting tools for transparent university activities and informed decision making.",
    icon: (
      <svg
        width="24"
        height="24"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.6}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
];

const STEPS = [
  {
    num: "01",
    title: "Login Based On Role",
    desc: "Students, lecturers, and admins access their dedicated personalized dashboard.",
  },
  {
    num: "02",
    title: "Upload & Manage Resources",
    desc: "Academic materials are organized, categorized, and stored digitally.",
  },
  {
    num: "03",
    title: "AI Enhances Learning",
    desc: "Artificial intelligence explains, summarizes, and generates learning materials automatically.",
  },
  {
    num: "04",
    title: "Learn, Assess & Engage",
    desc: "Students participate in quizzes, exams, and voting activities seamlessly.",
  },
];

const BENEFITS = [
  { label: "Saves Learning Time", icon: "⏱" },
  { label: "Improves Understanding", icon: "💡" },
  { label: "Encourages Independent Learning", icon: "📚" },
  { label: "Simplifies Academic Management", icon: "🗂" },
  { label: "Supports Digital Transformation", icon: "🚀" },
  { label: "Modern Educational Experience", icon: "🎓" },
];

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setInView(true);
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  };

  return (
    <div
      style={{
        fontFamily: "'Crimson Pro', 'Georgia', serif",
        background: "#fff",
        color: "#1a1a1a",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        :root {
          --burgundy: #7B1C2A;
          --burgundy-dark: #5a1320;
          --burgundy-light: #9e2436;
          --gold: #C9911A;
          --gold-light: #F0B429;
          --gold-pale: #FDF3DC;
          --green: #2A6049;
          --green-light: #3a7c5f;
          --off-white: #FAFAF8;
          --gray-100: #F4F3F0;
          --gray-200: #E8E6E1;
          --gray-400: #9C9992;
          --gray-700: #4A4845;
          --text: #1C1A18;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #fff; }
        .serif { font-family: 'Crimson Pro', Georgia, serif; }
        .sans { font-family: 'DM Sans', system-ui, sans-serif; }
        .btn-primary {
          background: var(--burgundy);
          color: #fff;
          border: none;
          padding: 12px 28px;
          border-radius: 6px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
          letter-spacing: 0.02em;
        }
        .btn-primary:hover { background: var(--burgundy-dark); transform: translateY(-1px); }
        .btn-outline {
          background: transparent;
          color: var(--burgundy);
          border: 1.5px solid var(--burgundy);
          padding: 11px 26px;
          border-radius: 6px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.02em;
        }
        .btn-outline:hover { background: var(--burgundy); color: #fff; transform: translateY(-1px); }
        .btn-gold {
          background: var(--gold);
          color: #fff;
          border: none;
          padding: 14px 36px;
          border-radius: 6px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
          letter-spacing: 0.02em;
        }
        .btn-gold:hover { background: #b07d14; transform: translateY(-2px); }
        .nav-link {
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: var(--gray-700);
          text-decoration: none;
          cursor: pointer;
          transition: color 0.2s;
          letter-spacing: 0.01em;
        }
        .nav-link:hover { color: var(--burgundy); }
        .section-tag {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 12px;
          display: block;
        }
        .section-title {
          font-family: 'Crimson Pro', Georgia, serif;
          font-size: clamp(32px, 5vw, 54px);
          font-weight: 600;
          line-height: 1.12;
          color: var(--text);
        }
        .card {
          background: #fff;
          border: 1px solid var(--gray-200);
          border-radius: 12px;
          padding: 28px;
          transition: box-shadow 0.25s, transform 0.25s;
        }
        .card:hover { box-shadow: 0 8px 32px rgba(123,28,42,0.10); transform: translateY(-3px); }
        .glass-card {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(201,145,26,0.2);
          border-radius: 14px;
          padding: 28px;
        }
        .feature-icon {
          width: 48px; height: 48px;
          background: var(--gold-pale);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: var(--burgundy);
          flex-shrink: 0;
        }
        .step-num {
          font-family: 'Crimson Pro', serif;
          font-size: 72px;
          font-weight: 700;
          line-height: 1;
          color: var(--gray-200);
          position: absolute;
          top: -16px; left: -4px;
          z-index: 0;
        }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes pulse-ring { 0%{transform:scale(0.95);opacity:0.7} 100%{transform:scale(1.08);opacity:0} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .float { animation: float 4s ease-in-out infinite; }
        .float-delay { animation: float 4s ease-in-out infinite 1.4s; }
        .float-delay2 { animation: float 4s ease-in-out infinite 2.8s; }
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .mobile-col { flex-direction: column !important; }
          .mobile-stack { flex-direction: column !important; gap: 16px !important; }
        }
        @media (min-width: 769px) {
          .hide-desktop { display: none !important; }
        }
        .divider-ornament {
          display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
        }
        .divider-ornament::before, .divider-ornament::after {
          content: ''; flex: 1; height: 1px; background: var(--gray-200);
        }
        .check-item {
          display: flex; align-items: flex-start; gap: 10px;
          font-family: 'DM Sans', sans-serif; font-size: 14px;
          color: var(--gray-700); line-height: 1.5; margin-bottom: 10px;
        }
        .check-dot {
          width: 18px; height: 18px; border-radius: 50%;
          background: var(--gold-pale); border: 1.5px solid var(--gold);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: 1px;
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: scrolled
            ? "rgba(255,255,255,0.97)"
            : "rgba(255,255,255,0.90)",
          backdropFilter: "blur(16px)",
          borderBottom: scrolled
            ? "1px solid var(--gray-200)"
            : "1px solid transparent",
          transition: "all 0.3s",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            height: 68,
            gap: 32,
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, var(--burgundy) 60%, var(--gold))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontFamily: "'Crimson Pro', serif",
                  fontWeight: 700,
                }}
              >
                AI
              </span>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Crimson Pro', serif",
                  fontWeight: 700,
                  fontSize: 15,
                  color: "var(--burgundy)",
                  lineHeight: 1.1,
                }}
              >
                AI Academic
              </div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 10,
                  color: "var(--gray-400)",
                  letterSpacing: "0.08em",
                }}
              >
                RESOURCE SYSTEM
              </div>
            </div>
          </div>

          {/* Nav links */}
          <div
            className="hide-mobile"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 28,
              flex: 1,
              justifyContent: "center",
            }}
          >
            {NAV_LINKS.map((l) => (
              <span
                key={l}
                className="nav-link"
                onClick={() => scrollTo(l.toLowerCase().replace(/\s+/g, "-"))}
              >
                {l}
              </span>
            ))}
          </div>

          {/* CTA buttons */}
          <div
            className="hide-mobile"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexShrink: 0,
              position: "relative",
            }}
          >
            <div style={{ position: "relative" }}>
              <button
                className="btn-outline"
                onClick={() => setLoginOpen(!loginOpen)}
                style={{ padding: "9px 18px", fontSize: 13 }}
              >
                Login ▾
              </button>
              {loginOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    background: "#fff",
                    border: "1px solid var(--gray-200)",
                    borderRadius: 10,
                    boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
                    padding: "8px 0",
                    minWidth: 200,
                    zIndex: 200,
                  }}
                >
                  {["Student Portal", "Lecturer Portal", "Admin Portal"].map(
                    (p) => (
                      <Link key={p} href={"/auth/sign-in"}>
                        <div
                          key={p}
                          style={{
                            padding: "10px 20px",
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 14,
                            color: "var(--gray-700)",
                            cursor: "pointer",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "var(--gray-100)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                          onClick={() => setLoginOpen(false)}
                        >
                          {p}
                        </div>
                      </Link>
                    ),
                  )}
                </div>
              )}
            </div>
            <Link href={"/auth/sign-up"}>
              <button
                className="btn-primary"
                style={{ padding: "9px 18px", fontSize: 13 }}
              >
                Get Started
              </button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="hide-desktop"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 24,
              color: "var(--burgundy)",
            }}
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            style={{
              background: "#fff",
              borderTop: "1px solid var(--gray-200)",
              padding: "16px 24px",
            }}
          >
            {NAV_LINKS.map((l) => (
              <div
                key={l}
                className="nav-link"
                style={{
                  display: "block",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--gray-100)",
                }}
                onClick={() => scrollTo(l.toLowerCase().replace(/\s+/g, "-"))}
              >
                {l}
              </div>
            ))}
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button className="btn-outline" style={{ flex: 1, fontSize: 13 }}>
                Login
              </button>
              <button className="btn-primary" style={{ flex: 1, fontSize: 13 }}>
                Get Started
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section
        id="home"
        style={{
          minHeight: "100vh",
          paddingTop: 100,
          background:
            "linear-gradient(160deg, #FAFAF8 0%, #FDF3DC 40%, #F8EAEC 80%, #FAFAF8 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background ornament */}
        <div
          style={{
            position: "absolute",
            top: "10%",
            right: "5%",
            width: 480,
            height: 480,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(201,145,26,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "5%",
            left: "-5%",
            width: 360,
            height: 360,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(123,28,42,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "60px 24px",
            display: "flex",
            alignItems: "center",
            gap: 48,
            flexWrap: "wrap",
          }}
        >
          {/* Hero copy */}
          <div style={{ flex: "1 1 480px", maxWidth: 600 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(201,145,26,0.12)",
                border: "1px solid rgba(201,145,26,0.3)",
                borderRadius: 20,
                padding: "5px 14px",
                marginBottom: 28,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  background: "var(--gold)",
                  borderRadius: "50%",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  color: "var(--gold)",
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                }}
              >
                Catholic University of Ghana · Final Year Project 2026
              </span>
            </div>

            <h1
              style={{
                fontFamily: "'Crimson Pro', Georgia, serif",
                fontSize: "clamp(38px, 6vw, 68px)",
                fontWeight: 700,
                lineHeight: 1.06,
                color: "var(--text)",
                marginBottom: 24,
                letterSpacing: "-0.01em",
              }}
            >
              Transforming Academic Learning Through{" "}
              <em style={{ color: "var(--burgundy)", fontStyle: "italic" }}>
                Artificial Intelligence
              </em>
            </h1>

            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 17,
                lineHeight: 1.75,
                color: "var(--gray-700)",
                marginBottom: 40,
                maxWidth: 520,
              }}
            >
              An AI-powered academic resource platform designed for Catholic
              University of Ghana — simplifying learning, automating
              assessments, improving student engagement, and creating smarter
              educational experiences.
            </p>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <button
                className="btn-primary"
                style={{ padding: "14px 32px", fontSize: 15 }}
                onClick={() => scrollTo("features")}
              >
                Explore Platform
              </button>
              <button
                className="btn-outline"
                style={{ padding: "14px 32px", fontSize: 15 }}
                onClick={() => scrollTo("ai-tools")}
              >
                View Features
              </button>
            </div>

            {/* Stats */}
            <div
              style={{
                display: "flex",
                gap: 32,
                marginTop: 52,
                flexWrap: "wrap",
              }}
            >
              {[
                ["3", "User Roles"],
                ["6+", "AI Features"],
                ["100%", "Digital Learning"],
              ].map(([val, label]) => (
                <div key={label}>
                  <div
                    style={{
                      fontFamily: "'Crimson Pro', serif",
                      fontSize: 36,
                      fontWeight: 700,
                      color: "var(--burgundy)",
                      lineHeight: 1,
                    }}
                  >
                    {val}
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 12,
                      color: "var(--gray-400)",
                      marginTop: 4,
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero dashboard mockup */}
          <div
            style={{ flex: "1 1 380px", maxWidth: 520, position: "relative" }}
          >
            {/* Main dashboard card */}
            <div
              className="float"
              style={{
                background: "#fff",
                borderRadius: 20,
                border: "1px solid var(--gray-200)",
                boxShadow:
                  "0 24px 80px rgba(123,28,42,0.12), 0 4px 16px rgba(0,0,0,0.05)",
                padding: 24,
                overflow: "hidden",
              }}
            >
              {/* Dashboard header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                  borderBottom: "1px solid var(--gray-100)",
                  paddingBottom: 16,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "'Crimson Pro', serif",
                      fontSize: 16,
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    Student Dashboard
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 11,
                      color: "var(--gray-400)",
                    }}
                  >
                    AI Enhanced Academic Resource
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
                    <div
                      key={c}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: c,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* AI Chat mini */}
              <div
                style={{
                  background: "var(--gray-100)",
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--burgundy)",
                    marginBottom: 8,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  AI Assistant
                </div>
                <div
                  style={{
                    background: "var(--burgundy)",
                    color: "#fff",
                    borderRadius: "8px 8px 8px 2px",
                    padding: "8px 12px",
                    fontSize: 12,
                    fontFamily: "'DM Sans', sans-serif",
                    lineHeight: 1.5,
                    display: "inline-block",
                    maxWidth: "85%",
                  }}
                >
                  Explain this section on Binary Trees using simple analogies...
                </div>
                <div
                  style={{
                    marginTop: 8,
                    background: "var(--gold-pale)",
                    border: "1px solid rgba(201,145,26,0.2)",
                    borderRadius: "2px 8px 8px 8px",
                    padding: "8px 12px",
                    fontSize: 12,
                    fontFamily: "'DM Sans', sans-serif",
                    lineHeight: 1.5,
                    maxWidth: "90%",
                    color: "var(--gray-700)",
                  }}
                >
                  A Binary Tree is like a family tree where each parent has at
                  most 2 children...
                </div>
              </div>

              {/* Mini cards row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    background: "var(--gold-pale)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    border: "1px solid rgba(201,145,26,0.15)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 10,
                      color: "var(--gold)",
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Quiz Generated
                  </div>
                  <div
                    style={{
                      fontFamily: "'Crimson Pro', serif",
                      fontSize: 22,
                      fontWeight: 700,
                      color: "var(--text)",
                      marginTop: 4,
                    }}
                  >
                    12
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 11,
                      color: "var(--gray-400)",
                    }}
                  >
                    Practice questions
                  </div>
                </div>
                <div
                  style={{
                    background: "#F0F7F4",
                    borderRadius: 10,
                    padding: "12px 14px",
                    border: "1px solid rgba(42,96,73,0.12)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 10,
                      color: "var(--green)",
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Progress
                  </div>
                  <div
                    style={{
                      fontFamily: "'Crimson Pro', serif",
                      fontSize: 22,
                      fontWeight: 700,
                      color: "var(--text)",
                      marginTop: 4,
                    }}
                  >
                    74%
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 11,
                      color: "var(--gray-400)",
                    }}
                  >
                    Course complete
                  </div>
                </div>
              </div>

              {/* Upcoming exam */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#FEF2F2",
                  borderRadius: 10,
                  padding: "11px 14px",
                  border: "1px solid rgba(123,28,42,0.12)",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--burgundy)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    CS401 Exam
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 11,
                      color: "var(--gray-400)",
                    }}
                  >
                    Tomorrow · 9:00 AM
                  </div>
                </div>
                <div
                  style={{
                    background: "var(--burgundy)",
                    color: "#fff",
                    borderRadius: 6,
                    padding: "5px 11px",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  Prepare
                </div>
              </div>
            </div>

            {/* Floating chips */}
            <div
              className="float-delay"
              style={{
                position: "absolute",
                top: -20,
                right: -20,
                background: "#fff",
                border: "1px solid var(--gray-200)",
                borderRadius: 12,
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{ fontSize: 18 }}>🧠</div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text)",
                }}
              >
                AI Powered
              </div>
            </div>

            <div
              className="float-delay2"
              style={{
                position: "absolute",
                bottom: 40,
                left: -30,
                background: "var(--burgundy)",
                borderRadius: 12,
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 8px 24px rgba(123,28,42,0.25)",
              }}
            >
              <div style={{ fontSize: 16 }}>📄</div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#fff",
                }}
              >
                Smart Summarize
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" style={{ background: "#fff", padding: "100px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <div
              style={{
                textAlign: "center",
                maxWidth: 680,
                margin: "0 auto 64px",
              }}
            >
              <span className="section-tag">About The Project</span>
              <h2 className="section-title">
                Building The Future Of Digital Learning At CUG
              </h2>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 17,
                  lineHeight: 1.8,
                  color: "var(--gray-700)",
                  marginTop: 20,
                }}
              >
                This system helps students, lecturers, and administrators
                collaborate through a centralized AI-enhanced learning
                environment, unifying resources, assessments, and communication
                in one intelligent platform.
              </p>
            </div>
          </FadeIn>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            {[
              {
                title: "Smart Learning",
                icon: "🎯",
                desc: "AI helps students understand academic materials faster through intelligent explanation and adaptive content delivery.",
                color: "var(--gold-pale)",
                border: "rgba(201,145,26,0.2)",
                iconBg: "rgba(201,145,26,0.15)",
              },
              {
                title: "Academic Automation",
                icon: "⚙️",
                desc: "Automates repetitive academic processes — from generating assessments to organizing materials — saving time for learning.",
                color: "#FEF2F2",
                border: "rgba(123,28,42,0.15)",
                iconBg: "rgba(123,28,42,0.1)",
              },
              {
                title: "Digital Engagement",
                icon: "🤝",
                desc: "Improves interaction between students, lecturers, and administrators through digital tools and real-time collaboration.",
                color: "#F0F7F4",
                border: "rgba(42,96,73,0.15)",
                iconBg: "rgba(42,96,73,0.1)",
              },
            ].map((c, i) => (
              <FadeIn key={c.title} delay={i * 120}>
                <div
                  style={{
                    background: c.color,
                    border: `1px solid ${c.border}`,
                    borderRadius: 16,
                    padding: 32,
                    height: "100%",
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 16 }}>{c.icon}</div>
                  <h3
                    style={{
                      fontFamily: "'Crimson Pro', serif",
                      fontSize: 24,
                      fontWeight: 600,
                      marginBottom: 12,
                      color: "var(--text)",
                    }}
                  >
                    {c.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 15,
                      lineHeight: 1.7,
                      color: "var(--gray-700)",
                    }}
                  >
                    {c.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── USERS ── */}
      <section
        id="users"
        style={{ background: "var(--off-white)", padding: "100px 24px" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <span className="section-tag">User Roles</span>
              <h2 className="section-title">
                One Platform. Three Powerful Experiences.
              </h2>
            </div>
          </FadeIn>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 28,
            }}
          >
            {USER_ROLES.map((role, i) => {
              const styles = {
                burgundy: {
                  bg: "var(--burgundy)",
                  accent: "var(--gold)",
                  badge: "rgba(255,255,255,0.15)",
                  text: "#fff",
                  sub: "rgba(255,255,255,0.75)",
                },
                gold: {
                  bg: "#fff",
                  accent: "var(--burgundy)",
                  badge: "var(--gold-pale)",
                  text: "var(--text)",
                  sub: "var(--gray-400)",
                },
                green: {
                  bg: "#fff",
                  accent: "var(--green)",
                  badge: "#F0F7F4",
                  text: "var(--text)",
                  sub: "var(--gray-400)",
                },
              }[role.color] ?? {
                bg: "#fff",
                accent: "var(--burgundy)",
                badge: "var(--gray-100)",
                text: "var(--text)",
                sub: "var(--gray-400)",
              };

              return (
                <FadeIn key={role.role} delay={i * 140}>
                  <div
                    style={{
                      background: styles.bg,
                      borderRadius: 18,
                      border:
                        role.color === "burgundy"
                          ? "none"
                          : "1px solid var(--gray-200)",
                      boxShadow:
                        role.color === "burgundy"
                          ? "0 24px 60px rgba(123,28,42,0.25)"
                          : "0 2px 16px rgba(0,0,0,0.04)",
                      padding: 32,
                      height: "100%",
                      transition: "transform 0.25s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.transform = "translateY(-5px)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.transform = "translateY(0)")
                    }
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        marginBottom: 24,
                      }}
                    >
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 12,
                          background: styles.badge,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color:
                            role.color === "burgundy" ? "#fff" : styles.accent,
                        }}
                      >
                        {role.icon}
                      </div>
                      <div>
                        <div
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color:
                              role.color === "burgundy"
                                ? "rgba(255,255,255,0.6)"
                                : "var(--gold)",
                            marginBottom: 3,
                          }}
                        >
                          {role.role}
                        </div>
                        <div
                          style={{
                            fontFamily: "'Crimson Pro', serif",
                            fontSize: 20,
                            fontWeight: 600,
                            color: styles.text,
                          }}
                        >
                          {role.title}
                        </div>
                      </div>
                    </div>

                    <div>
                      {role.features.map((f) => (
                        <div
                          key={f}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            marginBottom: 9,
                          }}
                        >
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              flexShrink: 0,
                              marginTop: 1,
                              background:
                                role.color === "burgundy"
                                  ? "rgba(255,255,255,0.2)"
                                  : "var(--gold-pale)",
                              border: `1px solid ${role.color === "burgundy" ? "rgba(255,255,255,0.4)" : "rgba(201,145,26,0.3)"}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <svg width="8" height="8" viewBox="0 0 8 8">
                              <path
                                d="M1 4l2 2 4-4"
                                stroke={
                                  role.color === "burgundy"
                                    ? "#fff"
                                    : "var(--gold)"
                                }
                                strokeWidth="1.5"
                                fill="none"
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>
                          <span
                            style={{
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: 14,
                              color: styles.sub,
                              lineHeight: 1.5,
                            }}
                          >
                            {f}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AI FEATURES ── */}
      <section
        id="ai-tools"
        style={{ background: "#fff", padding: "100px 24px" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <div
              style={{
                textAlign: "center",
                maxWidth: 640,
                margin: "0 auto 64px",
              }}
            >
              <span className="section-tag">AI Tools</span>
              <h2 className="section-title" id="features">
                Intelligent AI Tools For Smarter Education
              </h2>
            </div>
          </FadeIn>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 22,
            }}
          >
            {AI_FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 100}>
                <div
                  className="card"
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <div className="feature-icon">{f.icon}</div>
                  <h3
                    style={{
                      fontFamily: "'Crimson Pro', serif",
                      fontSize: 22,
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    {f.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 14,
                      lineHeight: 1.7,
                      color: "var(--gray-700)",
                    }}
                  >
                    {f.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section
        id="how-it-works"
        style={{
          background:
            "linear-gradient(135deg, var(--burgundy) 0%, #5a1320 100%)",
          padding: "100px 24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            pointerEvents: "none",
          }}
        />

        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 72 }}>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--gold-light)",
                  marginBottom: 12,
                  display: "block",
                }}
              >
                How It Works
              </span>
              <h2
                style={{
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: "clamp(32px, 5vw, 54px)",
                  fontWeight: 600,
                  color: "#fff",
                  lineHeight: 1.12,
                }}
              >
                Simple Steps To AI-Enhanced Learning
              </h2>
            </div>
          </FadeIn>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 32,
            }}
          >
            {STEPS.map((s, i) => (
              <FadeIn key={s.num} delay={i * 130}>
                <div style={{ position: "relative", paddingTop: 32 }}>
                  <span
                    className="step-num"
                    style={{ color: "rgba(255,255,255,0.08)" }}
                  >
                    {s.num}
                  </span>
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: "rgba(201,145,26,0.25)",
                        border: "1px solid rgba(201,145,26,0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "'Crimson Pro', serif",
                        fontSize: 20,
                        fontWeight: 700,
                        color: "var(--gold-light)",
                        marginBottom: 20,
                      }}
                    >
                      {i + 1}
                    </div>
                    <h3
                      style={{
                        fontFamily: "'Crimson Pro', serif",
                        fontSize: 22,
                        fontWeight: 600,
                        color: "#fff",
                        marginBottom: 12,
                      }}
                    >
                      {s.title}
                    </h3>
                    <p
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 14,
                        lineHeight: 1.75,
                        color: "rgba(255,255,255,0.65)",
                      }}
                    >
                      {s.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW ── */}
      <section
        style={{ background: "var(--off-white)", padding: "100px 24px" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <div
              style={{
                textAlign: "center",
                maxWidth: 620,
                margin: "0 auto 64px",
              }}
            >
              <span className="section-tag">Platform Preview</span>
              <h2 className="section-title">A Glimpse Inside The Platform</h2>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 16,
                  lineHeight: 1.75,
                  color: "var(--gray-700)",
                  marginTop: 16,
                }}
              >
                Purpose-built dashboards for every role — intelligent, clean,
                and powerful.
              </p>
            </div>
          </FadeIn>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 24,
            }}
          >
            {/* Student dashboard */}
            <FadeIn delay={0}>
              <div
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  border: "1px solid var(--gray-200)",
                  overflow: "hidden",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    background: "var(--burgundy)",
                    padding: "14px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.4)",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#fff",
                    }}
                  >
                    Student Dashboard
                  </span>
                </div>
                <div style={{ padding: 20 }}>
                  <div
                    style={{
                      background: "var(--gray-100)",
                      borderRadius: 10,
                      padding: 14,
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--burgundy)",
                        marginBottom: 8,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      AI Chat
                    </div>
                    <div
                      style={{
                        background: "var(--burgundy)",
                        color: "#fff",
                        borderRadius: "8px 8px 8px 2px",
                        padding: "7px 11px",
                        fontSize: 12,
                        fontFamily: "'DM Sans', sans-serif",
                        display: "inline-block",
                      }}
                    >
                      Summarize Chapter 3 for me
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        background: "var(--gold-pale)",
                        borderRadius: "2px 8px 8px 8px",
                        padding: "7px 11px",
                        fontSize: 12,
                        fontFamily: "'DM Sans', sans-serif",
                        color: "var(--gray-700)",
                      }}
                    >
                      Chapter 3 covers data structures including arrays, linked
                      lists...
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div
                      style={{
                        flex: 1,
                        background: "var(--gold-pale)",
                        borderRadius: 8,
                        padding: "10px 12px",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 10,
                          color: "var(--gold)",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Quizzes
                      </div>
                      <div
                        style={{
                          fontFamily: "'Crimson Pro', serif",
                          fontSize: 20,
                          fontWeight: 700,
                          color: "var(--text)",
                        }}
                      >
                        8
                      </div>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        background: "#F0F7F4",
                        borderRadius: 8,
                        padding: "10px 12px",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 10,
                          color: "var(--green)",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Score
                      </div>
                      <div
                        style={{
                          fontFamily: "'Crimson Pro', serif",
                          fontSize: 20,
                          fontWeight: 700,
                          color: "var(--text)",
                        }}
                      >
                        86%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Lecturer dashboard */}
            <FadeIn delay={120}>
              <div
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  border: "1px solid var(--gray-200)",
                  overflow: "hidden",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    background: "#C9911A",
                    padding: "14px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.4)",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#fff",
                    }}
                  >
                    Lecturer Dashboard
                  </span>
                </div>
                <div style={{ padding: 20 }}>
                  {[
                    {
                      name: "CS301_DataStructures.pdf",
                      size: "2.4 MB",
                      students: 42,
                    },
                    {
                      name: "CS401_Algorithms.pdf",
                      size: "3.1 MB",
                      students: 38,
                    },
                  ].map((r) => (
                    <div
                      key={r.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 0",
                        borderBottom: "1px solid var(--gray-100)",
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: "var(--gold-pale)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="var(--gold)"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 13,
                            fontWeight: 500,
                            color: "var(--text)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.name}
                        </div>
                        <div
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 11,
                            color: "var(--gray-400)",
                          }}
                        >
                          {r.size} · {r.students} students
                        </div>
                      </div>
                    </div>
                  ))}
                  <div
                    style={{
                      marginTop: 14,
                      background: "var(--gold-pale)",
                      borderRadius: 10,
                      padding: "12px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        color: "var(--gray-700)",
                      }}
                    >
                      Total Active Students
                    </span>
                    <span
                      style={{
                        fontFamily: "'Crimson Pro', serif",
                        fontSize: 22,
                        fontWeight: 700,
                        color: "var(--burgundy)",
                      }}
                    >
                      80
                    </span>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Admin dashboard */}
            <FadeIn delay={240}>
              <div
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  border: "1px solid var(--gray-200)",
                  overflow: "hidden",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    background: "var(--green)",
                    padding: "14px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.4)",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#fff",
                    }}
                  >
                    Admin Dashboard
                  </span>
                </div>
                <div style={{ padding: 20 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                      marginBottom: 14,
                    }}
                  >
                    {[
                      { label: "Total Users", val: "342" },
                      { label: "Exams Active", val: "3" },
                      { label: "Votes Open", val: "1" },
                      { label: "Resources", val: "128" },
                    ].map((s) => (
                      <div
                        key={s.label}
                        style={{
                          background: "var(--gray-100)",
                          borderRadius: 8,
                          padding: "10px 12px",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 10,
                            color: "var(--gray-400)",
                            fontWeight: 500,
                            marginBottom: 2,
                          }}
                        >
                          {s.label}
                        </div>
                        <div
                          style={{
                            fontFamily: "'Crimson Pro', serif",
                            fontSize: 22,
                            fontWeight: 700,
                            color: "var(--text)",
                          }}
                        >
                          {s.val}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      background: "#F0F7F4",
                      borderRadius: 10,
                      padding: "12px 14px",
                      border: "1px solid rgba(42,96,73,0.12)",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--green)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: 6,
                      }}
                    >
                      System Status
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#22C55E",
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 13,
                          color: "var(--gray-700)",
                        }}
                      >
                        All systems operational
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section style={{ background: "#fff", padding: "100px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <div
              style={{
                textAlign: "center",
                maxWidth: 600,
                margin: "0 auto 64px",
              }}
            >
              <span className="section-tag">Why Choose Us</span>
              <h2 className="section-title">
                Why AI Enhanced Academic Resources?
              </h2>
            </div>
          </FadeIn>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {BENEFITS.map((b, i) => (
              <FadeIn key={b.label} delay={i * 90}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "22px 24px",
                    background: "var(--off-white)",
                    borderRadius: 12,
                    border: "1px solid var(--gray-200)",
                    transition: "all 0.25s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--gold-pale)";
                    e.currentTarget.style.borderColor = "rgba(201,145,26,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--off-white)";
                    e.currentTarget.style.borderColor = "var(--gray-200)";
                  }}
                >
                  <span style={{ fontSize: 24, flexShrink: 0 }}>{b.icon}</span>
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 15,
                      fontWeight: 500,
                      color: "var(--text)",
                    }}
                  >
                    {b.label}
                  </span>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROJECT INFO ── */}
      <section style={{ background: "var(--off-white)", padding: "80px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <FadeIn>
            <div
              style={{
                display: "inline-block",
                background: "var(--gold-pale)",
                border: "1px solid rgba(201,145,26,0.25)",
                borderRadius: 12,
                padding: "48px 56px",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 20 }}>🎓</div>
              <span
                className="section-tag"
                style={{ justifyContent: "center" }}
              >
                Academic Project
              </span>
              <h2
                style={{
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 32,
                  fontWeight: 600,
                  color: "var(--text)",
                  marginBottom: 20,
                }}
              >
                Computer Science Innovation Project
              </h2>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 16,
                  lineHeight: 1.8,
                  color: "var(--gray-700)",
                  marginBottom: 28,
                }}
              >
                Developed as an academic technology solution by a Computer
                Science student from Catholic University of Ghana, this project
                explores how Artificial Intelligence can transform learning
                management and academic interactions.
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--burgundy)",
                    letterSpacing: "0.04em",
                  }}
                >
                  Department of Computer Science
                </span>
                <span
                  style={{
                    fontFamily: "'Crimson Pro', serif",
                    fontSize: 18,
                    fontWeight: 600,
                    color: "var(--text)",
                    fontStyle: "italic",
                  }}
                >
                  Catholic University of Ghana
                </span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section
        style={{
          background:
            "linear-gradient(135deg, #1C0A0E 0%, var(--burgundy) 50%, #3d1020 100%)",
          padding: "120px 24px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(201,145,26,0.12) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", maxWidth: 640, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ fontSize: 48, marginBottom: 24 }}>✨</div>
            <h2
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: "clamp(34px, 6vw, 60px)",
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1.1,
                marginBottom: 20,
                letterSpacing: "-0.01em",
              }}
            >
              Experience The Future Of AI-Powered Education
            </h2>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 18,
                color: "rgba(255,255,255,0.7)",
                lineHeight: 1.75,
                marginBottom: 44,
              }}
            >
              Empowering students, lecturers, and administrators through
              intelligent academic technology.
            </p>
            <button
              className="btn-gold"
              style={{ padding: "16px 48px", fontSize: 16, borderRadius: 8 }}
            >
              Get Started Today
            </button>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        style={{
          background: "#0E0608",
          padding: "60px 24px 32px",
          color: "rgba(255,255,255,0.6)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 48,
              marginBottom: 48,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, var(--burgundy), var(--gold))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      color: "#fff",
                      fontSize: 14,
                      fontFamily: "'Crimson Pro', serif",
                      fontWeight: 700,
                    }}
                  >
                    AI
                  </span>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "'Crimson Pro', serif",
                      fontWeight: 700,
                      fontSize: 15,
                      color: "#fff",
                      lineHeight: 1.1,
                    }}
                  >
                    AI Academic Resource
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 10,
                      color: "rgba(255,255,255,0.35)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    SYSTEM
                  </div>
                </div>
              </div>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  lineHeight: 1.75,
                  maxWidth: 240,
                }}
              >
                Catholic University of Ghana
              </p>
            </div>

            <div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.3)",
                  marginBottom: 16,
                }}
              >
                Quick Links
              </div>
              {["Features", "Students", "Lecturers", "Administrators"].map(
                (l) => (
                  <div
                    key={l}
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 14,
                      color: "rgba(255,255,255,0.55)",
                      marginBottom: 10,
                      cursor: "pointer",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "var(--gold-light)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "rgba(255,255,255,0.55)")
                    }
                  >
                    {l}
                  </div>
                ),
              )}
            </div>

            <div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.3)",
                  marginBottom: 16,
                }}
              >
                Portal Access
              </div>
              {["Student Portal", "Lecturer Portal", "Admin Portal"].map(
                (l) => (
                  <div
                    key={l}
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 14,
                      color: "rgba(255,255,255,0.55)",
                      marginBottom: 10,
                      cursor: "pointer",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "var(--gold-light)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "rgba(255,255,255,0.55)")
                    }
                  >
                    {l}
                  </div>
                ),
              )}
            </div>
          </div>

          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.08)",
              paddingTop: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
              © 2026 AI Enhanced Academic Resource System · Catholic University
              of Ghana
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                Built with
              </span>
              <span style={{ color: "var(--gold)", fontSize: 14 }}>♦</span>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                Computer Science · CUG
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
