// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title FXCOPRouter
/// @notice Minimal fee-retaining swap router for FXCOP MiniPay.
///         Wraps Mento Router V3 or Ubeswap Universal Router, charges 0.05% fee,
///         and delegates the net amount to the selected route.
///
/// Security properties:
/// - NOT upgradeable. Immutability = trust for USDT approve.
/// - ReentrancyGuard on swap() — calls external routers and transfers tokens.
/// - Ownable — only owner can withdraw accrued fees.
/// - SafeERC20 — handles non-standard ERC20 returns (USDT).
///
/// Route types:
///   0 = Mento FPMM Router V3
///   1 = Ubeswap V3 Universal Router
contract FXCOPRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    /// @notice Protocol fee in basis points. 5 bps = 0.05%.
    uint16 public constant FEE_BPS = 5;

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @notice Mento Router V3 address.
    address public immutable mentoRouter;

    /// @notice Ubeswap Universal Router address.
    address public immutable ubeswapRouter;

    /// @notice Accrued protocol fees per token. token => amount
    mapping(address => uint256) public accruedFees;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /// @notice Emitted on every successful swap.
    /// @param user       Address of the user who initiated the swap.
    /// @param amountIn   Total USDT input (100% swapped, no fee deducted from input).
    /// @param amountOut  Net COPm received by the user (after protocol fee).
    /// @param fee        Protocol fee retained in COPm (output token).
    /// @param routeType  0 = Mento, 1 = Ubeswap.
    event SwapExecuted(
        address indexed user,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee,
        uint8 routeType
    );

    /// @notice Emitted when owner withdraws accumulated fees.
    /// @param to     Recipient of the fees.
    /// @param token  Token withdrawn.
    /// @param amount Amount withdrawn.
    event FeesWithdrawn(address indexed to, address indexed token, uint256 amount);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error DeadlineExpired(uint256 deadline, uint256 current);
    error SlippageExceeded(uint256 amountOut, uint256 minAmountOut);
    error UnsupportedRouteType(uint8 routeType);
    error NoFeesToWithdraw(address token);

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /// @param _mentoRouter   Address of Mento Router V3.
    /// @param _ubeswapRouter Address of Ubeswap Universal Router.
    /// @param _owner         Initial owner (deployer / multisig).
    constructor(
        address _mentoRouter,
        address _ubeswapRouter,
        address _owner
    ) Ownable(_owner) {
        require(_mentoRouter != address(0), "FXCOPRouter: zero mento router");
        require(_ubeswapRouter != address(0), "FXCOPRouter: zero ube router");
        mentoRouter = _mentoRouter;
        ubeswapRouter = _ubeswapRouter;
    }

    // -------------------------------------------------------------------------
    // Core
    // -------------------------------------------------------------------------

    /// @notice Execute a swap through the selected route. Fee is taken from the output token (COPm).
    /// @param tokenIn      Input token address (USDT).
    /// @param amountIn     Raw input amount (e.g. 100_000_000 for 100 USDT). Swapped in full.
    /// @param tokenOut     Output token address (COPm). Fee is accrued here.
    /// @param routeType    0 = Mento FPMM, 1 = Ubeswap V3.
    /// @param minAmountOut Minimum net COPm the user must receive (after fee); reverts if not met.
    /// @param deadline     Unix timestamp; reverts if block.timestamp > deadline.
    /// @param routeData    ABI-encoded calldata to pass to the selected router.
    ///                     The encoded recipient MUST be address(this) so COPm lands here.
    /// @return amountOut   Net COPm sent to the user (after protocol fee).
    function swap(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint8 routeType,
        uint256 minAmountOut,
        uint256 deadline,
        bytes calldata routeData
    ) external nonReentrant returns (uint256 amountOut) {
        if (block.timestamp > deadline) revert DeadlineExpired(deadline, block.timestamp);
        if (routeType > 1) revert UnsupportedRouteType(routeType);

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 grossAmountOut = _executeSwap(tokenIn, amountIn, tokenOut, routeType, routeData);

        uint256 fee = (grossAmountOut * FEE_BPS) / 10_000;
        accruedFees[tokenOut] += fee;
        amountOut = grossAmountOut - fee;

        if (amountOut < minAmountOut) revert SlippageExceeded(amountOut, minAmountOut);

        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        emit SwapExecuted(msg.sender, amountIn, amountOut, fee, routeType);
    }

    /// @dev Calls the selected router and returns the gross COPm received.
    function _executeSwap(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint8 routeType,
        bytes calldata routeData
    ) internal returns (uint256 grossAmountOut) {
        uint256 balanceBefore = IERC20(tokenOut).balanceOf(address(this));
        address router = routeType == 0 ? mentoRouter : ubeswapRouter;
        IERC20(tokenIn).forceApprove(router, amountIn);
        (bool success, bytes memory result) = router.call(routeData);
        require(success, _extractRevertReason(result));
        IERC20(tokenIn).forceApprove(router, 0);
        grossAmountOut = IERC20(tokenOut).balanceOf(address(this)) - balanceBefore;
    }

    // -------------------------------------------------------------------------
    // Fee withdrawal
    // -------------------------------------------------------------------------

    /// @notice Withdraw accrued protocol fees. Only callable by owner.
    /// @param token  Token to withdraw.
    /// @param to     Recipient address.
    function withdrawFees(address token, address to) external onlyOwner {
        uint256 amount = accruedFees[token];
        if (amount == 0) revert NoFeesToWithdraw(token);
        accruedFees[token] = 0;
        IERC20(token).safeTransfer(to, amount);
        emit FeesWithdrawn(to, token, amount);
    }

    // -------------------------------------------------------------------------
    // View helpers
    // -------------------------------------------------------------------------

    /// @notice Compute the protocol fee for a given gross output amount (COPm).
    /// @param grossAmountOut Gross COPm received from the router before fee deduction.
    /// @return fee           Fee that will be retained in COPm.
    function computeFee(uint256 grossAmountOut) external pure returns (uint256 fee) {
        return (grossAmountOut * FEE_BPS) / 10_000;
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    function _extractRevertReason(bytes memory result) internal pure returns (string memory) {
        if (result.length < 68) return "FXCOPRouter: router call failed";
        assembly {
            result := add(result, 0x04)
        }
        return abi.decode(result, (string));
    }
}
