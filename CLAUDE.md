# FXCOP — Mini App MiniPay (Celo L2)

Mini app para **comprar COPm (peso colombiano digital) con USDT en 1 tap**, dentro de MiniPay.

v1 usa Mento SDK directo. Sin router propio, sin fee. Decisión validada en sesión del 22-jun-2026: el modelo "skyscanner con fee" requería liquidez propia que no teníamos.

---

## Estado actual (jun 2026)

- ✅ App funciona: input USDT → quote COPm en vivo → swap directo vía Mento SDK
- ✅ Hard guard contra mainnet: el botón "Comprar COPm" solo se habilita en testnet
- ✅ MiniPay invariants: `feeCurrency: USDT_FEE_ADAPTER`, legacy `gasPrice` only, no personal_sign
- ✅ Build verde, typecheck verde, deploy en Vercel desde `master`
- ✅ ChainId detection resuelto: badge muestra el chainId real del wallet, no el cacheado de wagmi
- ⏸ **Pendiente end-to-end test**: usuario tiene 6.99 CELO en Celo Sepolia pero 0 USDT. Necesita faucet de USDT testnet antes de probar swap real.

---

## Arquitectura v1

```
User → MiniPay/Metamask
  → wagmi (useAccount, useConnect, useChainId)
    → useQuotes(amountIn, chainId)        ← Mento.getAmountOut, refetch 5s
    → useSwap()                            ← Mento.buildSwapTransaction (approval + swap)
      → Mento SDK (resuelve multi-hop USDT→USDm→COPm on-chain)
        → Mento FPMM Router / Broker
          → Usuario recibe COPm
```

**No hay:**
- Router propio (`FXCOPRouter.sol` borrado en el pivote)
- Fee (0.05% eliminado)
- Aggregador multi-ruta (Mento directo)
- Storage local, historial, export — todo lo que requería UI compleja se borró

---

## Estructura

```
fxcop-app/
├── lib/
│   ├── decimals.ts        ← Fuente única de conversiones USDT(6) ↔ COPm(18)
│   ├── contracts.ts       ← addresses mainnet + testnet, isCeloTestnet()
│   ├── wagmi.ts           ← metaMask() first, injected() second
│   └── quotes/
│       ├── types.ts       ← Quote { amountOut, amountOutExpected, ... }
│       └── mentoQuoter.ts ← Mento.create(chainId) + getAmountOut
├── hooks/
│   ├── useWallet.ts       ← auto-connect (MetaMask or injected), 5s balance timeout
│   ├── useQuotes.ts       ← react-query, refetchInterval 5s
│   └── useSwap.ts         ← Mento.buildSwapTransaction, MiniPay invariants
├── components/
│   ├── AppShell.tsx       ← layout + AppHeader + CtaButton
│   └── swap/
│       └── SwapInputCard.tsx
└── app/
    ├── layout.tsx
    ├── providers.tsx      ← WagmiProvider + QueryClientProvider
    ├── page.tsx           ← redirect → /swap
    └── swap/page.tsx      ← pantalla única (input USDT, output COPm, CTA)
```

---

## Decisiones arquitectónicas

- **Sin router propio.** Mento SDK resuelve la ruta multi-hop (USDT→USDm→COPm) y maneja el approval. No tiene sentido duplicar eso.
- **Sin fee en v1.** El modelo de negocio se valida primero con volumen. Fee propio vuelve en v2 si hay tracción.
- **Mento SDK directo.** `Mento.create(chainId)` + `quotes.getAmountOut` + `swap.buildSwapTransaction`. La última devuelve `{ approval, swap: { params, amountOutMin, expectedAmountOut } }` en una llamada.
- **Single screen.** La app es una pantalla: input USDT, output COPm, botón. Sin confirm screen, sin history page, sin splash. Se agrega cuando haya tracción.
- **Hard guard de testnet.** `canSwap` requiere `isTestnet === true`. Mainnet bloqueado en runtime + UI. Se desbloquea solo con decisión explícita.
- **Celopedia-skill SIEMPRE** para specs, addresses, contexto del ecosistema.

---

## Contratos verificados

