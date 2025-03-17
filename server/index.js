const express = require('express')
const http = require('http')
const app = express()
const { initializeFirebaseAdmin } = require('./lib/firebaseAdmin')
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/device');
const cors = require('cors');
const SocketManager = require('./services/socketManager');
const path = require('path');

app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://nervemonitor.onrender.com']
        : ['http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

app.use(express.json());
app.use(cookieParser());

// Initialize Firebase Admin first
initializeFirebaseAdmin();

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Initialize socket manager
const server = http.createServer(app);
new SocketManager(server);

// Register routes with /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/device', deviceRoutes);

// Catch-all route for React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});