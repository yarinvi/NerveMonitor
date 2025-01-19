import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.deviceListeners = new Map();
  }

  connect() {
    this.socket = io('http://localhost:3002', {
      withCredentials: true
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  subscribeToDevice(deviceId, callback) {
    if (!this.socket) return;

    // Remove existing listener if any
    if (this.deviceListeners.has(deviceId)) {
      this.socket.off(`device:${deviceId}`);
    }

    // Add new listener
    this.socket.on(`device:${deviceId}`, (data) => {
      callback(data);
    });

    // Store callback for cleanup
    this.deviceListeners.set(deviceId, callback);

    // Join device room
    this.socket.emit('subscribe:device', deviceId);
  }

  unsubscribeFromDevice(deviceId) {
    if (!this.socket) return;

    this.socket.emit('unsubscribe:device', deviceId);
    this.socket.off(`device:${deviceId}`);
    this.deviceListeners.delete(deviceId);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService(); 