import axios from 'axios';

const API_URL = 'http://localhost:5000/api'; // Adjust based on your server config
const TOKEN = 'YOUR_ADMIN_TOKEN'; // This script expects a valid token or should be run with a bypass for local testing

async function verifyModules() {
    console.log('--- HTCMS Module Verification Started ---');

    try {
        // 1. Verify Toilet Module
        const toiletStats = await axios.get(`${API_URL}/toilet/reports/stats`);
        console.log('✅ Toilet Reports API status:', toiletStats.status);

        // 2. Verify MRF Module
        const mrfStats = await axios.get(`${API_URL}/mrf/reports/stats`);
        console.log('✅ MRF Reports API status:', mrfStats.status);

        // 3. Verify Gaushala Module
        const gaushalaStats = await axios.get(`${API_URL}/gaushala/reports/stats`);
        console.log('✅ Gaushala Reports API status:', gaushalaStats.status);

        // 4. Verify Facility Listing
        const toiletList = await axios.get(`${API_URL}/toilet/facilities`);
        console.log(`✅ Toilet Listing: ${toiletList.data.data.facilities.length} records found`);

        const mrfList = await axios.get(`${API_URL}/mrf/facilities`);
        console.log(`✅ MRF Listing: ${mrfList.data.data.facilities.length} records found`);

        const gaushalaList = await axios.get(`${API_URL}/gaushala/facilities`);
        console.log(`✅ Gaushala Listing: ${gaushalaList.data.data.facilities.length} records found`);

        console.log('\n--- All Core Module Endpoints Verified ---');
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

// verifyModules(); 
// Note: To run this, you need a running server and valid authentication.
console.log('Verification script ready. Run with "node backend/scripts/verify-modules.js" after setting a valid token.');
