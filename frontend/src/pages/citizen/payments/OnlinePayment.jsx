import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { paymentAPI, demandAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { CreditCard, CheckCircle, XCircle } from 'lucide-react';

const OnlinePayment = () => {
    const { demandId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [demand, setDemand] = useState(null);
    const [loadingDemand, setLoadingDemand] = useState(true);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [orderData, setOrderData] = useState(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (demandId) {
            fetchDemand();
        }
    }, [demandId]);

    useEffect(() => {
        // Load Razorpay script
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const fetchDemand = async () => {
        try {
            setLoadingDemand(true);
            const response = await demandAPI.getById(demandId);
            setDemand(response.data.data.demand);
            setPaymentAmount(response.data.data.demand.balanceAmount);
        } catch (error) {
            toast.error('Failed to load demand details');
                navigate('/citizen/demands');
        } finally {
            setLoadingDemand(false);
        }
    };

    const handleCreateOrder = async () => {
        if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
            toast.error('Please enter a valid payment amount');
            return;
        }

        if (parseFloat(paymentAmount) > parseFloat(demand.balanceAmount)) {
            toast.error('Payment amount cannot exceed balance amount');
            return;
        }

        try {
            setLoading(true);
            const response = await paymentAPI.createOnlineOrder({
                demandId: parseInt(demandId),
                amount: parseFloat(paymentAmount)
            });

            if (response.data.success) {
                setOrderData(response.data.data);
                initializeRazorpay(response.data.data);
            }
        } catch (error) {
            toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to create payment order');
        } finally {
            setLoading(false);
        }
    };

    const initializeRazorpay = (order) => {
        if (!window.Razorpay) {
            toast.error('Razorpay SDK not loaded. Please refresh the page.');
            return;
        }

        const options = {
            key: order.key,
            amount: order.amount,
            currency: order.currency,
            name: 'House Tax Collection & Management System',
            description: `Payment for Demand ${demand.demandNumber}`,
            order_id: order.orderId,
            handler: async function (response) {
                // Payment successful - verify payment
                await verifyPayment(response, order.paymentId);
            },
            prefill: {
                name: demand.property?.owner?.firstName + ' ' + demand.property?.owner?.lastName || '',
                email: demand.property?.owner?.email || '',
                contact: demand.property?.ownerPhone || ''
            },
            theme: {
                color: '#2563eb'
            },
            modal: {
                ondismiss: function () {
                    toast.info('Payment cancelled');
                }
            }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.on('payment.failed', function (response) {
            toast.error(`Payment failed: ${response.error.description}`);
            setProcessing(false);
        });

        razorpay.open();
        setProcessing(true);
    };

    const verifyPayment = async (razorpayResponse, paymentId) => {
        try {
            setProcessing(true);
            const response = await paymentAPI.verifyOnlinePayment({
                paymentId: paymentId,
                razorpayOrderId: razorpayResponse.razorpay_order_id,
                razorpayPaymentId: razorpayResponse.razorpay_payment_id,
                razorpaySignature: razorpayResponse.razorpay_signature
            });

            if (response.data.success) {
                toast.success('Payment completed successfully!');
                navigate(`/citizen/payments/${response.data.data.payment.id}`);
            }
        } catch (error) {
            toast.error(error.response?.data?.error || error.response?.data?.message || 'Payment verification failed');
            setProcessing(false);
        }
    };

    if (loadingDemand) {
        return <Loading message="Loading demand details..." />;
    }

    if (!demand) {
        return (
            <div className="card">
                <p className="text-red-600">Demand not found</p>
                <Link to="/citizen/demands" className="btn btn-secondary mt-4">Back to Demands</Link>
            </div>
        );
    }

    if (demand.balanceAmount <= 0) {
        return (
            <div className="card">
                <div className="flex items-center mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                    <h2 className="text-xl font-semibold text-green-600">Demand Already Paid</h2>
                </div>
                <p className="text-gray-600 mb-4">This demand has been fully paid. No payment required.</p>
                <Link to={`/citizen/demands/${demandId}`} className="btn btn-primary">
                    View Demand Details
                </Link>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="ds-page-title">Online Payment</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Demand Information */}
                <div className="card">
                    <h2 className="text-xl font-semibold mb-4">Demand Information</h2>
                    <dl className="space-y-3">
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Demand Number</dt>
                            <dd className="text-lg font-semibold">{demand.demandNumber}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Financial Year</dt>
                            <dd>{demand.financialYear}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Property</dt>
                            <dd>
                                <Link to={`/properties/${demand.propertyId}`} className="text-primary-600 hover:underline">
                                    {demand.property?.propertyNumber}
                                </Link>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                            <dd className="text-lg">
                                ₹{parseFloat(demand.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Paid Amount</dt>
                            <dd className="text-green-600">
                                ₹{parseFloat(demand.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </dd>
                        </div>
                        <div className="border-t pt-3">
                            <dt className="text-sm font-medium text-gray-500">Balance Amount</dt>
                            <dd className="text-2xl font-bold text-red-600">
                                ₹{parseFloat(demand.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </dd>
                        </div>
                    </dl>
                </div>

                {/* Payment Form */}
                <div className="card">
                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                        <CreditCard className="w-5 h-5 mr-2" />
                        Payment Details
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="label">
                                Payment Amount (₹) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                className="input"
                                placeholder="0.00"
                                min="0.01"
                                max={demand.balanceAmount}
                                disabled={processing || loading}
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                Maximum: ₹{parseFloat(demand.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="font-semibold text-blue-800 mb-2">Payment Methods</h3>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li>• Credit/Debit Cards</li>
                                <li>• Net Banking</li>
                                <li>• UPI (Google Pay, PhonePe, Paytm, etc.)</li>
                                <li>• Wallets</li>
                            </ul>
                        </div>

                        <button
                            onClick={handleCreateOrder}
                            disabled={loading || processing || !paymentAmount || parseFloat(paymentAmount) <= 0}
                            className="btn btn-primary w-full flex items-center justify-center"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Processing...
                                </>
                            ) : processing ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Verifying Payment...
                                </>
                            ) : (
                                <>
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    Pay ₹{parseFloat(paymentAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </>
                            )}
                        </button>

                        <p className="text-xs text-gray-500 text-center">
                            Your payment is secured by Razorpay. We do not store your card details.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnlinePayment;
