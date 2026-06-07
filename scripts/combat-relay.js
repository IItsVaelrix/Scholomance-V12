import { WebSocketServer } from 'ws';

const PORT = Number(process.env.SCHOLO_COMBAT_RELAY_PORT || 3001);

const wss = new WebSocketServer({ port: PORT });

let host = null;
const clients = new Set();
let lastInitPatch = null;

function sendSafe(socket, packet) {
  if (!socket || socket.readyState !== socket.OPEN) return;

  socket.send(JSON.stringify({
    protocol: 'SCHOLO_COMBAT_BRIDGE',
    version: 1,
    sentAt: Date.now(),
    ...packet,
  }));
}

function broadcastToClients(packet) {
  for (const client of clients) {
    sendSafe(client, packet);
  }
}

wss.on('connection', (socket) => {
  let role = 'unknown';

  socket.on('message', (raw) => {
    let packet;

    try {
      packet = JSON.parse(String(raw));
    } catch {
      sendSafe(socket, {
        type: 'BRIDGE_ERROR',
        code: 'INVALID_JSON',
      });
      return;
    }

    if (packet.type === 'HELLO') {
      role = packet.role;

      if (role === 'host') {
        host = socket;
        sendSafe(socket, { type: 'HOST_ACCEPTED' });
        return;
      }

      if (role === 'client') {
        clients.add(socket);
        sendSafe(socket, { type: 'CLIENT_ACCEPTED' });

        if (lastInitPatch) {
          sendSafe(socket, lastInitPatch);
        }

        return;
      }
    }

    if (role === 'host' && (packet.type === 'COMBAT_INIT' || packet.type === 'COMBAT_STATE_PATCH')) {
      if (packet.type === 'COMBAT_INIT') {
        lastInitPatch = packet;
      }
      broadcastToClients(packet);
      return;
    }

    if (role === 'host' && packet.type === 'COMBAT_ACTION') {
      broadcastToClients(packet);
      return;
    }

    if (role === 'client' && packet.type === 'COMBAT_COMMAND') {
      sendSafe(host, packet);
      return;
    }

    sendSafe(socket, {
      type: 'BRIDGE_ERROR',
      code: 'UNHANDLED_PACKET',
      receivedType: packet.type,
      role,
    });
  });

  socket.on('close', () => {
    if (socket === host) host = null;
    clients.delete(socket);
  });
});

console.log(`[combat-relay] listening on ws://127.0.0.1:${PORT}`);
