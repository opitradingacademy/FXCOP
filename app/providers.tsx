"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId, useConfig } from "wagmi";
import { reconnect } from "wagmi/actions";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 2 },
        },
      })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <NetworkWatcher />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

/**
 * Forces wagmi to re-read chainId + account state when the wallet
 * fires chainChanged / accountsChanged events. Without this, wagmi
 * can stay stale on the initial value if the wallet wasn't ready
 * when the app mounted.
 */
function NetworkWatcher() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const config = useConfig();
  const [tick, setTick] = useState(0);

  // On mount: try to reconnect to restore prior session state.
  useEffect(() => {
    reconnect(config).catch(() => {
      // Ignore — user might not have a prior session.
    });
  }, [config]);

  // Listen for chainChanged / accountsChanged at the raw ethereum level
  // and force a re-render so wagmi re-reads the chainId.
  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (!ethereum?.on) return;

    const handleChange = () => setTick((t) => t + 1);

    ethereum.on("chainChanged", handleChange);
    ethereum.on("accountsChanged", handleChange);

    return () => {
      ethereum.removeListener?.("chainChanged", handleChange);
      ethereum.removeListener?.("accountsChanged", handleChange);
    };
  }, []);

  // Surface the current chainId in console for debugging.
  useEffect(() => {
    if (isConnected) {
      console.log("[FXCOP] chainId =", chainId);
    }
  }, [chainId, isConnected, tick]);

  return null;
}
