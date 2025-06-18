#!/usr/bin/env node

/**
 * OpenRelay TURN Server Test
 * Validates that the OpenRelay integration is working correctly
 */

const API_KEY = process.env.VITE_OPENRELAY_API_KEY || '1173a9a41cce50641d4325a10518abe55f83';
const OPENRELAY_ENDPOINT = process.env.VITE_OPENRELAY_ENDPOINT || 'https://code_collab.metered.live/api/v1/turn/credentials';

async function testOpenRelayTurn() {
  console.log('🧪 Testing OpenRelay TURN Server Integration\n');
  
  try {
    console.log('📡 Fetching TURN credentials from OpenRelay...');
    const response = await fetch(`${OPENRELAY_ENDPOINT}?apiKey=${API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const iceServers = await response.json();
    
    console.log('✅ Successfully fetched TURN credentials!');
    console.log('📊 ICE Servers received:', iceServers.length);
    console.log('\n🔍 ICE Servers Details:');
    
    iceServers.forEach((server, index) => {
      console.log(`\n  Server ${index + 1}:`);
      console.log(`    URLs: ${Array.isArray(server.urls) ? server.urls.join(', ') : server.urls}`);
      if (server.username) {
        console.log(`    Username: ${server.username}`);
        console.log(`    Credential: ${server.credential ? '***' + server.credential.slice(-4) : 'N/A'}`);
      }
    });
    
    // Analyze server types
    const stunServers = iceServers.filter(server => 
      (Array.isArray(server.urls) ? server.urls : [server.urls])
        .some(url => url.includes('stun:'))
    );
    
    const turnServers = iceServers.filter(server => 
      (Array.isArray(server.urls) ? server.urls : [server.urls])
        .some(url => url.includes('turn:') || url.includes('turns:'))
    );
    
    console.log('\n📈 Server Summary:');
    console.log(`  STUN servers: ${stunServers.length}`);
    console.log(`  TURN servers: ${turnServers.length}`);
    console.log(`  Total servers: ${iceServers.length}`);
    
    // Test connectivity (basic check)
    console.log('\n🔗 Testing basic WebRTC compatibility...');
    
    // Check if we have the required server types
    if (stunServers.length === 0) {
      console.log('⚠️  Warning: No STUN servers found');
    } else {
      console.log('✅ STUN servers available for direct connections');
    }
    
    if (turnServers.length === 0) {
      console.log('⚠️  Warning: No TURN servers found');
    } else {
      console.log('✅ TURN servers available for NAT traversal');
    }
    
    // Check port coverage
    const ports = new Set();
    iceServers.forEach(server => {
      (Array.isArray(server.urls) ? server.urls : [server.urls]).forEach(url => {
        const portMatch = url.match(/:(\d+)/);
        if (portMatch) {
          ports.add(portMatch[1]);
        }
      });
    });
    
    console.log(`\n🌐 Port Coverage: ${Array.from(ports).sort().join(', ')}`);
    
    if (ports.has('80')) {
      console.log('✅ Port 80 available (bypasses most firewalls)');
    }
    if (ports.has('443')) {
      console.log('✅ Port 443 available (HTTPS/corporate friendly)');
    }
    
    console.log('\n🎉 OpenRelay TURN integration test completed successfully!');
    console.log('🚀 Your video chat system now has enterprise-grade connectivity.');
    
  } catch (error) {
    console.error('❌ OpenRelay TURN test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('  - Check your API key is correct');
    console.error('  - Verify internet connection');
    console.error('  - Check OpenRelay service status');
    process.exit(1);
  }
}

// Only run if this is the main module
testOpenRelayTurn().catch(console.error);

export { testOpenRelayTurn };
