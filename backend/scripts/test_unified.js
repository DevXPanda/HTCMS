
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

async function testUnifiedGeneration() {
    let token;

    // 1. Login
    console.log('Logging in...');
    try {
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'nktechipl@gmail.com',
            password: 'password123'
        });
        token = loginRes.data.token;
        console.log('Login successful with "password123".');
    } catch (e) {
        if (e.response) {
            console.error('Login Failed Status:', e.response.status);
            console.error('Login Failed Data:', e.response.data);
        } else {
            console.error('Login Error:', e.message);
        }
        return;
    }

    // 2. Call Generate Unified
    console.log('Calling generate-unified...');
    const currentYear = new Date().getFullYear();

    // Use a property we know exists or try property 16/6 from logs
    // Logs showed property 16 and 6.
    const propertyId = 16;

    const payload = {
        propertyId: propertyId,
        assessmentYear: currentYear,
        financialYear: `${currentYear}-${String(currentYear + 1).slice(-2)}`,
        dueDate: new Date().toISOString().split('T')[0],
        remarks: 'Test Unified Generation',
        defaultTaxRate: 1.5
    };

    console.log('Payload:', payload);

    try {
        const res = await axios.post(`${API_URL}/demands/generate-unified`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Response Status:', res.status);
        console.log('Response Data:', JSON.stringify(res.data, null, 2));

    } catch (error) {
        console.error('Unified Generation Failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data Message:', error.response.data?.message || 'No message');
            console.error('Full Data:', JSON.stringify(error.response.data).substring(0, 500)); // Limit length
        } else {
            console.error('Error:', error.message);
        }
    }
}

testUnifiedGeneration();
