'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

//QueryClient is a class — instantiating it creates a cache store. QueryClientProvider is react-query's own context provider, same pattern as WagmiProvider


import { config } from '@/lib/wagmi'

const queryClient = new QueryClient()

//creates one shared cache instance that react-query (used internally by wagmi) uses to store and refresh on-chain data.

//Defines a component that accepts children
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}> 
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

//WagmiProvider :- Starts wrapping children in wagmi's provider

//Nested one level inside WagmiProvider — passes our single queryClient instance down, then renders children (the actual app content) inside both providers. Nesting order here (WagmiProvider outside, QueryClientProvider inside) matters because wagmi's hooks need both contexts available, and this is the order the wagmi docs specify.
    