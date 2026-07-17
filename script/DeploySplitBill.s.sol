// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {SplitToken} from "../src/SplitToken.sol";
import {SplitBill} from "../src/SplitBill.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract DeploySplitBill is Script {
    function run() external returns (SplitToken, SplitBill, MockUSDC) {
        vm.startBroadcast();

        SplitToken splitToken = new SplitToken();
        MockUSDC mockUSDC = new MockUSDC();
        SplitBill splitBill = new SplitBill(address(splitToken), address(mockUSDC));
        splitToken.setSplitBill(address(splitBill));

        vm.stopBroadcast();

        console.log("SplitToken deployed to:", address(splitToken));
        console.log("MockUSDC deployed to:", address(mockUSDC));
        console.log("SplitBill deployed to:", address(splitBill));

        return (splitToken, splitBill, mockUSDC);
    }
}
