'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'
import { formatEther, parseEther } from 'viem'
import { splitBillAbi } from '../contracts/SplitBill'
import { SPLIT_BILL_ADDRESS, SPLIT_TOKEN_ADDRESS } from '../contracts/addresses'

// Minimal ERC20 ABI for SPLIT token
const erc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const

export interface Group {
  id: number
  name: string
  members: string[]
}

export interface Debt {
  debtor: string
  creditor: string
  amount: bigint
}

export interface Activity {
  type: 'expense' | 'settlement'
  txHash: string
  payer?: string
  debtor?: string
  creditor?: string
  amount: bigint
  sharePerPerson?: bigint
  timestamp?: number
}

export function useSplitBill() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { writeContract, isPending, isSuccess, error } = useWriteContract()

  const [groups, setGroups] = useState<Group[]>([])
  const [tokenBalance, setTokenBalance] = useState<string>('0')
  const [loading, setLoading] = useState<boolean>(false)
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  
  // Selected group specific state
  const [selectedGroupDebts, setSelectedGroupDebts] = useState<Debt[]>([])
  const [selectedGroupActivity, setSelectedGroupActivity] = useState<Activity[]>([])
  const [groupDetailsLoading, setGroupDetailsLoading] = useState<boolean>(false)

  // Fetch token balance
  const fetchTokenBalance = useCallback(async () => {
    if (!address || !publicClient) return
    try {
      const balance = await publicClient.readContract({
        address: SPLIT_TOKEN_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
      })
      setTokenBalance(formatEther(balance))
    } catch (e) {
      console.error('Error fetching token balance:', e)
    }
  }, [address, publicClient])

  // Fetch all groups where the user is a member
  const fetchGroups = useCallback(async () => {
    if (!address || !publicClient) return
    setLoading(true)
    try {
      const chainId = publicClient.chain?.id
      const startBlock = chainId === 11155111 ? BigInt(11263500) : BigInt(0)

      // Find all GroupCreated events
      const logs = await publicClient.getContractEvents({
        address: SPLIT_BILL_ADDRESS,
        abi: splitBillAbi,
        eventName: 'GroupCreated',
        fromBlock: startBlock, // Scan from contract deployment block
      })

      const allGroups: Group[] = logs.map((log) => {
        const args = log.args as { groupId: bigint; name: string; members: readonly string[] }
        return {
          id: Number(args.groupId),
          name: args.name,
          members: [...args.members],
        }
      })

      // Filter groups where the connected user is a member
      const userGroups = allGroups.filter((g) =>
        g.members.some((m) => m.toLowerCase() === address.toLowerCase())
      )

      setGroups(userGroups)
    } catch (e) {
      console.error('Error fetching groups:', e)
    } finally {
      setLoading(false)
    }
  }, [address, publicClient])

  // Fetch detailed information (debts + activity history) for a specific group
  const fetchGroupDetails = useCallback(async (groupId: number, members: string[]) => {
    if (!address || !publicClient) return
    setGroupDetailsLoading(true)
    try {
      // 1. Fetch debt matrix (who owes whom in this group)
      // Since it's on-chain, we query owed[groupId][debtor][creditor] for all pairs
      const debtMatrix: Debt[] = []
      const promises: Promise<void>[] = []

      for (let i = 0; i < members.length; i++) {
        for (let j = 0; j < members.length; j++) {
          if (i === j) continue
          const debtor = members[i]
          const creditor = members[j]

          const promise = publicClient
            .readContract({
              address: SPLIT_BILL_ADDRESS,
              abi: splitBillAbi,
              functionName: 'owed',
              args: [BigInt(groupId), debtor as `0x${string}`, creditor as `0x${string}`],
            })
            .then((amount) => {
              if (amount > BigInt(0)) {
                debtMatrix.push({
                  debtor,
                  creditor,
                  amount: amount as bigint,
                })
              }
            })
            .catch((err) => {
              console.error(`Error reading debt for ${debtor} -> ${creditor}:`, err)
            })
          promises.push(promise)
        }
      }

      await Promise.all(promises)
      setSelectedGroupDebts(debtMatrix)

      const chainId = publicClient.chain?.id
      const startBlock = chainId === 11155111 ? BigInt(11263500) : BigInt(0)

      // 2. Fetch recent activity (ExpenseRecorded and Settled events for this group)
      const [expenseLogs, settleLogs] = await Promise.all([
        publicClient.getContractEvents({
          address: SPLIT_BILL_ADDRESS,
          abi: splitBillAbi,
          eventName: 'ExpenseRecorded',
          fromBlock: startBlock,
        }),
        publicClient.getContractEvents({
          address: SPLIT_BILL_ADDRESS,
          abi: splitBillAbi,
          eventName: 'Settled',
          fromBlock: startBlock,
        }),
      ])

      const groupExpenses: Activity[] = expenseLogs
        .filter((log) => Number((log.args as any).groupId) === groupId)
        .map((log) => {
          const args = log.args as { payer: string; totalAmount: bigint; sharePerPerson: bigint }
          return {
            type: 'expense',
            txHash: log.transactionHash,
            payer: args.payer,
            amount: args.totalAmount,
            sharePerPerson: args.sharePerPerson,
          }
        })

      const groupSettlements: Activity[] = settleLogs
        .filter((log) => Number((log.args as any).groupId) === groupId)
        .map((log) => {
          const args = log.args as { debtor: string; creditor: string; amount: bigint }
          return {
            type: 'settlement',
            txHash: log.transactionHash,
            debtor: args.debtor,
            creditor: args.creditor,
            amount: args.amount,
          }
        })

      // Combine and sort (newest first, though we don't have block timestamps directly, 
      // we can order by transactionIndex or blockNumber if needed. For simplicity, combine both arrays)
      const combinedActivity = [...groupExpenses, ...groupSettlements]
      setSelectedGroupActivity(combinedActivity)
    } catch (e) {
      console.error('Error fetching group details:', e)
    } finally {
      setGroupDetailsLoading(false)
    }
  }, [address, publicClient])

  // Trigger loading when selected group changes
  useEffect(() => {
    if (selectedGroupId !== null) {
      const selectedGroup = groups.find((g) => g.id === selectedGroupId)
      if (selectedGroup) {
        fetchGroupDetails(selectedGroupId, selectedGroup.members)
      }
    } else {
      setSelectedGroupDebts([])
      setSelectedGroupActivity([])
    }
  }, [selectedGroupId, groups, fetchGroupDetails])

  // Initial load
  useEffect(() => {
    if (isConnected && address) {
      fetchGroups()
      fetchTokenBalance()
    } else {
      setGroups([])
      setTokenBalance('0')
      setSelectedGroupId(null)
    }
  }, [isConnected, address, fetchGroups, fetchTokenBalance])

  // Helper function to refresh all dashboard data
  const refreshData = useCallback(async () => {
    if (!address) return
    await Promise.all([fetchGroups(), fetchTokenBalance()])
    if (selectedGroupId !== null) {
      const selectedGroup = groups.find((g) => g.id === selectedGroupId)
      if (selectedGroup) {
        await fetchGroupDetails(selectedGroupId, selectedGroup.members)
      }
    }
  }, [address, selectedGroupId, groups, fetchGroups, fetchTokenBalance, fetchGroupDetails])

  // Create a new group
  const createGroup = useCallback(
    async (name: string, members: string[]) => {
      if (!name.trim() || members.length === 0) return
      
      writeContract({
        address: SPLIT_BILL_ADDRESS,
        abi: splitBillAbi,
        functionName: 'createGroup',
        args: [name, members as `0x${string}`[]],
      })
    },
    [writeContract]
  )

  // Record an expense
  const recordExpense = useCallback(
    async (groupId: number, amountEth: string) => {
      if (!amountEth || isNaN(Number(amountEth))) return
      
      const amountWei = parseEther(amountEth)
      writeContract({
        address: SPLIT_BILL_ADDRESS,
        abi: splitBillAbi,
        functionName: 'recordExpense',
        args: [BigInt(groupId), amountWei],
      })
    },
    [writeContract]
  )

  // Settle an expense
  const settleExpense = useCallback(
    async (groupId: number, creditor: string, amountWei: bigint) => {
      writeContract({
        address: SPLIT_BILL_ADDRESS,
        abi: splitBillAbi,
        functionName: 'settle',
        args: [BigInt(groupId), creditor as `0x${string}`],
        value: amountWei, // Settle requires payable value matching the debt
      })
    },
    [writeContract]
  )

  return {
    groups,
    tokenBalance,
    loading,
    selectedGroupId,
    setSelectedGroupId,
    selectedGroupDebts,
    selectedGroupActivity,
    groupDetailsLoading,
    createGroup,
    recordExpense,
    settleExpense,
    refreshData,
    writePending: isPending,
    writeSuccess: isSuccess,
    writeError: error,
  }
}
