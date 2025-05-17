import api from './api';

export const getUserDevices = async () => {
    try {
        const { data } = await api.get('/device/devices');
        return data;
    } catch (error) {
        const message = error.response?.data?.error || 'Failed to fetch devices';
        throw new Error(message);
    }
};

export const getDeviceData = async (deviceId) => {
    try {
        const { data } = await api.get(`/device/${deviceId}/data`);
        return data;
    } catch (error) {
        throw new Error('Failed to fetch device data');
    }
};

export const updateDeviceSettings = async (deviceId, settings) => {
    try {
        const { data } = await api.post(`/device/${deviceId}/settings`, settings);
        return data;
    } catch (error) {
        const message = error.response?.data?.error || 'Failed to update device settings';
        throw new Error(message);
    }
}; 