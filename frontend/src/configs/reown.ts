import { createAppKit } from '@reown/appkit/react'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { baseSepolia } from '@reown/appkit/networks'

// 1. Get projectId from https://cloud.reown.com
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID



// 2. Set up the networks
// const networks = [baseSepolia]

// 3. Create a metadata object
const metadata = {
  name: 'Sentinel Protocol',
  description: 'Decentralized Franchise Compliance',
  url: 'https://sentinelprotocol.vercel.app/',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

// 4. Create the AppKit instance
export const modal = createAppKit({
  adapters: [new EthersAdapter()],
  networks: [baseSepolia as any],
  metadata,
  projectId,
  features: {
    analytics: true
  },
  themeMode: 'dark'
})
