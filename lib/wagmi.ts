"use client";

import { createConfig, http } from "wagmi";
import { celo, celoAlfajores } from "wagmi/chains";
import { injected, metaMask } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [celo, celoAlfajores],
  connectors: [
    // metaMask() goes first so wagmi prefers it over other injected wallets
    // (Trust Wallet, Phantom, etc.) when both are present.
    metaMask(),
    injected({ shimDisconnect: true }),
  ],
  transports: {
    [celo.id]: http(),
    [celoAlfajores.id]: http(),
  },
});

