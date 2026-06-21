"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, AppHeader, CtaButton } from "@/components/AppShell";
import { SavingsStats } from "@/components/history/SavingsStats";
import { TransactionList } from "@/components/history/TransactionList";
import { loadHistory } from "@/lib/history";
import type { TxRecord } from "@/components/history/TransactionItem";

export default function HistoryPage() {
  const router = useRouter();
  const [records, setRecords] = useState<TxRecord[]>([]);

  useEffect(() => {
    setRecords(loadHistory());
  }, []);

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 3_600_000;
  const recent = records.filter((r) => r.timestamp > thirtyDaysAgo);

  const totalSavings = recent.reduce((acc, r) => acc + r.savings, 0n);
  const swapCount = recent.length;

  return (
    <AppShell>
      <AppHeader
        title="Tu historial"
        right={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        }
      />

      <SavingsStats totalSavings={totalSavings} swapCount={swapCount} />
      <TransactionList transactions={recent} />

      <CtaButton onClick={() => router.push("/swap")} secondary>
        Hacer otro swap
      </CtaButton>
    </AppShell>
  );
}
