"use client";

import { useState } from "react";
import { ClassifierForm } from "@/components/ClassifierForm";
import { ResultCard } from "@/components/ResultCard";
import { ClassifyResponse } from "@/types/classifier";

export default function Home() {
  const [result, setResult]   = useState<ClassifyResponse | null>(null);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-2xl mx-auto px-4 py-16 space-y-10">

        {/* Header */}
        <div className="space-y-2">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            Hybrid Log Classifier
          </p>
          <h1 className="text-2xl font-mono font-semibold text-zinc-100">
            Regex → ML → LLM
          </h1>
          <p className="text-sm text-zinc-500 font-mono">
            3-tier classification pipeline. Fastest tier that&lt;s confident wins.
          </p>
        </div>

        {/* Input */}
        <ClassifierForm
          onResult={setResult}
          onError={setError}
          onLoading={setLoading}
        />

        {/* Error */}
        {error && (
          <p className="text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-md">
            {error}
          </p>
        )}

        {/* Loading */}
        {loading && (
          <p className="text-xs font-mono text-zinc-500 animate-pulse">
            Running pipeline...
          </p>
        )}

        {/* Result */}
        {result && !loading && (
          <ResultCard result={result} />
        )}
      </div>
    </main>
  );
}