// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {SplitToken} from "../src/SplitToken.sol";
import {SplitBill} from "../src/SplitBill.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract SplitBillTest is Test {
    SplitToken public splitToken;
    SplitBill public splitBill;
    MockUSDC public mockUSDC;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public carol = makeAddr("carol");

    function setUp() public {
        splitToken = new SplitToken();
        mockUSDC = new MockUSDC();
        splitBill = new SplitBill(address(splitToken), address(mockUSDC));
        splitToken.setSplitBill(address(splitBill));
    }

    function test_CreateGroup() public {
        address[] memory members = new address[](3);
        members[0] = alice;
        members[1] = bob;
        members[2] = carol;
        uint256 groupId = splitBill.createGroup("Goa Trip", members);

        assertEq(groupId, 0);
        assertEq(splitBill.nextGroupId(), 1);
    }

    function test_RecordExpense() public {
        address[] memory members = new address[](3);
        members[0] = alice;
        members[1] = bob;
        members[2] = carol;

        uint256 groupId = splitBill.createGroup("Goa Trip", members);
        uint256 total = 300;
        vm.prank(alice);
        splitBill.recordExpense(groupId, total);
        uint256 share = total / 3;

        assertEq(splitBill.owed(groupId, bob, alice), share);
        assertEq(splitBill.owed(groupId, carol, alice), share);
        assertEq(splitBill.owed(groupId, alice, alice), 0);
        assertEq(splitToken.balanceOf(alice), share * 2);
    }

    // function test_SettleExpense() public {
    //     address[] memory members = new address[](3);
    //     members[0] = alice;
    //     members[1] = bob;
    //     members[2] = carol;
    //     uint256 groupId = splitBill.createGroup("Goa Trip", members);
    //     uint256 total = 300;
    //     vm.prank(alice);
    //     splitBill.recordExpense(groupId, total);
    //     uint256 share = total / 3;
    //     vm.deal(bob, share);
    //     vm.prank(bob);
    //     splitBill.settle{value: share}(groupId, alice);
    //     assertEq(splitBill.owed(groupId, bob, alice), 0);
    //     assertEq(splitToken.balanceOf(alice), share); // was 200, now 100 (Carol's share still owed)
    //     assertEq(alice.balance, share);
    // }
    function test_SettleExpense() public {
        address[] memory members = new address[](2);
        members[0] = alice;
        members[1] = bob;
        uint256 groupId = splitBill.createGroup("Goa Trip", members);
        uint256 total = 200;
        vm.prank(alice);
        splitBill.recordExpense(groupId, total);

        uint256 share = total / 2;

        mockUSDC.mint(bob, share);

        vm.prank(bob);
        mockUSDC.approve(address(splitBill), share);
        uint256 aliceBalanceBefore = mockUSDC.balanceOf(alice);

        vm.prank(bob);
        splitBill.settle(groupId, alice);

        assertEq(splitBill.owed(groupId, bob, alice), 0);
        assertEq(mockUSDC.balanceOf(alice) - aliceBalanceBefore, share);
        assertEq(splitToken.balanceOf(alice), 0);
    }

    function test_RevertWhen_NonMemberRecordsExpense() public {
        address[] memory members = new address[](2);
        members[0] = alice;
        members[1] = bob;
        uint256 groupId = splitBill.createGroup("Goa Trip", members);
        address dave = makeAddr("dave");
        vm.prank(dave);
        vm.expectRevert(SplitBill.NotAMember.selector);
        splitBill.recordExpense(groupId, 100);
    }

    // function test_RevertWhen_WrongSettlementAmount() public {
    //     address[] memory members = new address[](2);
    //     members[0] = alice;
    //     members[1] = bob;
    //     uint256 groupId = splitBill.createGroup("Goa Trip", members);

    //     uint256 total = 200;
    //     vm.prank(alice);
    //     splitBill.recordExpense(groupId, total);

    //     vm.deal(bob, 1 ether);
    //     vm.prank(bob);
    //     vm.expectRevert(SplitBill.WrongPaymentAmount.selector);
    //     splitBill.settle{value: 50}(groupId, alice);
    // }

    function test_RevertWhen_InsufficientAllowance() public {
        address[] memory members = new address[](2);
        members[0] = alice;
        members[1] = bob;
        uint256 groupId = splitBill.createGroup("Goa Trip", members);
        uint256 total = 200;
        vm.prank(alice);
        splitBill.recordExpense(groupId, total);
        uint256 share = total / 2;
        mockUSDC.mint(bob, share);

        vm.prank(bob);
        vm.expectRevert();
        splitBill.settle(groupId, alice);
    }

    // function test_RevertWhen_SettlingNonexistentDebt() public {
    //     address[] memory members = new address[](2);
    //     members[0] = alice;
    //     members[1] = bob;
    //     uint256 groupId = splitBill.createGroup("Goa Trip", members);
    //     vm.deal(carol, 1 ether);
    //     vm.prank(carol);
    //     vm.expectRevert(SplitBill.NothingOwed.selector);
    //     splitBill.settle{value: 1}(groupId, alice);
    // }

    function test_RevertWhen_SettlingNonexistentDebt() public {
        address[] memory members = new address[](2);
        members[0] = alice;
        members[1] = bob;

        uint256 groupId = splitBill.createGroup("Goa Trip", members);

        mockUSDC.mint(carol, 100);
        vm.prank(carol);
        mockUSDC.approve(address(splitBill), 100);
        vm.prank(carol);
        vm.expectRevert(SplitBill.NothingOwed.selector);
        splitBill.settle(groupId, alice);
    }

    function testFuzz_RecordExpenseSplitsCorrectly(uint96 total) public {
        vm.assume(total > 0);

        address[] memory members = new address[](3);
        members[0] = alice;
        members[1] = bob;
        members[2] = carol;
        uint256 groupId = splitBill.createGroup("Fuzz Trip", members);

        vm.prank(alice);
        splitBill.recordExpense(groupId, total);
        uint256 share = total / 3;

        assertEq(splitBill.owed(groupId, bob, alice), share);
        assertEq(splitBill.owed(groupId, carol, alice), share);
        assertEq(splitToken.balanceOf(alice), share * 2);
    }

    // function testFuzz_SettleWorksForAnyValidAmount(uint96 total) public {
    //     vm.assume(total >= 2); // needs to split across at least 2 people meaningfully

    //     address[] memory members = new address[](2);
    //     members[0] = alice;
    //     members[1] = bob;
    //     uint256 groupId = splitBill.createGroup("Fuzz Settle", members);

    //     vm.prank(alice);
    //     splitBill.recordExpense(groupId, total);

    //     uint256 owedAmount = splitBill.owed(groupId, bob, alice);
    //     vm.assume(owedAmount > 0); // skip cases where integer division rounds to 0

    //     vm.deal(bob, owedAmount);
    //     uint256 aliceBalanceBefore = alice.balance;

    //     vm.prank(bob);
    //     splitBill.settle{value: owedAmount}(groupId, alice);

    //     assertEq(splitBill.owed(groupId, bob, alice), 0);
    //     assertEq(alice.balance - aliceBalanceBefore, owedAmount);
    //     assertEq(splitToken.balanceOf(alice), 0);
    // }

    function testFuzz_SettleWorksForAnyValidAmount(uint96 total) public {
        vm.assume(total >= 2);

        address[] memory members = new address[](2);
        members[0] = alice;
        members[1] = bob;

        uint256 groupId = splitBill.createGroup("Fuzz Settle", members);

        vm.prank(alice);
        splitBill.recordExpense(groupId, total);

        uint256 owedAmount = splitBill.owed(groupId, bob, alice);
        vm.assume(owedAmount > 0);
        mockUSDC.mint(bob, owedAmount);
        vm.prank(bob);
        mockUSDC.approve(address(splitBill), owedAmount);
        uint256 aliceBalanceBefore = mockUSDC.balanceOf(alice);
        vm.prank(bob);
        splitBill.settle(groupId, alice);
        assertEq(splitBill.owed(groupId, bob, alice), 0);
        assertEq(mockUSDC.balanceOf(alice) - aliceBalanceBefore, owedAmount);
        assertEq(splitToken.balanceOf(alice), 0);
    }
}
