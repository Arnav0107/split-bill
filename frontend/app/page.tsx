'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useReadContract } from 'wagmi'
import { splitBillAbi } from '@/lib/contracts/SplitBill'
import { SPLIT_BILL_ADDRESS } from '@/lib/contracts/addresses'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  const { data: nextGroupId, isLoading } = useReadContract({
    address: SPLIT_BILL_ADDRESS,
    abi: splitBillAbi,
    functionName: 'nextGroupId',
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <main style={{ padding: '2rem' }}>
      <h1>SplitBill</h1>

      <p>
        Next Group ID: {isLoading ? 'Loading...' : nextGroupId?.toString()}
      </p>

      {isConnected ? (
        <div>
          <p>Connected: {address}</p>
          <button onClick={() => disconnect()}>Disconnect</button>
        </div>
      ) : (
        <div>
          {connectors.map((connector) => (
            <button key={connector.id} onClick={() => connect({ connector })}>
              Connect {connector.name}
            </button>
          ))}
        </div>
      )}
    </main>
  )
}