// LEAKED_LISTENER_SUBSCRIPTION — verified positive fixtures

import { useEffect } from 'react';

// subtype: CLEAR_POSITIVE
export function WindowResizeHook() {
  useEffect(() => {
    const handler = () => console.log('resized');
    window.addEventListener('resize', handler);
  }, []);

  return <div />;
}

// subtype: REAL_WORLD_POSITIVE
export function SocketRoomChannel({ socket, roomId }) {
  useEffect(() => {
    socket.on('room-update', (msg) => console.log(msg));
  }, [roomId, socket]);

  return <span>{roomId}</span>;
}