```
MAINNET (Celo 42220)
  USDT:                0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e  (6 dec)
  USDT_FEE_ADAPTER:    0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72  ← siempre este
  USDm:                0x765DE816845861e75A25fCA122bb6898B8B1282a  (18 dec)
  COPm:                0x8A567e2aE79CA692Bd748aB832081C45de4041eA  (18 dec)

TESTNET (Celo Sepolia 11142220)  ← post L2 migration, no es 44787
  USDT:                0xd077A400968890Eacc75cdc901F0356c943e4fDb  (6 dec)
  USDT_FEE_ADAPTER:    0xd077A400968890Eacc75cdc901F0356c943e4fDb  ⚠ placeholder, verificar
  USDm:                0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80  (18 dec)
  COPm:                0x5F8d55c3627d2dc0a2B4afa798f877242F382F67  (18 dec)
```

> ⚠ El USDT_FEE_ADAPTER de testnet es un placeholder heredado del pivote. Antes de probar end-to-end, verificar contra docs.celo.org.

---

## Issues abiertos

### ✅ RESUELTO: chainId mismatch (era wagmi stale)
**Síntoma**: el usuario está en MiniPay/Chrome con "Celo Sepolia" seleccionada en la wallet, pero la app mostraba `chainId 42220` (mainnet) en el badge.
**Causa raíz**: wagmi v2 `useChainId()` devolvía el valor inicial cacheado y no se actualizaba al disparar `chainChanged`. La wallet SÍ estaba en 11142220 (`window.ethereum.request({method: 'eth_chainId'})` devolvía `0xaa044c`).
**Fix**: nuevo hook `useRealChainId` en `hooks/useRealChainId.ts` que lee `window.ethereum.chainId` directamente y escucha `chainChanged`. Toda la app (`app/swap/page.tsx`, `useSwap`, `useQuotes`) usa este hook en vez de `useChainId()` de wagmi.
**Status**: Resuelto 22-jun-2026. Usuario confirmó badge verde "Celo Sepolia (chainId 11142220)" y botón habilitado.

### 🟡 MiniPay no implementa `wallet_switchEthereumChain`
- `wallet_switchEthereumChain` es silenciosamente ignorado (no error, no dialog)
- `wallet_addEthereumChain` también
- El badge rojo "Toca para cambiar a Celo Sepolia" no hace nada en MiniPay
- Workaround: el usuario tiene que cambiar la red manualmente desde la UI de MiniPay

### 🟡 MiniPay "Usar red de prueba" toggle no cambia la red
- El toggle solo desbloquea el uso de testnet
- La red activa sigue siendo mainnet a menos que el usuario la cambie manualmente
- Documentado en el comment del código y en el badge de red

### 🟡 Multi-injected wallets (Trust Wallet + MetaMask)
- Trust Wallet se inyecta antes que MetaMask y a veces intercepta las llamadas
- `lib/wagmi.ts` ya tiene `metaMask()` primero en la lista de connectors
- `useWallet` y el CTA chequean `window.ethereum.isMetaMask` y usan el connector correcto
- En entornos muy sucios, abrir ventana de incógnito con solo MetaMask es más seguro

### 🟢 Legacy Alfajores 44787
- Algunas wallets (y posiblemente versiones viejas de wagmi) reportan 44787
- `isCeloTestnet()` acepta ambos, badge muestra naranja "legacy" para 44787
- Si wagmi devuelve 44787, los contratos en Mento SDK probablemente no van a matchear (Mento está deployado en Sepolia 11142220)

### 🟡 Falta USDT testnet para probar end-to-end
- Usuario tiene 6.99 CELO en Celo Sepolia pero 0 USDT
- CELO no se usa en este flow (solo USDT)
- Pendiente: pedir USDT en Discord `#testnet-faucet` o Google Cloud faucet
- Una vez con USDT, swap 0.10 USDT → verificar COPm recibido en wallet

---

## Próximos pasos

