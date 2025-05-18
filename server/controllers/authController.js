const admin = require('firebase-admin');
const { getAuth, signInWithCustomToken, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } = require('firebase/auth');
const { connectFB } = require('../lib/connectFB');

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
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/'
        });

        res.cookie('uid', userRecord.uid, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
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
        const { email, password, provider } = req.body;
        
        let userRecord;
        let idToken;

        if (provider === 'google') {
            const { auth } = connectFB();
            const googleProvider = new GoogleAuthProvider();
            
            // Return the Google Auth URL to the client
            res.status(200).json({
                authUrl: `https://${process.env.FB_AUTH_DOMAIN}/auth/google?apiKey=${process.env.FB_API_KEY}&redirect_uri=${process.env.CLIENT_URL}/login`
            });
            return;
        }

        // Regular email/password login
        try {
            // First verify the credentials with Firebase Auth
            const { auth } = connectFB();
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            userRecord = await admin.auth().getUser(userCredential.user.uid);
            idToken = await userCredential.user.getIdToken();
        } catch (authError) {
            console.error('Authentication failed:', authError);
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Create a session cookie with the ID token
        const sessionCookie = await admin.auth().createSessionCookie(idToken, {
            expiresIn: 24 * 60 * 60 * 1000 // 24 hours
        });
        
        res.cookie('authToken', sessionCookie, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/'
        });

        res.cookie('uid', userRecord.uid, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
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

// Add new route handler for Google OAuth callback
const handleGoogleCallback = async (req, res) => {
    try {
        const { idToken } = req.body;
        
        // Verify the ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userRecord = await admin.auth().getUser(decodedToken.uid);
        
        // Create session cookie
        const sessionCookie = await admin.auth().createSessionCookie(idToken, {
            expiresIn: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.cookie('authToken', sessionCookie, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/'
        });

        res.cookie('uid', userRecord.uid, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/'
        });

        res.status(200).json({
            message: 'Google login successful',
            user: {
                uid: userRecord.uid,
                email: userRecord.email
            }
        });
    } catch (error) {
        console.error('Google callback error:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { signup, login, logout, checkAuthStatus, handleGoogleCallback };
