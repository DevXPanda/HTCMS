import http from 'http';

const post = (path, body) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api' + path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify(body))
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });

        req.on('error', (e) => reject(e));
        req.write(JSON.stringify(body));
        req.end();
    });
};

const get = (path, token) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api' + path,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
};

const postAuth = (path, body, token) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api' + path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify(body)),
                'Authorization': `Bearer ${token}`
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });

        req.on('error', (e) => reject(e));
        req.write(JSON.stringify(body));
        req.end();
    });
};

async function runTest() {
    try {
        console.log('1. Logging in...');
        const loginRes = await post('/auth/login', { email: 'admin@example.com', password: 'admin' });

        if (!loginRes.success) throw new Error('Login failed: ' + loginRes.message);
        console.log('   Login successful');
        const token = loginRes.token;

        console.log('\n2. Searching Property...');
        const searchRes = await get('/d2dc/search/properties?query=PROP', token);

        if (searchRes.success && searchRes.data.length > 0) {
            console.log(`   Found ${searchRes.data.length} properties`);
            const property = searchRes.data[0];

            console.log('\n3. Generating Demand...');
            const demandRes = await postAuth('/d2dc/demand/generate', {
                propertyId: property.id,
                remarks: 'Test via HTTP script'
            }, token);

            if (demandRes.success) {
                console.log(`   Demand Generated: ${demandRes.data.demandNumber}`);

                console.log('\n4. Collecting Payment...');
                const paymentRes = await postAuth('/d2dc/payment/collect', {
                    demandId: demandRes.data.id,
                    amount: 50,
                    paymentMode: 'cash',
                    remarks: 'Test Payment via HTTP script'
                }, token);

                if (paymentRes.success) {
                    console.log(`   Payment Collected: ${paymentRes.data.payment.receiptNumber}`);
                } else {
                    console.log('   Payment Failed:', paymentRes.message);
                }
            } else {
                console.log('   Demand Generation Failed (likely duplicate):', demandRes.message);
            }
        } else {
            console.log('   No properties found.');
        }

        console.log('\n5. Verifying Inspector Stats...');
        const statsRes = await get('/d2dc/inspector/stats', token);
        if (statsRes.success) {
            console.log(`   Total Collections: ${statsRes.data.stats?.totalCollections}`);
        }

    } catch (error) {
        console.error('Test Failed:', error.message);
    }
}

runTest();
