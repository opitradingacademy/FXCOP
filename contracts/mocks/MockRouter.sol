// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @dev Test mock router — returns a configurable amountOut for any swap call.
/// Accepts any calldata (ignores it) and returns abi.encoded(amountOut).
/// Sends amountOut of copmToken to msg.sender to simulate a real swap.
/// NOT for production use.
contract MockRouter {
    using SafeERC20 for IERC20;

    address public copmToken;
    uint256 public amountOutToReturn;

    constructor(address _copmToken) {
        copmToken = _copmToken;
    }

    function setAmountOut(uint256 amount) external {
        amountOutToReturn = amount;
    }

    /// @dev Fallback — accepts any calldata, simulates a swap, returns encoded amountOut.
    fallback(bytes calldata) external returns (bytes memory) {
        // Transfer COPm to the caller (FXCOPRouter)
        IERC20(copmToken).safeTransfer(msg.sender, amountOutToReturn);
        return abi.encode(amountOutToReturn);
    }
}
