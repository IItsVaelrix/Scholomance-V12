// LEAKED_LISTENER_SUBSCRIPTION — hard-negative fixtures

import { useEffect } from 'react';

// subtype: DIRECT_HARD_NEGATIVE
export function WindowResizeWithCleanup() {
  useEffect(() => {
    const handler = () => console.log('resized');
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return <div />;
}

// subtype: ADVERSARIAL_HARD_NEGATIVE
export function SocketRoomWithOff({ socket, roomId }) {
  useEffect(() => {
    const handler = (msg) => console.log(msg);
    socket.on('room-update', handler);
    return () => socket.off('room-update', handler);
  }, [roomId, socket]);

  return <span>{roomId}</span>;
}
