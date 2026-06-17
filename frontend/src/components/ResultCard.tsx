import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CategoryBadge } from "@/components/ui/Badge";
import { PipelineTrace } from "@/components/PipelineTrace";
import { ClassifyResponse } from "@/types/classifier";

interface ResultCardProps {
  result: ClassifyResponse;
}

const tierLabel: Record<string, string> = {
  regex: "Regex",
  ml:    "TF-IDF + Logistic Regression",
  llm:   "Groq LLM",
};

export function ResultCard({ result }: ResultCardProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-mono text-zinc-400 font-normal">
          Classification Result
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Category */}
        <div className="space-y-1.5">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            Category
          </p>
          <CategoryBadge category={result.category} className="text-sm px-3 py-1" />
        </div>

        <Separator className="bg-zinc-800" />

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
              Confidence
            </p>
            <p className="text-lg font-mono text-zinc-100">
              {(result.confidence * 100).toFixed(0)}
              <span className="text-xs text-zinc-500">%</span>
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
              Tier
            </p>
            <p className="text-sm font-mono text-zinc-100">
              {tierLabel[result.classifier_used]}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
              Latency
            </p>
            <p className="text-lg font-mono text-zinc-100">
              {result.latency_ms < 1
                ? `${(result.latency_ms * 1000).toFixed(2)}µs`
                : `${result.latency_ms.toFixed(2)}ms`}
            </p>
          </div>
        </div>

        {/* Matched pattern — only regex */}
        {result.matched_pattern && (
          <>
            <Separator className="bg-zinc-800" />
            <div className="space-y-1.5">
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                Matched Pattern
              </p>
              <code className="text-xs font-mono text-emerald-400 bg-zinc-950 px-2.5 py-1.5 rounded-md block break-all">
                {result.matched_pattern}
              </code>
            </div>
          </>
        )}

        <Separator className="bg-zinc-800" />

        {/* Pipeline trace */}
        <PipelineTrace result={result} />
      </CardContent>
    </Card>
  );
}
