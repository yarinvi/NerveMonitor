const admin = require('firebase-admin');

async function authenticateFirebaseToken(req, res, next) {
    const cookieToken = req.cookies.authToken;

    if (!cookieToken) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    try {
        // Verify the session cookie
        const decodedClaims = await admin.auth().verifySessionCookie(cookieToken, true);
        const userRecord = await admin.auth().getUser(decodedClaims.uid);

        if (!userRecord || userRecord.uid !== req.cookies.uid) {
            return res.status(403).json({ message: 'Not authenticated' });
        }

        req.user = {
            uid: userRecord.uid,
            email: userRecord.email
        };
        next();
    } catch (error) {
        console.error('Authentication failed:', error);
        res.status(403).json({ message: 'Invalid authentication' });
    }
}

module.exports = { authenticateFirebaseToken };
