"use client";

interface Props {
  children: React.ReactNode;
}

export function AppShell({ children }: Props) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--surface)",
        display: "flex",
        flexDirection: "column",
        maxWidth: 480,
        margin: "0 auto",
        padding: 16,
      }}
    >
      {children}
    </div>
  );
}

export function AppHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 4px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 700, color: "var(--text)" }}>
        <span
          style={{
            width: 28,
            height: 28,
            background: "linear-gradient(135deg, var(--primary), #34d399)",
            borderRadius: 8,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 14,
            fontWeight: 800,
          }}
        >
          F
        </span>
        {title}
      </div>
      {right && (
        <div
          style={{
            width: 32,
            height: 32,
            background: "var(--surface-2)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-2)",
            border: "1px solid var(--border)",
            cursor: "pointer",
          }}
        >
          {right}
        </div>
      )}
    </div>
  );
}

export function CtaButton({
  children,
  onClick,
  disabled,
  secondary,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        background: secondary
          ? "transparent"
          : disabled
          ? "var(--surface-2)"
          : "var(--primary)",
        color: secondary ? "var(--text-2)" : disabled ? "var(--text-3)" : "white",
        border: secondary ? "1px solid var(--border)" : "none",
        padding: 14,
        borderRadius: 14,
        fontSize: 15,
        fontWeight: 700,
        marginTop: secondary ? 8 : 12,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "var(--font-outfit), sans-serif",
        transition: "background 0.2s",
      }}
    >
      {children}
    </button>
  );
}
