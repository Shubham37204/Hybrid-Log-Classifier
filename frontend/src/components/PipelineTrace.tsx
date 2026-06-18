import { ClassifierTier } from "@/types/classifier";

const TIERS: ClassifierTier[] = ["regex", "ml", "llm"];

const TIER_LABEL: Record<ClassifierTier, string> = {
  regex: "Regex",
  ml:    "TF-IDF + LR",
  llm:   "Groq LLM",
};

interface PipelineTraceProps {
  used: ClassifierTier;
  dark: boolean;
}

export function PipelineTrace({ used, dark }: PipelineTraceProps) {
  const usedIdx  = TIERS.indexOf(used);
  const rowBg    = dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
  const rowBdr   = dark ? "#1f1f1f" : "#e5e5e5";
  const mutedClr = dark ? "#444"    : "#bbb";
  const dimClr   = dark ? "#2a2a2a" : "#ddd";

  return (
    <div className="space-y-1.5">
      {TIERS.map((tier, i) => {
        const isUsed   = tier === used;
        const isPassed = i < usedIdx;

        return (
          <div
            key={tier}
            className="flex items-center justify-between px-3 py-2 rounded-lg"
            style={{ background: rowBg, border: `1px solid ${rowBdr}` }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isUsed ? "bg-emerald-400" : isPassed ? "bg-zinc-600" : "bg-zinc-800"
                }`}
              />
              <span className="mono text-xs" style={{ color: isUsed ? (dark ? "#f0f0f0" : "#111") : mutedClr }}>
                {TIER_LABEL[tier]}
              </span>
            </div>
            <span
              className="mono text-xs"
              style={{ color: isUsed ? "#6ee7b7" : isPassed ? mutedClr : dimClr }}
            >
              {isUsed
                ? tier === "llm" ? "fallback" : "matched"
                : isPassed ? "passed →" : "skipped"}
            </span>
          </div>
        );
      })}
    </div>
  );
}