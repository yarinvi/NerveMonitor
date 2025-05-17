const express = require('express');
const router = express.Router();
const { signup, login, logout, checkAuthStatus, handleGoogleCallback } = require('../controllers/authController');
const { authenticateFirebaseToken } = require('../middleware/auth');
const admin = require('firebase-admin');

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.get('/check-status', authenticateFirebaseToken, checkAuthStatus);
router.post('/google/callback', handleGoogleCallback);
router.post('/set-token', async (req, res) => {
    try {
        const { idToken } = req.body;
        
        // Verify the ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        
        res.cookie('authToken', idToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/'
        });

        res.cookie('uid', decodedToken.uid, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/'
        });

        res.status(200).json({ message: 'Token set successfully' });
    } catch (error) {
        res.status(403).json({ error: error.message });
    }
});

module.exports = router;
