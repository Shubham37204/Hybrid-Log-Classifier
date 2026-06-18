"use client";

import { useState, useCallback, useEffect } from "react";
import { classifyLog } from "@/lib/api";
import {
  ClassifyResponse,
  LogCategory,
  ClassifierTier,
} from "@/types/classifier";
import { PipelineTrace } from "@/components/PipelineTrace";

type Status = "idle" | "loading" | "done" | "error";

const EXAMPLES = [
  "Multiple login failures for user 9052",
  "phys_ram=64172MB used_ram=512MB phys_disk=15GB",
  "Escalation rule execution failed for ticket 9807",
  "Service nginx started successfully on host prod-01",
];

const CATEGORY_META: Record<
  LogCategory,
  { color: string; dot: string; label: string }
> = {
  SECURITY_ALERT: {
    color: "text-red-400",
    dot: "bg-red-400",
    label: "Security Alert",
  },
  RESOURCE_USAGE: {
    color: "text-blue-400",
    dot: "bg-blue-400",
    label: "Resource Usage",
  },
  WORKFLOW_ERROR: {
    color: "text-amber-400",
    dot: "bg-amber-400",
    label: "Workflow Error",
  },
  SYSTEM_EVENT: {
    color: "text-emerald-400",
    dot: "bg-emerald-400",
    label: "System Event",
  },
  UNKNOWN: { color: "text-zinc-400", dot: "bg-zinc-400", label: "Unknown" },
};

const TIER_LABEL: Record<ClassifierTier, string> = {
  regex: "Regex",
  ml: "TF-IDF + LR",
  llm: "Groq LLM",
};

// ── Theme hook ────────────────────────────────────────────────────────────────

function useTheme() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      dark ? "dark" : "light",
    );
  }, [dark]);

  return { dark, toggle: () => setDark((p) => !p) };
}

// ── Result Sheet ──────────────────────────────────────────────────────────────

