// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SplitToken} from "./SplitToken.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SplitBill is ReentrancyGuard {
    SplitToken public immutable splitToken;

    struct Group {
        string name;
        address[] members;
        mapping(address => bool) isMember;
        bool exists;
    }

    mapping(uint256 => Group) private groups;
    uint256 public nextGroupId;

    error EmptyGroup();

    event GroupCreated(uint256 indexed groupId, string name, address[] members);

    constructor(address _splitToken) {
        splitToken = SplitToken(_splitToken);
    }

    function createGroup(string calldata name, address[] calldata members) external returns (uint256 groupId) {
        if (members.length == 0) revert EmptyGroup();

        groupId = nextGroupId++;
        Group storage g = groups[groupId];
        g.name = name;
        g.exists = true;

        for (uint256 i = 0; i < members.length; i++) {
            g.members.push(members[i]);
            g.isMember[members[i]] = true;
        }

        emit GroupCreated(groupId, name, members);
    }

    mapping(uint256 => mapping(address => mapping(address => uint256))) public owed;
    //Then owed[groupId][debtor][creditor] finally gives you the actual number — how much wei debtor owes creditor, inside that specific group.
    error NotAMember();
    error ZeroAmount();

    event ExpenseRecorded(uint256 indexed groupId, address indexed payer, uint256 totalAmount, uint256 sharePerPerson);
    ////Same pattern as GroupCreated — a log entry fired whenever an expense happens, so a future frontend can listen and display "Alice paid ₹3000 for Goa Trip, ₹1000/person" in real time without re-querying the whole contract state.

    function recordExpense(uint256 groupId, uint256 totalAmount) external {
        Group storage g = groups[groupId];
        if (!g.isMember[msg.sender]) revert NotAMember();
        if (totalAmount == 0) revert ZeroAmount();
        uint256 memberCount = g.members.length;
        uint256 sharePerPerson = totalAmount / memberCount;
        uint256 mintedTotal;
        for (uint256 i = 0; i < memberCount; i++) {
            address member = g.members[i];
            if (member == msg.sender) continue;

            owed[groupId][member][msg.sender] += sharePerPerson;
            mintedTotal += sharePerPerson;
        }
        if (mintedTotal > 0) {
            splitToken.mint(msg.sender, mintedTotal);
        }

        emit ExpenseRecorded(groupId, msg.sender, totalAmount, sharePerPerson);
    }
    error NothingOwed();
    error WrongPaymentAmount();
    error TransferFailed();

    event Settled(uint256 indexed groupId, address indexed debtor, address indexed creditor, uint256 amount);

    function settle(uint256 groupId, address creditor) external payable nonReentrant {
        uint256 debt = owed[groupId][msg.sender][creditor];
        if (debt == 0) revert NothingOwed();
        if (msg.value != debt) revert WrongPaymentAmount();
        owed[groupId][msg.sender][creditor] = 0;
        splitToken.burn(creditor, debt);

        (bool success,) = payable(creditor).call{value: debt}("");
        if (!success) revert TransferFailed();

        emit Settled(groupId, msg.sender, creditor, debt);
    }
}
