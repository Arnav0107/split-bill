'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { formatEther } from 'viem'
import { useSplitBill, Group, Debt, Activity } from '@/lib/hooks/useSplitBill'
import { 
  Wallet, Plus, Trash2, CheckCircle2, User, Users, ArrowRight, 
  DollarSign, Activity as ActivityIcon, FileText, RefreshCw, 
  Copy, LogOut, Check, ChevronRight, AlertTriangle
} from 'lucide-react'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [memberInputs, setMemberInputs] = useState<string[]>([])
  const [expenseAmount, setExpenseAmount] = useState('')
  const [copiedText, setCopiedText] = useState(false)
  
  // Wallet states
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain()
  const isWrongNetwork = isConnected && chain?.id !== sepolia.id

  // SplitBill custom hook
  const {
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
    writePending,
    writeSuccess,
    writeError
  } = useSplitBill()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize member list with user's address when wallet connects
  useEffect(() => {
    if (address) {
      setMemberInputs([address, ''])
    }
  }, [address])

  // Clear inputs when group is successfully created
  useEffect(() => {
    if (writeSuccess) {
      setGroupName('')
      setExpenseAmount('')
      if (address) {
        setMemberInputs([address, ''])
      }
    }
  }, [writeSuccess, address])

  if (!mounted) return null

  // Helpers
  const truncateAddress = (addr: string) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const isValidAddress = (addr: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(addr.trim())
  }

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopiedText(true)
      setTimeout(() => setCopiedText(false), 2000)
    }
  }

  const handleAddMemberInput = () => {
    setMemberInputs([...memberInputs, ''])
  }

  const handleRemoveMemberInput = (index: number) => {
    if (index === 0) return // Cannot remove yourself
    const updated = memberInputs.filter((_, i) => i !== index)
    setMemberInputs(updated)
  }

  const handleMemberChange = (index: number, val: string) => {
    const updated = [...memberInputs]
    updated[index] = val
    setMemberInputs(updated)
  }

  const handleCreateGroupSubmit = async () => {
    const cleanMembers = memberInputs
      .map(m => m.trim())
      .filter(m => isValidAddress(m))
    
    if (!groupName.trim() || cleanMembers.length === 0) return
    await createGroup(groupName.trim(), cleanMembers)
  }

  const selectedGroup = groups.find(g => g.id === selectedGroupId)

  // Calculate Net balance for the connected user in the selected group
  // Net balance = (Owed to user by others) - (Owed by user to others)
  const getNetBalanceForUser = () => {
    if (!address || !selectedGroupDebts.length) return BigInt(0)
    let totalOwedToUser = BigInt(0)
    let totalUserOwes = BigInt(0)

    selectedGroupDebts.forEach(d => {
      if (d.creditor.toLowerCase() === address.toLowerCase()) {
        totalOwedToUser += d.amount
      }
      if (d.debtor.toLowerCase() === address.toLowerCase()) {
        totalUserOwes += d.amount
      }
    })

    return totalOwedToUser - totalUserOwes
  }

  const netBalance = getNetBalanceForUser()

  return (
    <div className="min-height-screen flex flex-col font-sans">
      {/* Top Header */}
      <header className="glass-card sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-purple to-brand-cyan flex items-center justify-center indigo-glow">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              SplitBill
            </h1>
            <span className="text-xs font-semibold text-brand-cyan uppercase tracking-widest">
              On-Chain IOU Ledger
            </span>
          </div>
        </div>

        {isConnected && address ? (
          <div className="flex items-center gap-4">
            {/* IOUs Balance */}
            <div className="hidden sm:flex flex-col items-end px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                Total IOUs Held
              </span>
              <span className="text-sm font-bold text-emerald-400">
                {parseFloat(tokenBalance).toFixed(4)} SPLIT
              </span>
            </div>

            {/* Address & Disconnect */}
            <div className="flex items-center gap-1 bg-slate-900/60 rounded-xl border border-white/10 p-1">
              <button 
                onClick={handleCopyAddress}
                className="flex items-center gap-2 hover:bg-white/5 px-3 py-1.5 rounded-lg transition text-sm font-medium text-slate-300"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                {truncateAddress(address)}
                {copiedText ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500 hover:text-white" />
                )}
              </button>
              <button 
                onClick={() => disconnect()} 
                title="Disconnect Wallet"
                className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : null}
      </header>

      {isWrongNetwork && (
        <div className="bg-amber-500/10 border-b border-amber-500/25 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 text-amber-400 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
            <span>
              Connected to <strong>{chain?.name || 'Unknown Network'}</strong>. Please switch to the <strong>Sepolia Testnet</strong> to interact with the SplitBill application.
            </span>
          </div>
          <button
            onClick={() => switchChain?.({ chainId: sepolia.id })}
            disabled={isSwitchingChain}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition duration-200 cursor-pointer shadow-md shrink-0 animate-pulse"
          >
            {isSwitchingChain ? 'Switching Network...' : 'Switch to Sepolia'}
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 md:px-6 md:py-12">
        {!isConnected ? (
          /* Landing Screen */
          <div className="flex flex-col items-center justify-center text-center py-20 px-4">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-brand-purple to-brand-cyan flex items-center justify-center indigo-glow mb-8 animate-bounce">
              <Wallet className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 max-w-3xl">
              Split Bills Effortlessly With <br />
              <span className="bg-gradient-to-r from-brand-purple via-violet-400 to-brand-cyan bg-clip-text text-transparent">
                Trustless On-Chain IOUs
              </span>
            </h2>
            
            <p className="text-lg text-slate-400 max-w-xl mb-12">
              Create groups, record expenses, and automatically mint SPLIT tokens. Settle up securely directly via the smart contract using native Sepolia ETH transactions.
            </p>

            {/* Connect Card */}
            <div className="glass-card p-8 rounded-2xl max-w-md w-full border border-white/10 indigo-glow">
              <h3 className="text-lg font-bold text-white mb-6">
                Connect your Web3 Wallet to Start
              </h3>
              <div className="flex flex-col gap-3">
                {connectors.map((connector) => (
                  <button
                    key={connector.id}
                    onClick={() => connect({ connector })}
                    className="w-full flex items-center justify-between px-5 py-4 rounded-xl bg-white/5 hover:bg-brand-indigo/20 border border-white/5 hover:border-brand-indigo/50 transition duration-300 font-semibold text-white group cursor-pointer"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-brand-cyan group-hover:scale-125 transition" />
                      {connector.name}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Connected Dashboard */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Sidebar Columns (Group Creation & List) - spans 4 cols */}
            <div className="lg:col-span-4 flex flex-col gap-8">
              
              {/* Active Groups Index Panel */}
              <div className="glass-card rounded-2xl p-6 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand-cyan" />
                    Your Groups
                  </h3>
                  <button 
                    onClick={refreshData}
                    disabled={loading}
                    className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg transition"
                    title="Refresh Data"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {loading ? (
                  <div className="py-8 flex justify-center">
                    <div className="w-6 h-6 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : groups.length === 0 ? (
                  <div className="py-8 text-center bg-white/5 rounded-xl border border-dashed border-white/10 px-4">
                    <p className="text-sm text-slate-400 mb-2">No groups joined yet.</p>
                    <p className="text-xs text-slate-500">Use the form below to create your first split group.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                    {groups.map((group) => {
                      const isSelected = selectedGroupId === group.id
                      return (
                        <button
                          key={group.id}
                          onClick={() => setSelectedGroupId(group.id)}
                          className={`w-full text-left flex items-center justify-between p-3.5 rounded-xl transition duration-200 border cursor-pointer ${
                            isSelected 
                              ? 'bg-brand-indigo/15 border-brand-indigo/50 text-white' 
                              : 'bg-white/5 border-white/5 hover:border-white/10 text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-sm">{group.name}</div>
                            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {group.members.length} members
                            </div>
                          </div>
                          <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isSelected ? 'translate-x-1' : ''}`} />
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Create Group Form Card */}
              <div className="glass-card rounded-2xl p-6 border border-white/5">
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                  <Plus className="w-4 h-4 text-brand-purple" />
                  Create a Group
                </h3>

                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Group Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Europe Trip, Room Rent"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-purple text-white placeholder-slate-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-400">Members Addresses</label>
                      <button 
                        onClick={handleAddMemberInput}
                        className="text-xs text-brand-purple hover:text-brand-cyan font-bold transition flex items-center gap-0.5"
                      >
                        + Add Member
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                      {memberInputs.map((val, idx) => {
                        const isMe = idx === 0
                        const isValid = val === '' || isValidAddress(val)
                        return (
                          <div key={idx} className="flex gap-2 items-center">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                placeholder={isMe ? (address || '') : "0x..."}
                                value={isMe ? truncateAddress(address || '') : val}
                                disabled={isMe}
                                onChange={(e) => handleMemberChange(idx, e.target.value)}
                                className={`w-full bg-slate-900/60 border rounded-xl pl-4 pr-12 py-2.5 text-xs focus:outline-none focus:border-brand-purple text-white placeholder-slate-600 ${
                                  isMe ? 'opacity-70 border-white/5 font-mono' : isValid ? 'border-white/10' : 'border-red-500/50 focus:border-red-500'
                                }`}
                              />
                              {isMe && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-brand-indigo/20 text-brand-indigo px-1.5 py-0.5 rounded font-bold uppercase">
                                  You
                                </span>
                              )}
                            </div>
                            {!isMe && (
                              <button
                                onClick={() => handleRemoveMemberInput(idx)}
                                className="p-2.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-xl transition"
                                title="Remove member"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <button
                    onClick={handleCreateGroupSubmit}
                    disabled={writePending || !groupName.trim() || memberInputs.filter(m => isValidAddress(m)).length < 2}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-purple to-brand-indigo disabled:opacity-50 disabled:from-slate-800 disabled:to-slate-800 font-semibold text-white hover:opacity-90 transition duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    {writePending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : 'Create Group'}
                  </button>

                  {writeError && (
                    <div className="flex gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs items-start">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="break-all">{writeError.message}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Selected Group Workspace (Calculations, Expense Log, history) - spans 8 cols */}
            <div className="lg:col-span-8">
              {!selectedGroupId ? (
                /* Blank State */
                <div className="glass-card rounded-2xl p-12 text-center border border-white/5 flex flex-col items-center justify-center min-h-[500px]">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 text-slate-500 border border-white/5">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No Group Selected</h3>
                  <p className="text-sm text-slate-400 max-w-sm">
                    Choose an active group from the list on the left to start adding shared bills, analyzing peer-to-peer debts, and settling balances.
                  </p>
                </div>
              ) : (
                /* Active Workspace */
                <div className="flex flex-col gap-8">
                  
                  {/* Selected Group Details Header */}
                  <div className="glass-card rounded-2xl p-6 border border-white/5 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-brand-cyan/5 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                      <div>
                        <span className="text-[10px] font-bold text-brand-purple uppercase tracking-wider">Active Workspace</span>
                        <h2 className="text-2xl font-extrabold text-white mt-1">{selectedGroup?.name}</h2>
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">ID: {selectedGroupId}</p>
                      </div>

                      {/* Net Status Badge */}
                      <div className={`px-4 py-2.5 rounded-xl border flex flex-col items-end ${
                        netBalance > BigInt(0) 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : netBalance < BigInt(0) 
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                          : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                      }`}>
                        <span className="text-[9px] uppercase tracking-wider font-semibold">Your Net Group Position</span>
                        <span className="text-base font-bold">
                          {netBalance > BigInt(0) ? '+' : ''}
                          {formatEther(netBalance)} Sepolia ETH
                        </span>
                      </div>
                    </div>

                    {/* Members List tags */}
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Group Members</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedGroup?.members.map((member, i) => {
                          const isCurrentUser = member.toLowerCase() === address?.toLowerCase()
                          return (
                            <span 
                              key={i} 
                              className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1.5 ${
                                isCurrentUser 
                                  ? 'bg-brand-indigo/15 border-brand-indigo/30 text-white font-semibold' 
                                  : 'bg-white/5 border-white/5 text-slate-400'
                              }`}
                            >
                              <User className="w-3 h-3 text-slate-500" />
                              {truncateAddress(member)}
                              {isCurrentUser && <span className="text-[9px] font-bold text-brand-indigo">(You)</span>}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Actions Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Add Expense Section */}
                    <div className="glass-card rounded-2xl p-6 border border-white/5 flex flex-col justify-between">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                          <DollarSign className="w-4 h-4 text-brand-cyan" />
                          Record New Expense
                        </h3>
                        <p className="text-xs text-slate-400 mb-4">
                          Record an expense in this group. The contract splits it equally among all members and credits you with SPLIT IOU tokens.
                        </p>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="text-xs font-semibold text-slate-400 block mb-1">Total Amount (Sepolia ETH)</label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.0001"
                                min="0"
                                placeholder="0.05"
                                value={expenseAmount}
                                onChange={(e) => setExpenseAmount(e.target.value)}
                                className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-4 pr-16 py-3 text-sm focus:outline-none focus:border-brand-cyan text-white placeholder-slate-600"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                                Sepolia ETH
                              </span>
                            </div>
                            
                            {expenseAmount && selectedGroup?.members.length && (
                              <div className="mt-2 text-xs text-slate-400 bg-white/5 p-2.5 rounded-lg border border-white/5 flex items-center justify-between">
                                <span>Split Share per Person:</span>
                                <span className="font-bold text-white font-mono">
                                  {(Number(expenseAmount) / selectedGroup.members.length).toFixed(5)} Sepolia ETH
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => recordExpense(selectedGroupId!, expenseAmount)}
                        disabled={writePending || !expenseAmount || isNaN(Number(expenseAmount)) || Number(expenseAmount) <= 0}
                        className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-brand-cyan to-blue-500 disabled:opacity-50 disabled:from-slate-800 disabled:to-slate-800 font-semibold text-white hover:opacity-90 transition duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        {writePending ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : 'Log Expense'}
                      </button>
                    </div>

                    {/* Peer-to-Peer Debts Ledger & Settle */}
                    <div className="glass-card rounded-2xl p-6 border border-white/5">
                      <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                        <ArrowRight className="w-4 h-4 text-emerald-400" />
                        Debts & Settle Up
                      </h3>

                      {groupDetailsLoading ? (
                        <div className="py-12 flex justify-center">
                          <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : selectedGroupDebts.length === 0 ? (
                        <div className="py-12 text-center bg-white/5 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                          <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
                          <p className="text-sm font-semibold text-slate-300">All Settled Up!</p>
                          <p className="text-xs text-slate-500 mt-1">No outstanding balances exist in this group.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3.5 max-h-[300px] overflow-y-auto pr-1">
                          {selectedGroupDebts.map((debt, index) => {
                            const isDebtorMe = debt.debtor.toLowerCase() === address?.toLowerCase()
                            const isCreditorMe = debt.creditor.toLowerCase() === address?.toLowerCase()
                            
                            // Color scheme depending on state
                            let cardStyle = 'bg-white/5 border-white/5 text-slate-300'
                            if (isDebtorMe) {
                              cardStyle = 'bg-amber-500/5 border-amber-500/20 text-amber-300'
                            } else if (isCreditorMe) {
                              cardStyle = 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                            }

                            return (
                              <div 
                                key={index} 
                                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${cardStyle}`}
                              >
                                <div className="text-xs">
                                  <div className="font-semibold flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono">{isDebtorMe ? 'You' : truncateAddress(debt.debtor)}</span>
                                    <span className="text-slate-400">owes</span>
                                    <span className="font-mono">{isCreditorMe ? 'You' : truncateAddress(debt.creditor)}</span>
                                  </div>
                                  <div className="text-base font-bold font-mono mt-1">
                                    {formatEther(debt.amount)} Sepolia ETH
                                  </div>
                                </div>

                                {isDebtorMe ? (
                                  <button
                                    onClick={() => settleExpense(selectedGroupId!, debt.creditor, debt.amount)}
                                    disabled={writePending}
                                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-95 text-xs font-semibold text-slate-950 rounded-xl transition duration-200 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1"
                                  >
                                    {writePending ? (
                                      <div className="w-3 h-3 border border-slate-950 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <>Settle Up</>
                                    )}
                                  </button>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Group Activity Log / Event Stream */}
                  <div className="glass-card rounded-2xl p-6 border border-white/5">
                    <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                      <ActivityIcon className="w-4 h-4 text-brand-purple" />
                      Recent Activity
                    </h3>

                    {groupDetailsLoading ? (
                      <div className="py-8 flex justify-center">
                        <div className="w-6 h-6 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : selectedGroupActivity.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500 bg-white/5 rounded-xl border border-dashed border-white/10">
                        No operations have occurred yet.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 max-h-[250px] overflow-y-auto pr-1">
                        {selectedGroupActivity.map((activity, index) => {
                          return (
                            <div key={index} className="flex gap-3 text-xs bg-slate-950/45 p-3 rounded-xl border border-white/5 items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  activity.type === 'expense' 
                                    ? 'bg-blue-500/10 text-blue-400' 
                                    : 'bg-emerald-500/10 text-emerald-400'
                                }`}>
                                  {activity.type === 'expense' ? <DollarSign className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                </div>

                                <div>
                                  {activity.type === 'expense' ? (
                                    <span>
                                      <strong className="font-mono text-white">{truncateAddress(activity.payer || '')}</strong> logged an expense of{' '}
                                      <strong className="text-brand-cyan font-mono">{formatEther(activity.amount)} Sepolia ETH</strong>
                                    </span>
                                  ) : (
                                    <span>
                                      <strong className="font-mono text-white">{truncateAddress(activity.debtor || '')}</strong> settled debt of{' '}
                                      <strong className="text-emerald-400 font-mono">{formatEther(activity.amount)} Sepolia ETH</strong> with{' '}
                                      <strong className="font-mono text-white">{truncateAddress(activity.creditor || '')}</strong>
                                    </span>
                                  )}
                                  <div className="text-[10px] text-slate-500 mt-0.5">
                                    Tx: {truncateAddress(activity.txHash)}
                                  </div>
                                </div>
                              </div>

                              <a
                                href={`https://sepolia.etherscan.io/tx/${activity.txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-brand-purple hover:underline"
                              >
                                View TX
                              </a>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 text-slate-500 text-xs border-t border-white/5 mt-12 bg-slate-950/30">
        <p>&copy; {new Date().getFullYear()} SplitBill. Built securely with on-chain credit accounts.</p>
      </footer>
    </div>
  )
}