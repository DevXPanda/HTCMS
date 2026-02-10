
const BASE_URL = 'http://localhost:5000/api';

async function testD2DCWorkflow() {
    try {
        console.log('--- Starting D2DC Workflow Verification ---');

        // 1. Login as Admin
        console.log('1. Logging in as Admin...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@example.com', password: 'admin' })
        });

        const loginData = await loginRes.json();
        if (!loginData.success) {
            throw new Error(`Login failed: ${loginData.message}`);
        }

        const token = loginData.token;
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        console.log('   Login successful');

        // 2. Search Property
        console.log('\n2. Testing Property Search...');
        const searchRes = await fetch(`${BASE_URL}/d2dc/search/properties?query=PROP`, { headers });
        const searchData = await searchRes.json();

        if (searchData.success && searchData.data.length > 0) {
            console.log(`   Found ${searchData.data.length} properties`);
            const property = searchData.data[0];
            console.log(`   Selected Property: ${property.propertyNumber} (ID: ${property.id})`);

            // 3. Generate Demand
            console.log('\n3. Testing Demand Generation...');
            const demandRes = await fetch(`${BASE_URL}/d2dc/demand/generate`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    propertyId: property.id,
                    remarks: 'Test Demand via Script ' + Date.now()
                })
            });

            const demandData = await demandRes.json();

            if (demandData.success) {
                const demand = demandData.data;
                console.log(`   Demand Generated: ${demand.demandNumber} (ID: ${demand.id})`);
                console.log(`   Amount: ${demand.totalAmount}`);

                // 4. Collect Payment
                console.log('\n4. Testing Payment Collection...');
                const paymentRes = await fetch(`${BASE_URL}/d2dc/payment/collect`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        demandId: demand.id,
                        amount: 50,
                        paymentMode: 'cash',
                        remarks: 'Test Payment via Script'
                    })
                });

                const paymentData = await paymentRes.json();

                if (paymentData.success) {
                    const payment = paymentData.data.payment;
                    console.log(`   Payment Collected: ${payment.receiptNumber} (ID: ${payment.id})`);
                    console.log(`   Status: Success`);
                } else {
                    console.error('   Payment Failed:', paymentData.message);
                }
            } else {
                // Check if it failed because demand already exists
                if (demandData.message && demandData.message.includes('already exists')) {
                    console.log('   Demand generation skipped: Active demand already exists.');
                    // Try to find the existing demand
                    // For testing simply, we might skip payment or query existing demands for this property
                    console.log('   Skipping payment collection test on this property to avoid complexity with existing demand retrieval in this simple script.');
                } else {
                    console.error('   Demand Generation Failed:', demandData.message);
                }
            }
        } else {
            console.log('   No properties found to test with. Seed data might be needed or search query "PROP" yielded no results.');
        }

        // 5. Verify Inspector Stats
        console.log('\n5. Verifying Inspector Monitoring...');
        const statsRes = await fetch(`${BASE_URL}/d2dc/inspector/stats`, { headers });
        const statsData = await statsRes.json();

        if (statsData.success) {
            console.log('   Inspector Stats fetched successfully');
            console.log(`   Total Collections: ${statsData.data.stats?.totalCollections}`);
        } else {
            console.error('   Inspector Stats Failed:', statsData.message);
        }

        console.log('\n--- Verification Complete ---');

    } catch (error) {
        console.error('Verification Failed:', error.message);
    }
}

testD2DCWorkflow();
