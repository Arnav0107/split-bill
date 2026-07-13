# SplitBill 🧾

An on-chain "who owes who" tracker. When friends split a bill, instead of a
screenshot of Splitwise, the debt lives as an ERC20 balance on Sepolia — and
settling up is a real transaction, not a promise.

## 🚀 Live on Sepolia

| Contract   | Address                                      | Etherscan                                                                                                    |
| ---------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| SplitToken | `0x5298c4eA578348AC4387865aCc69254da70e8ccB` | [View verified source](https://sepolia.etherscan.io/address/0x5298c4ea578348ac4387865acc69254da70e8ccb#code) |
| SplitBill  | `0x22A0c96bDab95264cd75B0Cf2f9ec51838bFd5B6` | [View verified source](https://sepolia.etherscan.io/address/0x22a0c96bdab95264cd75b0cf2f9ec51838bfd5b6#code) |

Both contracts are verified — source code is publicly readable on Etherscan, not just bytecode.

## How it works

1. **Create a group** — a list of wallet addresses (your friends).
2. **Record an expense** — whoever paid calls `recordExpense(groupId, amount)`.
   The contract splits it evenly across the group and mints them **SPLIT**
   tokens equal to what everyone else now owes them.
3. **Settle up** — a debtor calls `settle(groupId, creditor)` with the exact
   ETH amount owed. The contract forwards the ETH and burns the matching
   SPLIT tokens. Debt paid, ledger clean.
