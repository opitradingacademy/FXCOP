"use client";

import { TransactionItem, type TxRecord } from "./TransactionItem";

interface Props {
  transactions: TxRecord[];
}

export function TransactionList({ transactions }: Props) {
  if (transactions.length === 0) {
    return (
      <div
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 24,
          textAlign: "center",
          color: "var(--text-3)",
          fontSize: 13,
        }}
      >
        Todavía no hiciste ningún swap. ¡Probá ahora!
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: "var(--text-3)",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 10,
          paddingLeft: 4,
        }}
      >
        Actividad reciente
      </div>
      {transactions.map((tx) => (
        <TransactionItem key={tx.txHash} tx={tx} />
      ))}
    </div>
  );
}
