import axios from 'axios';

const API_URL = 'http://localhost:5000/api'; // Adjust based on your server config
const TOKEN = 'YOUR_ADMIN_TOKEN'; // This script expects a valid token or should be run with a bypass for local testing

async function verifyModules() {


    try {
        // 1. Verify Toilet Module
        const toiletStats = await axios.get(`${API_URL}/toilet/reports/stats`);


        // 2. Verify MRF Module
        const mrfStats = await axios.get(`${API_URL}/mrf/reports/stats`);


        // 3. Verify Gaushala Module
        const gaushalaStats = await axios.get(`${API_URL}/gaushala/reports/stats`);


        // 4. Verify Facility Listing
        const toiletList = await axios.get(`${API_URL}/toilet/facilities`);


        const mrfList = await axios.get(`${API_URL}/mrf/facilities`);


        const gaushalaList = await axios.get(`${API_URL}/gaushala/facilities`);



    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

// verifyModules();
// Note: To run this, you need a running server and valid authentication.

