// @ts-check
import { createLibp2p } from 'libp2p'
import { autoNAT } from '@libp2p/autonat'
import { identify } from '@libp2p/identify'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { webSockets } from '@libp2p/websockets'
import { tcp } from '@libp2p/tcp'
import { webRTC, webRTCDirect } from '@libp2p/webrtc'
import { circuitRelayServer, circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { PUBSUB_PEER_DISCOVERY } from './constants.js'

const port = parseInt(process.env.PORT || '9001')

async function main() {
  // enable('*')
  const libp2p = await createLibp2p({
    addresses: {
    listen: [
      `/ip4/0.0.0.0/tcp/${port}/ws` // Listen on Render's assigned port
    ],
    // 💡 IMPORTANT: You must announce the public WSS address
    announce: [
      `/dns4/js-test-relay.onrender.com/tcp/443/wss`
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
        maxReservations: 10,      // Increase this if needed
        reservationTtl: 600_000,   // 10 minutes
        applyLimits: false         // Set to false for testing to rule out rate-limiting
      }
  }),
      pubsub: gossipsub(),
    },
  })

  libp2p.services.pubsub.subscribe(PUBSUB_PEER_DISCOVERY)

  console.log('PeerID: ', libp2p.peerId.toString())
  console.log('Multiaddrs: ', libp2p.getMultiaddrs())
}

main()
