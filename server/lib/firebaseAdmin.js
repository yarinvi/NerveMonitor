const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

let firebaseAdmin;

function initializeFirebaseAdmin() {
  try {
    if (!firebaseAdmin) {
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FB_DATABASE_URL
      });
    }
    return firebaseAdmin;
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
}

module.exports = { initializeFirebaseAdmin }; 