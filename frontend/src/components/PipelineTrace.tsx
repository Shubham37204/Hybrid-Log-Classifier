import { ClassifierTier, ClassifyResponse, TierTrace } from "@/types/classifier";
import { cn } from "@/lib/utils";

const TIERS: ClassifierTier[] = ["regex", "ml", "llm"];

const tierLabel: Record<ClassifierTier, string> = {
  regex: "Regex",
  ml:    "TF-IDF + LR",
  llm:   "Groq LLM",
};

function buildTrace(result: ClassifyResponse): TierTrace[] {
  const used = result.classifier_used;
  return TIERS.map((tier) => {
    if (tier === used) {
      return {
        tier,
        status: tier === "llm" ? "fallback" : "matched",
      };
    }
    const tierIndex = TIERS.indexOf(tier);
    const usedIndex = TIERS.indexOf(used);
    return {
      tier,
      status: tierIndex < usedIndex ? "escalated" : "skipped",
    };
  });
}

const statusConfig = {
  matched:  { dot: "bg-emerald-400", label: "matched",  text: "text-emerald-400" },
  fallback: { dot: "bg-amber-400",   label: "fallback", text: "text-amber-400"   },
  escalated:{ dot: "bg-zinc-600",    label: "passed",   text: "text-zinc-500"    },
  skipped:  { dot: "bg-zinc-700",    label: "skipped",  text: "text-zinc-600"    },
};

interface PipelineTraceProps {
  result: ClassifyResponse;
}

export function PipelineTrace({ result }: PipelineTraceProps) {
  const trace = buildTrace(result);

  return (
    <div className="space-y-1">
      <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">
        Pipeline Trace
      </p>
      {trace.map(({ tier, status }) => {
        const cfg = statusConfig[status];
        return (
          <div
            key={tier}
            className="flex items-center justify-between py-2 px-3 rounded-md bg-zinc-900 border border-zinc-800"
          >
            <div className="flex items-center gap-2.5">
              <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
              <span className="text-xs font-mono text-zinc-300">
                {tierLabel[tier]}
              </span>
            </div>
            <span className={cn("text-xs font-mono", cfg.text)}>
              {cfg.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
