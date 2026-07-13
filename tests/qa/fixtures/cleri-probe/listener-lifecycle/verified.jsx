// LEAKED_LISTENER_SUBSCRIPTION — verified positive fixtures

import { useEffect } from 'react';

export function WindowResizeHook() {
  useEffect(() => {
    const handler = () => console.log('resized');
    window.addEventListener('resize', handler);
  }, []);

  return <div />;
}

export function SocketRoomChannel({ socket, roomId }) {
  useEffect(() => {
    socket.on('room-update', (msg) => console.log(msg));
  }, [roomId, socket]);

  return <span>{roomId}</span>;
}
