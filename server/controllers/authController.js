const admin = require('firebase-admin');

const signup = async (req, res) => {
    try {
        const { email, password, deviceId } = req.body;
        
        if (!deviceId) {
            return res.status(400).json({ error: 'Device ID is required' });
        }

        const db = admin.database();
        
        // Create user
        const userRecord = await admin.auth().createUser({
            email,
            password,
        });
        
        // Register user's device
        await db.ref(`users/${userRecord.uid}/devices/${deviceId}`).set({
            name: 'My Seizure Monitor',
            registered: new Date().toISOString()
        });

        // Initialize device settings if they don't exist
        const settingsSnapshot = await db.ref(`devices/${deviceId}/settings`).get();
        
        if (!settingsSnapshot.exists()) {
            await db.ref(`devices/${deviceId}/settings`).set({
                bpm_threshold: 120,
                spo2_threshold: 95,
                temperature_threshold: 38,
                sensitivity: 'medium'
            });
        }
        
        // Create custom token
        const customToken = await admin.auth().createCustomToken(userRecord.uid);
        
        // Get ID token using custom token
        const { getAuth, signInWithCustomToken } = require('firebase/auth');
        const { connectFB } = require('../lib/connectFB');
        const { auth } = connectFB();
        
        const userCredential = await signInWithCustomToken(auth, customToken);
        const idToken = await userCredential.user.getIdToken();
        
        // Create session cookie
        const sessionCookie = await admin.auth().createSessionCookie(idToken, {
            expiresIn: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.cookie('authToken', sessionCookie, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/'
        });

        res.cookie('uid', userRecord.uid, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/'
        });

        res.status(201).json({
            message: 'User created and device registered successfully',
            user: {
                uid: userRecord.uid,
                email: userRecord.email
            },
            deviceId
        });
    } catch (error) {
        console.error('Error in signup:', error);
        res.status(400).json({ error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Get user record by email
        const userRecord = await admin.auth().getUserByEmail(email);
        
        // Create a custom token
        const customToken = await admin.auth().createCustomToken(userRecord.uid);
        
        // Get an ID token using the custom token
        const { getAuth, signInWithCustomToken } = require('firebase/auth');
        const { connectFB } = require('../lib/connectFB');
        const { auth } = connectFB();
        
        const userCredential = await signInWithCustomToken(auth, customToken);
        const idToken = await userCredential.user.getIdToken();
        
        // Create a session cookie with the ID token
        const sessionCookie = await admin.auth().createSessionCookie(idToken, {
            expiresIn: 24 * 60 * 60 * 1000 // 24 hours
        });
        
        res.cookie('authToken', sessionCookie, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/'
        });

        res.cookie('uid', userRecord.uid, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/'
        });

        res.status(200).json({
            message: 'Login successful',
            user: {
                uid: userRecord.uid,
                email: userRecord.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
};

const logout = async (req, res) => {
    try {
        res.clearCookie('authToken', { path: '/' });
        res.clearCookie('uid', { path: '/' });
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const checkAuthStatus = async (req, res) => {
    try {
        res.status(200).json({ user: req.user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { signup, login, logout, checkAuthStatus };
