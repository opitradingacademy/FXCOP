/**
 * E2E smoke test — Alfajores (Celo Sepolia 44787)
 *
 * Verifica que el contrato deployado en Alfajores tenga la configuración correcta:
 *   - FEE_BPS === 5 (0.05%)
 *   - mentoRouter === dirección esperada
 *   - ubeswapRouter === dirección esperada
 *   - owner === cuenta del deployer
 *   - computeFee devuelve el valor correcto
 *   - withdrawFees revierte si no hay fees acumuladas
 *   - accruedFees inicial === 0 para USDT y COPm
 *
 * Uso:
 *   FXCOP_ROUTER=0x<address> npx hardhat test test/FXCOPRouter.smoke.cjs --network celoSepolia
 *
 * Si FXCOP_ROUTER no está seteada, el test se skipea con un mensaje claro.
 */

const { expect } = require("chai");
const hre = require("hardhat");

// Alfajores contract addresses (PR-1 / CLAUDE.md)
const COPM_TESTNET = "0x5F8d55c3627d2dc0a2B4afa798f877242F382F67";
const USDT_TESTNET = "0xd077A400968890Eacc75cdc901F0356c943e4fDb";
const MENTO_ROUTER = "0x4861840C2EfB2b98312B0aE34d86fD73E8f9B6f6";
const UBESWAP_ROUTER = "0x3C255DED9B25f0BFB4EF1D14234BD2514d7A7A0d";

describe("FXCOPRouter — E2E smoke (Alfajores)", function () {
  // Alfajores RPC can be slow
  this.timeout(60_000);

  let router;
  let deployer;

  before(async function () {
    const routerAddress = process.env.FXCOP_ROUTER;
    if (!routerAddress) {
      console.log(
        "\n  ⚠  FXCOP_ROUTER env var not set — skipping smoke tests.\n" +
          "     Deploy first: npx hardhat ignition deploy ignition/modules/FXCOPRouter.js --network celoSepolia\n" +
          "     Then re-run:  FXCOP_ROUTER=0x... npx hardhat test test/FXCOPRouter.smoke.cjs --network celoSepolia\n"
      );
      this.skip();
    }

    [deployer] = await hre.ethers.getSigners();
    router = await hre.ethers.getContractAt("FXCOPRouter", routerAddress);
  });

  it("FEE_BPS is 5 (0.05%)", async function () {
    expect(await router.FEE_BPS()).to.equal(5n);
  });

  it("mentoRouter matches expected address", async function () {
    expect((await router.mentoRouter()).toLowerCase()).to.equal(
      MENTO_ROUTER.toLowerCase()
    );
  });

  it("ubeswapRouter matches expected address", async function () {
    expect((await router.ubeswapRouter()).toLowerCase()).to.equal(
      UBESWAP_ROUTER.toLowerCase()
    );
  });

  it("owner is deployer", async function () {
    expect((await router.owner()).toLowerCase()).to.equal(
      deployer.address.toLowerCase()
    );
  });

  it("computeFee(1_000_000_000_000_000_000) === 500_000_000_000_000", async function () {
    // 1 COPm (18 dec) → fee = 0.05% = 5e14
    const gross = hre.ethers.parseUnits("1", 18);
    const fee = await router.computeFee(gross);
    expect(fee).to.equal(500_000_000_000_000n);
  });

  it("computeFee(0) === 0", async function () {
    expect(await router.computeFee(0n)).to.equal(0n);
  });

  it("accruedFees for COPm starts at 0", async function () {
    expect(await router.accruedFees(COPM_TESTNET)).to.equal(0n);
  });

  it("accruedFees for USDT starts at 0", async function () {
    expect(await router.accruedFees(USDT_TESTNET)).to.equal(0n);
  });

  it("withdrawFees reverts with NoFeesToWithdraw when balance is 0", async function () {
    await expect(
      router.withdrawFees(COPM_TESTNET, deployer.address)
    ).to.be.revertedWithCustomError(router, "NoFeesToWithdraw");
  });
});