1. **Pedir USDT testnet** en Discord `#testnet-faucet` o https://cloud.google.com/application/web3/faucet/celo/sepolia
2. **End-to-end test en Celo Sepolia**: swap 0.10 USDT, verificar COPm recibido en wallet
3. **Decidir mainnet**: requiere liquidez USDT→USDm validada (en el pivote falló con "no valid median")
4. **Productos sobre COPm**: yield, P2P payments, remittances — basado en tracción, no antes
5. **UI polish**: copy, error states, loading states con mensajes claros

---

## Reglas MiniPay (OBLIGATORIAS)

- Solo USDT / USDC / USDm en UI. **NUNCA mostrar CELO.**
- **Legacy tx only:** siempre `gasPrice`, nunca `maxFeePerGas`/`maxPriorityFeePerGas`.
- No `personal_sign` ni `eth_signTypedData`. Solo `approve` + `writeContract`/`sendTransaction`.
- **`feeCurrency: "0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72"`** en TODA tx.
- **UI copy obligatorio**: "Network fee", "Deposit", "Stablecoin" (nunca "Gas fee", "Onramp", "Crypto")
- Identificar usuario por número de teléfono, no por `0x...` address.
- Bundle < 2MB. Mobile-first. Test en 360×640.
- No `navigator.geolocation` en iOS MiniPay.

---

## Patrones de código obligatorios

```typescript
// Toda tx (approve Y swap)
await walletClient.sendTransaction({
  ...params,
  feeCurrency: "0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72",
  gasPrice: await publicClient.getGasPrice(),
  // NUNCA: maxFeePerGas, maxPriorityFeePerGas
});

// Quote con Mento SDK
const mento = await Mento.create(chainId);
const amountOut = await mento.quotes.getAmountOut(USDT, COPM, amountIn);

// Swap con Mento SDK (approval + params en una llamada)
const { approval, swap } = await mento.swap.buildSwapTransaction(
  USDT, COPM, amountIn, recipient, owner,
  { slippageTolerance: 0.5, deadline: deadlineFromMinutes(30) }
);
if (approval) await walletClient.sendTransaction({ ...approval, feeCurrency, gasPrice });
await walletClient.sendTransaction({ ...swap.params, feeCurrency, gasPrice });
```

---

## Testing

```bash
cd fxcop-app
npm run dev       # localhost:3000
```

**No hay tests automatizados en v1** (vitest, hardhat tests, etc. fueron borrados en el pivote). Validación es manual end-to-end.

Para probar en device físico:
```bash
ngrok http 3000
# En MiniPay: Settings > About > tap versión 7 veces > Developer Mode
# "Load Test Page" → URL ngrok HTTPS
```

---

## Modelo de negocio (revisar post-tracción)

- **v1**: sin fee. Validar uso y volumen.
- **v2**: fee 0.05% sobre output (modelo original del pivote). Requiere liquidez propia o market making.
- **v3+**: tiers (Free / Pro / Power) — modelo del CLAUDE.md viejo, no implementado.

---

## Historial del pivote (jun 2026)

| Commit | Qué cambió |
|--------|-----------|
| `1dcff00` | chore: drop router-aggregator pivot, simplify to Mento-direct |
| `49206a2` | feat: Mento-direct USDT→COPm swap in MiniPay |
| `d99c880` | fix(swap): hard-guard against mainnet swaps, show chainId always |
| `0b658ad` | feat(swap): tap-to-switch to Alfajores from mainnet badge |
| `b863630` | fix(contracts): use Celo Sepolia chainId 11142220 (wagmi v2 + L2) |
| `91d0c94` | fix(swap): show explicit error when wallet_switchEthereumChain fails |
| `47eab6f` | fix(wallet): auto-connect in browser + make Connect button work |
| `e0620b6` | fix(wallet): prefer MetaMask over other injected wallets |
| `3c68aa6` | fix(swap): accept legacy Alfajores chainId 44787 as testnet |
| `bf2960a` | docs: rewrite CLAUDE.md to reflect post-pivot architecture |
| `b574a58` | fix(wallet): force wagmi to re-read chainId on chainChanged |
| `a4f2645` | fix(wallet): use direct window.ethereum.chainId instead of stale wagmi (RESUELVE BLOCKER) |
