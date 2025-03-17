import { io } from 'socket.io-client';

let socket = null;
const deviceListeners = new Map();

const connect = () => {
  const serverUrl = process.env.NODE_ENV === 'production' 
    ? 'https://nervemonitor.onrender.com' 
    : 'http://localhost:3002';
    
  socket = io(serverUrl, {
    withCredentials: true
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });
};

const subscribeToDevice = (deviceId, callback) => {
  if (!socket) return;

  // Remove existing listener if any
  if (deviceListeners.has(deviceId)) {
    socket.off(`device:${deviceId}`);
  }

  // Add new listener
  socket.on(`device:${deviceId}`, (data) => {
    callback(data);
  });

  // Store callback for cleanup
  deviceListeners.set(deviceId, callback);

  // Join device room
  socket.emit('subscribe:device', deviceId);
};

const unsubscribeFromDevice = (deviceId) => {
  if (!socket) return;

  socket.emit('unsubscribe:device', deviceId);
  socket.off(`device:${deviceId}`);
  deviceListeners.delete(deviceId);
};

const disconnect = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const socketService = {
  connect,
  subscribeToDevice,
  unsubscribeFromDevice,
  disconnect
}; 