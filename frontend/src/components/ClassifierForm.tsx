"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { classifyLog } from "@/lib/api";
import { ClassifyResponse } from "@/types/classifier";

const EXAMPLES = [
  "Multiple login failures for user 9052",
  "phys_ram=64172MB used_ram=512MB phys_disk=15GB",
  "Escalation rule execution failed for ticket 9807",
  "Service nginx started successfully on host prod-01",
];

interface ClassifierFormProps {
  onResult: (result: ClassifyResponse) => void;
  onError: (msg: string) => void;
  onLoading: (loading: boolean) => void;
}

export function ClassifierForm({ onResult, onError, onLoading }: ClassifierFormProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!text.trim()) return;
    setLoading(true);
    onLoading(true);
    onError("");
    try {
      const result = await classifyLog(text.trim());
      onResult(result);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Classification failed");
    } finally {
      setLoading(false);
      onLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste a log line..."
        className="font-mono text-sm bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 resize-none h-28 focus-visible:ring-zinc-600"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
        }}
      />

      {/* Example chips */}
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setText(ex)}
            className="text-xs font-mono text-zinc-500 hover:text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 px-2.5 py-1 rounded-md transition-colors truncate max-w-[200px]"
          >
            {ex}
          </button>
        ))}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading || !text.trim()}
        className="w-full font-mono bg-zinc-100 text-zinc-900 hover:bg-zinc-200 disabled:opacity-30"
      >
        {loading ? "Classifying..." : "Classify  ⌘↵"}
      </Button>
    </div>
  );
}