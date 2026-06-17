import { ClassifyResponse } from "@/types/classifier";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function classifyLog(text: string): Promise<ClassifyResponse> {
  const res = await fetch(`${API_URL}/api/v1/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.detail ?? `Request failed: ${res.status}`);
  }

  return res.json();
}
