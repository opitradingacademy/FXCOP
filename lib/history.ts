import type { TxRecord } from "@/components/history/TransactionItem";

const KEY = "fxcop:history";

export function loadHistory(): TxRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<{
      txHash: string;
      amountOut: string;
      savings: string;
      timestamp: number;
    }>;
    return parsed.map((r) => ({
      txHash: r.txHash as `0x${string}`,
      amountOut: BigInt(r.amountOut),
      savings: BigInt(r.savings),
      timestamp: r.timestamp,
    }));
  } catch {
    return [];
  }
}

export function saveToHistory(record: TxRecord): void {
  if (typeof window === "undefined") return;
  const existing = loadHistory();
  const updated = [record, ...existing].slice(0, 50);
  const serializable = updated.map((r) => ({
    txHash: r.txHash,
    amountOut: r.amountOut.toString(),
    savings: r.savings.toString(),
    timestamp: r.timestamp,
  }));
  localStorage.setItem(KEY, JSON.stringify(serializable));
}
