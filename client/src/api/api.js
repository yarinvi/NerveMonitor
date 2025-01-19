import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3002',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true
});

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Redirect to login if unauthorized
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

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

export const register = async (formData) => {
    try {
        const { data } = await api.post('/auth/signup', formData);
        return data;
    } catch (error) {
        const message = error.response?.data?.error || 'Registration failed';
        throw new Error(message);
    }
};

export default api;