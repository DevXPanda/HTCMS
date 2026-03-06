import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Razorpay instance only if keys are provided
let razorpay = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
} else {
    if (process.env.NODE_ENV === 'development') {
        console.warn('Razorpay keys not set. Online payment disabled. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
    }
    // Create a mock object to prevent errors
    razorpay = {
        orders: {
            create: async () => {
                throw new Error('Razorpay not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
            }
        },
        payments: {
            fetch: async () => {
                throw new Error('Razorpay not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
            }
        }
    };
}

export default razorpay;
export { razorpay };
