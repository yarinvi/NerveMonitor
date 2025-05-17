import api from './api'
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { connectFB } from '../lib/connectFB'

export const signUp = async (payload) => {
    try {
        const {data} = await api.post('/auth/signup', payload);

        return data;
    } catch (error) {
        const message = error.response?.data?.error || 'An error occurred while signing up. Please try again.';
        
        throw new Error(message);
    }
};

export const login = async (payload) => {
    try {
        if (payload?.provider === 'google') {
            const { auth } = connectFB();
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const idToken = await result.user.getIdToken();
            
            // Send the ID token to your backend
            const { data } = await api.post('/auth/google/callback', { idToken }, {
                withCredentials: true
            });
            return data;
        }

        if (payload) {
            const { data } = await api.post('/auth/login', payload, {
                withCredentials: true
            });
            return data;
        }
        return await checkAuthStatus();
    } catch (error) {
        const message = error.response?.data?.error || 'An error occurred while logging in. Please try again.';
        throw new Error(message);
    }
};

export const logout = async () => {
    try {
        await api.post('/auth/logout');
    } catch (error) {
        const message = error.response?.data?.error || 'An error occurred while logging out. Please try again.';
        
        throw new Error(message);
    }
};

export const checkAuthStatus = async () => {
    try {
        const { data } = await api.get('/auth/check-status', {
            withCredentials: true
        });
        return data.user;
    } catch (error) {
        const message = error.response?.data?.error || 'An error occurred while checking authentication status.';
        throw new Error(message);
    }
};

export const getAuthToken = async () => {
    try {
        const { data } = await api.get('/auth/token', {
            withCredentials: true
        });
        return data.token;
    } catch (error) {
        const message = error.response?.data?.error || 'Failed to get authentication token';
        throw new Error(message);
    }
};
