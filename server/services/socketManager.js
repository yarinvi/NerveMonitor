const { Server } = require('socket.io');
const admin = require('firebase-admin');

function createSocketManager(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? ['https://nervemonitor.onrender.com']
        : ['http://localhost:5173'],
      credentials: true,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
    }
  });
  
  const deviceRooms = new Map();

  function setupAuthMiddleware() {
    io.use(async (socket, next) => {
      try {
        const cookies = socket.handshake.headers.cookie;
        if (!cookies) {
          return next(new Error('Authentication required'));
        }

        const cookieObj = cookies.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {});

        const sessionCookie = cookieObj.authToken;
        const uid = cookieObj.uid;

        if (!sessionCookie || !uid) {
          return next(new Error('Authentication required'));
        }

        try {
          const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie);
          if (decodedClaims.uid !== uid) {
            return next(new Error('Invalid authentication'));
          }

          socket.userId = uid;
          next();
        } catch (error) {
          console.error('Session verification error:', error);
          next(new Error('Invalid session'));
        }
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication error'));
      }
    });
  }

  function setupConnectionHandlers() {
    io.on('connection', (socket) => {
      console.log(`User connected: ${socket.userId}`);

      socket.on('subscribe:device', async (deviceId) => {
        try {
          const db = admin.database();
          // First check user's devices
          const deviceRef = db.ref(`users/${socket.userId}/devices/${deviceId}`);
          const snapshot = await deviceRef.get();

          if (snapshot.exists()) {
            socket.join(`device:${deviceId}`);
            deviceRooms.set(deviceId, socket.userId);
            console.log(`User ${socket.userId} subscribed to device ${deviceId}`);
            
            // Immediately fetch and send initial device data
            const dataRef = db.ref(`devices/${deviceId}`);
            const deviceData = await dataRef.get();
            if (deviceData.exists()) {
              const data = deviceData.val();
              const response = formatDeviceData(data);
              io.to(`device:${deviceId}`).emit(`device:${deviceId}`, response);
            }
          }
        } catch (error) {
          console.error('Device subscription error:', error);
        }
      });

      socket.on('unsubscribe:device', (deviceId) => {
        socket.leave(`device:${deviceId}`);
        deviceRooms.delete(deviceId);
      });

      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.userId}`);
      });
    });
  }

  function formatDeviceData(deviceData) {
    return {
      data: deviceData.data || {
        bpm: 0,
        spo2: 0,
        internal_temperature: 0,
        motor_state: 0
      },
      settings: deviceData.settings || {
        bpm_threshold: 120,
        spo2_threshold: 95,
        temperature_threshold: 36.5,
        sensitivity: 'medium',
        led_color: '#4CAF50',
        vibration_intensity: 50
      },
      history: deviceData.history || []
    };
  }

  function setupDeviceDataListener() {
    const db = admin.database();
    const devicesRef = db.ref('devices');

    devicesRef.on('child_changed', async (snapshot) => {
      const deviceId = snapshot.key;
      const userId = deviceRooms.get(deviceId);

      if (userId) {
        const deviceData = snapshot.val();
        console.log('Device data update:', deviceId, deviceData);
        const response = formatDeviceData(deviceData);
        io.to(`device:${deviceId}`).emit(`device:${deviceId}`, response);
      }
    });
  }

  // Initialize everything
  setupAuthMiddleware();
  setupConnectionHandlers();
  setupDeviceDataListener();

  return io;
}

module.exports = createSocketManager; 