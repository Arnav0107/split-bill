// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SplitToken is ERC20 {
    address public splitBill;
    error NotSplitBill();

    modifier onlySplitBill() {
        if (msg.sender != splitBill) revert NotSplitBill();
        _;
    }

    constructor() ERC20("SplitBill IOU", "SPLIT") {
        splitBill = msg.sender;
    }

    function setSplitBill(address _splitBill) external onlySplitBill {
        splitBill = _splitBill;
    }

    function mint(address to, uint256 amount) external onlySplitBill {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlySplitBill {
        _burn(from, amount);
    }
}
