const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("FXCOPRouter", function () {
  async function deployFixture() {
    const [owner, user, attacker] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdt = await MockERC20.deploy("Mock USDT", "USDT", 6);
    const copm = await MockERC20.deploy("Mock COPm", "COPM", 18);

    const MockRouter = await ethers.getContractFactory("MockRouter");
    const mockRouter = await MockRouter.deploy(await copm.getAddress());

    const FXCOPRouter = await ethers.getContractFactory("FXCOPRouter");
    const router = await FXCOPRouter.deploy(
      await mockRouter.getAddress(),
      await mockRouter.getAddress(),
      owner.address
    );

    const userUsdtAmount = ethers.parseUnits("1000", 6);
    await usdt.mint(user.address, userUsdtAmount);

    // MockRouter needs COPm to transfer to FXCOPRouter on each swap
    const routerCOPmAmount = ethers.parseUnits("10000000", 18);
    await copm.mint(await mockRouter.getAddress(), routerCOPmAmount);

    return { router, usdt, copm, mockRouter, owner, user, attacker };
  }

  // ── Deploy ──
  describe("deploy", function () {
    it("sets FEE_BPS to 5", async function () {
      const { router } = await loadFixture(deployFixture);
      expect(await router.FEE_BPS()).to.equal(5);
    });

    it("sets owner correctly", async function () {
      const { router, owner } = await loadFixture(deployFixture);
      expect(await router.owner()).to.equal(owner.address);
    });

    it("reverts with zero mento router address", async function () {
      const [owner] = await ethers.getSigners();
      const copm = await (await ethers.getContractFactory("MockERC20")).deploy("COPm", "COPM", 18);
      const mr = await (await ethers.getContractFactory("MockRouter")).deploy(await copm.getAddress());
      const FXCOPRouter = await ethers.getContractFactory("FXCOPRouter");
      await expect(
        FXCOPRouter.deploy(ethers.ZeroAddress, await mr.getAddress(), owner.address)
      ).to.be.revertedWith("FXCOPRouter: zero mento router");
    });
  });

  // ── Swap happy path ──
  describe("swap — happy path", function () {
    it("swaps 100% USDT, takes fee from COPm output, sends net COPm to user", async function () {
      const { router, usdt, copm, mockRouter, user } = await loadFixture(deployFixture);

      const amountIn = ethers.parseUnits("100", 6);
      const grossCOPm = ethers.parseUnits("420000", 18);
      await mockRouter.setAmountOut(grossCOPm);

      // Fee is 0.05% of gross COPm output
      const expectedFee = (grossCOPm * 5n) / 10_000n;
      const expectedNet = grossCOPm - expectedFee;

      const routeData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [amountIn]);
      const minAmountOut = (expectedNet * 9_900n) / 10_000n;
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await usdt.connect(user).approve(await router.getAddress(), amountIn);

      const tx = router.connect(user).swap(
        await usdt.getAddress(),
        amountIn,
        await copm.getAddress(),
        0,
        minAmountOut,
        deadline,
        routeData
      );

      // Event reports net COPm sent to user and fee in COPm
      await expect(tx)
        .to.emit(router, "SwapExecuted")
        .withArgs(user.address, amountIn, expectedNet, expectedFee, 0);

      // Fee accrued in COPm (output token), NOT in USDT
      expect(await router.accruedFees(await copm.getAddress())).to.equal(expectedFee);
      expect(await router.accruedFees(await usdt.getAddress())).to.equal(0n);

      // User received net COPm
      expect(await copm.balanceOf(user.address)).to.equal(expectedNet);

      // Router retained zero COPm (all distributed: net to user, fee tracked but not held here)
      // accruedFees tracks COPm owed to owner — it stays in the contract until withdrawal
      expect(await copm.balanceOf(await router.getAddress())).to.equal(expectedFee);
    });

    it("full USDT is consumed (no USDT fee deducted from input)", async function () {
      const { router, usdt, copm, mockRouter, user } = await loadFixture(deployFixture);

      const amountIn = ethers.parseUnits("100", 6);
      await mockRouter.setAmountOut(ethers.parseUnits("420000", 18));

      const routeData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [amountIn]);
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const userUsdtBefore = await usdt.balanceOf(user.address);
      await usdt.connect(user).approve(await router.getAddress(), amountIn);
      await router.connect(user).swap(
        await usdt.getAddress(), amountIn, await copm.getAddress(),
        0, 0, deadline, routeData
      );

      // Exactly amountIn USDT consumed — no partial fee residue
      expect(userUsdtBefore - await usdt.balanceOf(user.address)).to.equal(amountIn);
    });
  });

  // ── Slippage guard ──
  describe("swap — slippage guard", function () {
    it("reverts when net COPm < minAmountOut", async function () {
      const { router, usdt, copm, mockRouter, user } = await loadFixture(deployFixture);

      const amountIn = ethers.parseUnits("100", 6);
      const grossCOPm = ethers.parseUnits("400000", 18);
      await mockRouter.setAmountOut(grossCOPm);

      // Net would be ~399800 COPm; require 500000 → should revert
      const minAmountOut = ethers.parseUnits("500000", 18);
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const routeData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [amountIn]);

      await usdt.connect(user).approve(await router.getAddress(), amountIn);

      await expect(
        router.connect(user).swap(
          await usdt.getAddress(), amountIn, await copm.getAddress(),
          0, minAmountOut, deadline, routeData
        )
      ).to.be.revertedWithCustomError(router, "SlippageExceeded");
    });
  });

  // ── Deadline guard ──
  describe("swap — deadline guard", function () {
    it("reverts when block.timestamp > deadline", async function () {
      const { router, usdt, copm, user } = await loadFixture(deployFixture);

      const amountIn = ethers.parseUnits("100", 6);
      const expiredDeadline = 1;
      const routeData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [amountIn]);

      await usdt.connect(user).approve(await router.getAddress(), amountIn);

      await expect(
        router.connect(user).swap(
          await usdt.getAddress(), amountIn, await copm.getAddress(),
          0, 0, expiredDeadline, routeData
        )
      ).to.be.revertedWithCustomError(router, "DeadlineExpired");
    });
  });

  // ── withdrawFees ──
  describe("withdrawFees", function () {
    it("allows owner to withdraw accrued COPm fees", async function () {
      const { router, usdt, copm, mockRouter, owner, user } = await loadFixture(deployFixture);

      const amountIn = ethers.parseUnits("100", 6);
      const grossCOPm = ethers.parseUnits("420000", 18);
      const expectedFee = (grossCOPm * 5n) / 10_000n;
      await mockRouter.setAmountOut(grossCOPm);

      const routeData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [amountIn]);
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await usdt.connect(user).approve(await router.getAddress(), amountIn);
      await router.connect(user).swap(
        await usdt.getAddress(), amountIn, await copm.getAddress(),
        0, 0, deadline, routeData
      );

      // Withdraw COPm fees (not USDT)
      const ownerBefore = await copm.balanceOf(owner.address);
      await router.connect(owner).withdrawFees(await copm.getAddress(), owner.address);
      const ownerAfter = await copm.balanceOf(owner.address);

      expect(ownerAfter - ownerBefore).to.equal(expectedFee);
      expect(await router.accruedFees(await copm.getAddress())).to.equal(0);
    });

    it("reverts when non-owner calls withdrawFees", async function () {
      const { router, copm, attacker } = await loadFixture(deployFixture);
      await expect(
        router.connect(attacker).withdrawFees(await copm.getAddress(), attacker.address)
      ).to.be.revertedWithCustomError(router, "OwnableUnauthorizedAccount");
    });

    it("reverts when no fees to withdraw", async function () {
      const { router, copm, owner } = await loadFixture(deployFixture);
      await expect(
        router.connect(owner).withdrawFees(await copm.getAddress(), owner.address)
      ).to.be.revertedWithCustomError(router, "NoFeesToWithdraw");
    });
  });
});
