import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const login = async () => {
    try {
        const res = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@example.com', // Assuming default admin
            password: 'admin' // Assuming default password, need to check seed or ask user if fails
        });
        return res.data.token;
    } catch (error) {
        console.error('Login failed:', error.response?.data || error.message);
        return null;
    }
};

const checkStats = async (token) => {
    try {
        const res = await axios.get(`${API_URL}/d2dc/inspector/stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Stats Response:', JSON.stringify(res.data, null, 2));
    } catch (error) {
        console.error('Stats Check Failed:', error.response?.data || error.message);
    }
};

const run = async () => {
    const token = await login();
    if (token) {
        await checkStats(token);
    }
};

run();
