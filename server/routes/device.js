const express = require('express');
const router = express.Router();
const { 
    getDeviceData, 
    updateDeviceSettings, 
    getUserDevices, 
    registerDevice 
} = require('../controllers/deviceController');
const { authenticateFirebaseToken } = require('../middleware/auth');

router.use(authenticateFirebaseToken);

// Get all user's devices
router.get('/devices', getUserDevices);
// Register new device
router.post('/register', registerDevice);
// Get specific device data
router.get('/:deviceId/data', getDeviceData);
// Update specific device settings
router.post('/:deviceId/settings', updateDeviceSettings);

module.exports = router; 