const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

// Mainnet (42220)
const MAINNET = {
  mentoRouter: "0x4861840C2EfB2b98312B0aE34d86fD73E8f9B6f6",
  ubeswapRouter: "0x3C255DED9B25f0BFB4EF1D14234BD2514d7A7A0d",
};

// Testnet Alfajores (44787) — usando los mismos routers si están disponibles,
// de lo contrario placeholders que el deployer puede sobreescribir con --parameters
const TESTNET = {
  mentoRouter: "0x4861840C2EfB2b98312B0aE34d86fD73E8f9B6f6",
  ubeswapRouter: "0x3C255DED9B25f0BFB4EF1D14234BD2514d7A7A0d",
};

module.exports = buildModule("FXCOPRouterModule", (m) => {
  // Allow overrides via --parameters flag (e.g. npx hardhat ignition deploy ... --parameters '{"mentoRouter":"0x..."}')
  const mentoRouter = m.getParameter("mentoRouter", TESTNET.mentoRouter);
  const ubeswapRouter = m.getParameter("ubeswapRouter", TESTNET.ubeswapRouter);
  // owner defaults to deployer wallet; override with --parameters '{"owner":"0x..."}'
  const owner = m.getParameter("owner", m.getAccount(0));

  const router = m.contract("FXCOPRouter", [mentoRouter, ubeswapRouter, owner]);

  return { router };
});
