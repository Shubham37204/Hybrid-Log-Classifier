import { ClassifyResponse } from "@/types/classifier";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function classifyLog(text: string): Promise<ClassifyResponse> {
  const res = await fetch(`${BASE}/api/v1/classify`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}