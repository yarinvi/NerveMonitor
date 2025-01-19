import api from './api'

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
