import { http, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [sepolia],  
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(),
  },
})

// chains: [sepolia] — wagmi ships with common chains pre-defined (chain ID, name, RPC defaults, etc.) — sepolia is one of them, imported directly, no need to hardcode chain IDs ourselves.

//connectors: [injected()] — injected means "any browser wallet extension that injects itself into the page," which covers MetaMask specifically (and most other browser extension wallets). There are other connector types (WalletConnect, Coinbase Wallet) but injected is exactly what we need for MetaMask.

//transports: {[sepolia.id]: http()} — here we explicitly configure the transport (RPC connection) for each chain in the list. For sepolia, we use a standard public HTTP RPC. This is where you’d configure things like the RPC URL (if not using the default), or use providers like Cloudflare’s RPC, Alchemy, etc.

