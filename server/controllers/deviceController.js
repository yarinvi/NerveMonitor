const admin = require('firebase-admin');

const getUserDevices = async (req, res) => {
    try {
        const db = admin.database();
        const userId = req.user.uid;
        const snapshot = await db.ref(`users/${userId}/devices`).get();
        
        if (snapshot.exists()) {
            res.status(200).json(snapshot.val());
        } else {
            res.status(200).json({});
        }
    } catch (error) {
        console.error('Error fetching user devices:', error);
        res.status(500).json({ error: error.message });
    }
};

const getDeviceData = async (req, res) => {
    try {
        const db = admin.database();
        const userId = req.user.uid;
        const deviceId = req.params.deviceId;
        
        // Check if user owns this device
        const deviceRef = db.ref(`users/${userId}/devices/${deviceId}`);
        const deviceSnapshot = await deviceRef.get();
        
        if (!deviceSnapshot.exists()) {
            return res.status(403).json({ message: 'Device not found or unauthorized' });
        }
        
        // Get data, settings, and history
        const deviceRootRef = db.ref(`devices/${deviceId}`);
        const snapshot = await deviceRootRef.get();
        
        const deviceData = snapshot.exists() ? snapshot.val() : {};
        
        const response = {
            data: deviceData.data || {
                bpm: 0,
                spo2: 0,
                internal_temperature: 0,
                motor_state: 0,
                client_on: 0
            },
            settings: deviceData.settings || {
                bpm_threshold: 120,
                spo2_threshold: 95,
                temperature_threshold: 36.5,
                sensitivity: 'medium',
                led_color: '#4CAF50',
                vibration_intensity: 50,
                client_on: 0
            },
            history: deviceData.history || []
        };
        
        res.status(200).json(response);
    } catch (error) {
        console.error('Error fetching device data:', error);
        res.status(500).json({ error: error.message });
    }
};

const updateDeviceSettings = async (req, res) => {
    try {
        const db = admin.database();
        const userId = req.user.uid;
        const deviceId = req.params.deviceId;
        
        // Check if user owns this device
        const deviceRef = db.ref(`users/${userId}/devices/${deviceId}`);
        const deviceSnapshot = await deviceRef.get();
        
        if (!deviceSnapshot.exists()) {
            return res.status(403).json({ message: 'Device not found or unauthorized' });
        }
        
        // Get current settings
        const settingsRef = db.ref(`devices/${deviceId}/settings`);
        const currentSettingsSnapshot = await settingsRef.get();
        const currentSettings = currentSettingsSnapshot.exists() ? currentSettingsSnapshot.val() : {};
        
        // Merge current settings with new settings
        const settings = {
            ...currentSettings,
            bpm_threshold: req.body.bpm_threshold ?? currentSettings.bpm_threshold,
            spo2_threshold: req.body.spo2_threshold ?? currentSettings.spo2_threshold,
            temperature_threshold: req.body.temperature_threshold ?? currentSettings.temperature_threshold,
            sensitivity: req.body.sensitivity ?? currentSettings.sensitivity,
            led_color: req.body.led_color ?? currentSettings.led_color,
            vibration_intensity: req.body.vibration_intensity ?? currentSettings.vibration_intensity,
            client_on: req.body.client_on ?? currentSettings.client_on ?? 0
        };

        // Update settings
        await settingsRef.set(settings);
        
        // If client_on is being updated, also update the data/client_on field
        if (req.body.client_on !== undefined) {
            const dataRef = db.ref(`devices/${deviceId}/data`);
            await dataRef.update({
                client_on: req.body.client_on
            });
        }
        
        res.status(200).json({ message: 'Settings updated successfully', settings });
    } catch (error) {
        console.error('Error updating device settings:', error);
        res.status(500).json({ error: error.message });
    }
};

const registerDevice = async (req, res) => {
    try {
        const db = admin.database();
        const userId = req.user.uid;
        const { deviceId, name } = req.body;
        
        // Check if device exists
        const deviceRef = db.ref(`devices/${deviceId}`);
        const deviceSnapshot = await deviceRef.get();
        
        if (!deviceSnapshot.exists()) {
            // Initialize device if it doesn't exist
            await db.ref(`devices/${deviceId}`).set({
                settings: {
                    bpm_threshold: 120,
                    spo2_threshold: 95,
                    temperature_threshold: 38,
                    sensitivity: 'medium',
                    led_color: '#4CAF50',
                    vibration_intensity: 50
                },
                data: {
                    bpm: 0,
                    spo2: 0,
                    internal_temperature: 0,
                    motor_state: 0,
                    history: []
                }
            });
        }
        
        // Associate device with user
        const userDeviceRef = db.ref(`users/${userId}/devices/${deviceId}`);
        await userDeviceRef.set({
            name: name || 'My Seizure Monitor',
            registered: new Date().toISOString()
        });
        
        res.status(201).json({
            message: 'Device registered successfully',
            deviceId
        });
    } catch (error) {
        console.error('Error registering device:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getUserDevices,
    getDeviceData,
    updateDeviceSettings,
    registerDevice
}; 