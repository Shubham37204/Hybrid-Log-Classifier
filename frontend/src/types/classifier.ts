export type LogCategory =
  | "SECURITY_ALERT"
  | "RESOURCE_USAGE"
  | "WORKFLOW_ERROR"
  | "SYSTEM_EVENT"
  | "UNKNOWN";

export type ClassifierTier = "regex" | "ml" | "llm";

export interface ClassifyResponse {
  category: LogCategory;
  confidence: number;
  classifier_used: ClassifierTier;
  matched_pattern: string | null;
  latency_ms: number;
}

export interface TierTrace {
  tier: ClassifierTier;
  status: "matched" | "skipped" | "escalated" | "fallback";
}
