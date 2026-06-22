"use client";

import { useEffect, useState } from "react";
import { useConfig } from "wagmi";
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
        <WagmiReconnect />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

/**
 * Restores prior wagmi session on mount. Without this, wagmi stays
 * disconnected and the chainId reads undefined until the user
 * manually connects. re-mounts the session if a wallet was previously
 * authorized.
 */
function WagmiReconnect() {
  const config = useConfig();

  useEffect(() => {
    reconnect(config).catch(() => {
      // No prior session — that's fine.
    });
  }, [config]);

  return null;
}