function ResultSheet({
  result,
  onClose,
  dark,
}: {
  result: ClassifyResponse;
  onClose: () => void;
  dark: boolean;
}) {
  const meta = CATEGORY_META[result.category];
  const latency =
    result.latency_ms < 1
      ? `${(result.latency_ms * 1000).toFixed(1)}µs`
      : `${result.latency_ms.toFixed(2)}ms`;

  const surface = dark ? "#111111" : "#ffffff";
  const border = dark ? "#1f1f1f" : "#e5e5e5";
  const statBg = dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
  const codeBg = dark ? "#0a0a0a" : "#f5f5f5";
  const codeBdr = dark ? "#1a1a1a" : "#e0e0e0";
  const handleBg = dark ? "#2a2a2a" : "#d4d4d4";
  const closeBg = dark ? "#1a1a1a" : "#f0f0f0";
  const closeClr = dark ? "#666" : "#999";
  const labelClr = dark ? "#444" : "#999";
  const valClr = dark ? "#f0f0f0" : "#111111";

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl"
        style={{
          background: surface,
          border: `1px solid ${border}`,
          borderBottom: "none",
          animation: "slideUp 0.28s cubic-bezier(0.32,0.72,0,1)",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>

        <div className="flex justify-center pt-3 pb-1">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: handleBg }}
          />
        </div>

        <div className="px-6 pb-12 pt-4 space-y-6 max-w-2xl mx-auto">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p
                className="mono text-xs"
                style={{ color: labelClr, letterSpacing: "0.1em" }}
              >
                CLASSIFICATION RESULT
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                <span className={`mono text-xl font-medium ${meta.color}`}>
                  {meta.label}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center mono text-sm"
              style={{ background: closeBg, color: closeClr }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "CONFIDENCE",
                value: `${(result.confidence * 100).toFixed(0)}%`,
              },
              { label: "TIER", value: TIER_LABEL[result.classifier_used] },
              { label: "LATENCY", value: latency },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl px-4 py-3 space-y-1"
                style={{ background: statBg, border: `1px solid ${border}` }}
              >
                <p
                  className="mono text-xs"
                  style={{ color: labelClr, letterSpacing: "0.08em" }}
                >
                  {label}
                </p>
                <p
                  className="mono text-base font-medium"
                  style={{ color: valClr }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          {result.matched_pattern && (
            <div className="space-y-2">
              <p
                className="mono text-xs"
                style={{ color: labelClr, letterSpacing: "0.08em" }}
              >
                MATCHED PATTERN
              </p>
              <div
                className="rounded-lg px-4 py-3"
                style={{ background: codeBg, border: `1px solid ${codeBdr}` }}
              >
                <code className="mono text-xs text-emerald-500 break-all">
                  {result.matched_pattern}
                </code>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p
              className="mono text-xs"
              style={{ color: labelClr, letterSpacing: "0.08em" }}
            >
              PIPELINE TRACE
            </p>
            <PipelineTrace used={result.classifier_used} dark={dark} />
          </div>
        </div>
      </div>
    </>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────

function Navbar({ dark, toggle }: { dark: boolean; toggle: () => void }) {
  const bg = dark ? "rgba(8,8,8,0.85)" : "rgba(255,255,255,0.85)";
  const border = dark ? "#1a1a1a" : "#e5e5e5";
  const logoClr = dark ? "#f0f0f0" : "#111111";
  const linkClr = dark ? "#888" : "#666";
  const linkHov = dark ? "#f0f0f0" : "#111";
  const tagBg = dark ? "#1a1a1a" : "#f0f0f0";
  const tagClr = dark ? "#666" : "#999";
  const tagBdr = dark ? "#2a2a2a" : "#e0e0e0";

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-6 h-14"
      style={{
        background: bg,
        borderBottom: `1px solid ${border}`,
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center gap-2.5">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="mono text-sm font-medium" style={{ color: logoClr }}>
          log-classifier
        </span>
      </div>

      <div className="flex items-center gap-5">
        {["#classify", "#how-it-works"].map((href, i) => (
          <a
            key={href}
            href={href}
            className="mono text-xs transition-colors"
            style={{ color: linkClr }}
            onMouseEnter={(e) => (e.currentTarget.style.color = linkHov)}
            onMouseLeave={(e) => (e.currentTarget.style.color = linkClr)}
          >
            {i === 0 ? "Classify" : "How it works"}
          </a>
        ))}

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="mono text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-2"
          style={{
            background: tagBg,
            color: tagClr,
            border: `1px solid ${tagBdr}`,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          {dark ? "☀ Light" : "◑ Dark"}
        </button>

        <span
          className="mono text-xs px-2.5 py-1 rounded-md"
          style={{
            background: tagBg,
            color: tagClr,
            border: `1px solid ${tagBdr}`,
          }}
        >
          v1.0.0
        </span>
      </div>
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero({ dark }: { dark: boolean }) {
  const h1Primary = dark ? "#f0f0f0" : "#111111";
  const h1Muted = dark ? "#333" : "#ccc";
  const chipBg = dark ? "#111" : "#f5f5f5";
  const chipBdr = dark ? "#1f1f1f" : "#e0e0e0";
  const chipClr = dark ? "#666" : "#999";
  const btnBg = dark ? "#f0f0f0" : "#111111";
  const btnClr = dark ? "#080808" : "#f0f0f0";
  const descClr = dark ? "#666" : "#888";

  return (
    <section className="pt-40 pb-16 px-6 text-center space-y-5 max-w-3xl mx-auto">
      <h1
        className="text-4xl font-semibold"
        style={{ color: h1Primary, letterSpacing: "-0.02em", lineHeight: 1.2 }}
      >
        Classify any log line
        <br />
        <span style={{ color: h1Muted }}>in under a millisecond.</span>
      </h1>

      <p
        className="text-sm max-w-md mx-auto leading-relaxed"
        style={{ color: descClr }}
      >
        Regex catches the obvious. ML handles the familiar. LLM covers the rest.
      </p>
      <a
        href="#classify"
        className="inline-flex items-center gap-2 mono text-xs px-4 py-2 rounded-lg"
        style={{ background: btnBg, color: btnClr }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        Try it now →
      </a>
    </section>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ dark }: { dark: boolean }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ClassifyResponse | null>(null);
  const [error, setError] = useState("");

  const handleClassify = useCallback(async () => {
    if (!text.trim() || status === "loading") return;
    setStatus("loading");
    setError("");
    try {
      const res = await classifyLog(text.trim());
      setResult(res);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Classification failed");
      setStatus("error");
    }
  }, [text, status]);

  const boxBg = dark ? "#0d0d0d" : "#fafafa";
  const boxBdr = dark ? "#1f1f1f" : "#e5e5e5";
  const barBdr = dark ? "#1a1a1a" : "#ebebeb";
  const textClr = dark ? "#f0f0f0" : "#111111";
  const labelClr = dark ? "#444" : "#aaa";
  const chipBg = dark ? "#141414" : "#f0f0f0";
  const chipClr = dark ? "#444" : "#aaa";
  const chipBdr = dark ? "#1f1f1f" : "#e0e0e0";
  const chipHClr = dark ? "#888" : "#555";
  const chipHBdr = dark ? "#2a2a2a" : "#ccc";
  const btnReady = text.trim() && status !== "loading";
  const btnBg = btnReady
    ? dark
      ? "#f0f0f0"
      : "#111111"
    : dark
      ? "#141414"
      : "#efefef";
  const btnClr = btnReady
    ? dark
      ? "#080808"
      : "#f0f0f0"
    : dark
      ? "#444"
      : "#bbb";

  return (
    <section id="classify" className="py-8 px-6 max-w-2xl mx-auto">
      <p
        className="mono text-xs mb-4"
        style={{ color: labelClr, letterSpacing: "0.1em" }}
      >
        CLASSIFIER
      </p>

      <div
        className="rounded-xl overflow-hidden"
        style={{ border: `1px solid ${boxBdr}`, background: boxBg }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleClassify();
          }}
          placeholder="Paste a log line..."
          rows={4}
          className="w-full bg-transparent mono text-sm resize-none outline-none px-4 pt-4 pb-2 placeholder:opacity-30"
          style={{ color: textClr, caretColor: "#6ee7b7" }}
        />

        {/* Bottom bar: chips left, button right — flex row, no wrap */}
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ borderTop: `1px solid ${barBdr}` }}
        >
          <div className="flex flex-wrap gap-1.5 flex-1 mr-3">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setText(ex)}
                className="mono text-xs px-2 py-1 rounded-md truncate max-w-[140px] transition-colors"
                style={{
                  background: chipBg,
                  color: chipClr,
                  border: `1px solid ${chipBdr}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = chipHClr;
                  e.currentTarget.style.borderColor = chipHBdr;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = chipClr;
                  e.currentTarget.style.borderColor = chipBdr;
                }}
              >
                {ex}
              </button>
            ))}
          </div>

          <button
            onClick={handleClassify}
            disabled={!btnReady}
            className="mono text-xs px-4 py-2 rounded-lg flex-shrink-0 transition-all"
            style={{
              background: btnBg,
              color: btnClr,
              cursor: btnReady ? "pointer" : "not-allowed",
              border: "1px solid transparent",
            }}
          >
            {status === "loading" ? "Running..." : "Classify ⌘↵"}
          </button>
        </div>
      </div>

      {status === "error" && (
        <div
          className="mt-3 mono text-xs px-3 py-2.5 rounded-lg"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#f87171",
          }}
        >
          {error}
        </div>
      )}

      {status === "loading" && (
        <div className="mt-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="mono text-xs" style={{ color: labelClr }}>
            Running pipeline...
          </span>
        </div>
      )}

      {status === "done" && result && (
        <ResultSheet
          result={result}
          onClose={() => {
            setStatus("idle");
            setResult(null);
          }}
          dark={dark}
        />
      )}
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────

function HowItWorks({ dark }: { dark: boolean }) {
  const labelClr = dark ? "#444" : "#aaa";
  const lineBg = dark ? "#1a1a1a" : "#e5e5e5";
  const numBg = dark ? "#0d0d0d" : "#f5f5f5";
  const numBdr = dark ? "#1a1a1a" : "#e0e0e0";
  const numClr = dark ? "#f0f0f0" : "#111";
  const tagBg = dark ? "#111" : "#f0f0f0";
  const tagBdr = dark ? "#1a1a1a" : "#e0e0e0";
  const tagClr = dark ? "#444" : "#aaa";
  const tierClr = dark ? "#f0f0f0" : "#111";
  const descClr = dark ? "#666" : "#888";

  const steps = [
    {
      tier: "Regex",
      desc: "Pattern-matched in microseconds. Deterministic, zero ML dependency.",
      time: "~0.01ms",
    },
    {
      tier: "TF-IDF + LR",
      desc: "Vectorized and scored. Returns if confidence ≥ 80%.",
      time: "~1ms",
    },
    {
      tier: "Groq LLM",
      desc: "Last resort. Semantic understanding for novel log formats.",
      time: "~400ms",
    },
  ];

  return (
    <section id="how-it-works" className="py-16 px-6 max-w-3xl mx-auto">
      <p
        className="mono text-xs mb-8"
        style={{ color: labelClr, letterSpacing: "0.1em" }}
      >
        HOW IT WORKS
      </p>
      <div className="relative">
        <div
          className="absolute top-3 bottom-3 w-px"
          style={{ left: "11px", background: lineBg }}
        />
        <div className="space-y-8">
          {steps.map(({ tier, desc, time }, i) => (
            <div key={tier} className="flex gap-5 items-start">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mono text-xs z-10"
                style={{
                  background: numBg,
                  border: `1px solid ${i === 0 ? "#2a2a2a" : numBdr}`,
                  color: i === 0 ? numClr : labelClr,
                }}
              >
                {i + 1}
              </div>
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center gap-3">
                  <span
                    className="mono text-sm font-medium"
                    style={{ color: tierClr }}
                  >
                    {tier}
                  </span>
                  <span
                    className="mono text-xs px-2 py-0.5 rounded"
                    style={{
                      background: tagBg,
                      color: tagClr,
                      border: `1px solid ${tagBdr}`,
                    }}
                  >
                    {time}
                  </span>
                </div>
                <p className="text-sm" style={{ color: descClr }}>
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Categories ────────────────────────────────────────────────────────────────

function Categories({ dark }: { dark: boolean }) {
  const labelClr = dark ? "#444" : "#aaa";
  const cardBg = dark ? "#0d0d0d" : "#fafafa";
  const cardBdr = dark ? "#1a1a1a" : "#e5e5e5";
  const exClr = dark ? "#444" : "#aaa";

  const cats: { key: LogCategory; examples: string[] }[] = [
    {
      key: "SECURITY_ALERT",
      examples: [
        "Multiple login failures",
        "Unauthorized access from IP",
        "Brute force detected",
      ],
    },
    {
      key: "RESOURCE_USAGE",
      examples: [
        "phys_ram=64172MB used_ram=512MB",
        "cpu_usage=94%",
        "disk_usage=89%",
      ],
    },
    {
      key: "WORKFLOW_ERROR",
      examples: [
        "Escalation rule failed ticket 9807",
        "Invalid priority level",
        "Process timeout",
      ],
    },
    {
      key: "SYSTEM_EVENT",
      examples: [
        "Service nginx started",
        "Backup completed",
        "Node joined cluster",
      ],
    },
  ];

  return (
    <section className="py-16 px-6 max-w-3xl mx-auto">
      <p
        className="mono text-xs mb-6"
        style={{ color: labelClr, letterSpacing: "0.1em" }}
      >
        CATEGORIES
      </p>
      <div className="grid grid-cols-2 gap-3">
        {cats.map(({ key, examples }) => {
          const meta = CATEGORY_META[key];
          return (
            <div
              key={key}
              className="rounded-xl p-4 space-y-3"
              style={{ background: cardBg, border: `1px solid ${cardBdr}` }}
            >
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                <span className={`mono text-xs font-medium ${meta.color}`}>
                  {meta.label}
                </span>
              </div>
              <ul className="space-y-1">
                {examples.map((ex) => (
                  <li
                    key={ex}
                    className="mono text-xs"
                    style={{ color: exClr }}
                  >
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer({ dark }: { dark: boolean }) {
  return (
    <footer
      className="px-6 py-10 text-center"
      style={{ borderTop: `1px solid ${dark ? "#111" : "#e5e5e5"}` }}
    >
      <p className="mono text-xs" style={{ color: dark ? "#333" : "#bbb" }}>
        Regex → TF-IDF + LR → Groq LLM · FastAPI + Next.js · Built for
        production
      </p>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const { dark, toggle } = useTheme();

  const bg = dark ? "#080808" : "#ffffff";

  return (
    <div
      style={{
        background: bg,
        minHeight: "100vh",
        transition: "background 0.2s",
      }}
    >
      <Navbar dark={dark} toggle={toggle} />
      <main>
        <Hero dark={dark} />
        <Dashboard dark={dark} />
        <HowItWorks dark={dark} />
        <Categories dark={dark} />
      </main>
      <Footer dark={dark} />
    </div>
  );
}
