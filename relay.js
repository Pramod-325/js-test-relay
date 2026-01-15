// @ts-check
import { createLibp2p } from 'libp2p'
import { autoNAT } from '@libp2p/autonat'
import { identify } from '@libp2p/identify'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { webSockets } from '@libp2p/websockets'
import { circuitRelayServer, circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { createFromJSON } from '@libp2p/peer-id-factory'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { PUBSUB_PEER_DISCOVERY } from './constants.js'

const port = parseInt(process.env.PORT || '9001')

async function main() {
  let peerId

  // 1. Load Peer ID from ENV or generate a temporary one
  if (process.env.RELAY_PEER_ID) {
    try {
      const idJson = JSON.parse(process.env.RELAY_PEER_ID)
      peerId = await createFromJSON(idJson)
      console.log('✅ Loaded persistent PeerID from ENV')
    } catch (err) {
      console.error('❌ Failed to parse RELAY_PEER_ID, generating new one:', err)
      peerId = await createEd25519PeerId()
    }
  } else {
    console.warn('⚠️ No RELAY_PEER_ID found in ENV. Peer ID will change on restart!')
    peerId = await createEd25519PeerId()
  }

  const libp2p = await createLibp2p({
    peerId: peerId, // 👈 Apply the persistent ID
    addresses: {
      listen: [
        `/ip4/0.0.0.0/tcp/${port}/ws`
      ],
      announce: [
        // 💡 This URL is technically ignored by browsers (they use the multiaddr directly)
        // but it is good practice for other nodes.
        `/dns4/my-relay.onrender.com/tcp/443/wss`
      ]
    },
    transports: [
      webSockets(),
      circuitRelayTransport()
    ],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    services: {
      identify: identify(),
      autoNat: autoNAT(),
      relay: circuitRelayServer({
        reservations: {
          maxReservations: 50,     
          reservationTtl: 600_000, // 10 minutes
          applyLimits: false       // Optional: limit data transfer
        }
      }),
      pubsub: gossipsub(),
    },
  })

  libp2p.services.pubsub.subscribe(PUBSUB_PEER_DISCOVERY)

  console.log('-------------------------------------------------------')
  console.log('Relay PeerID: ', libp2p.peerId.toString())
  console.log('Multiaddrs: ', libp2p.getMultiaddrs())
  console.log('-------------------------------------------------------')
}

main()
