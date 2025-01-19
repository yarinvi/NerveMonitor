const express = require('express')
const app = express()
const { initializeFirebaseAdmin } = require('./lib/firebaseAdmin')
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/device');
const cors = require('cors');

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());

// Initialize Firebase Admin first
initializeFirebaseAdmin();

// Register routes
app.use('/auth', authRoutes);
app.use('/device', deviceRoutes);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});