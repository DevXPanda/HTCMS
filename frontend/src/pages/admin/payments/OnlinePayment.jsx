import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { paymentAPI, demandAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { CreditCard, CheckCircle, Landmark, Smartphone, Wallet, FileText, Calendar, Home, TrendingUp } from 'lucide-react';
import DetailPageLayout from '../../../components/DetailPageLayout';

const PAYMENT_METHODS = [
    { id: 'card', label: 'Credit/Debit Cards', icon: CreditCard },
    { id: 'netbanking', label: 'Net Banking', icon: Landmark },
    { id: 'upi', label: 'UPI (Google Pay, PhonePe, Paytm, etc.)', icon: Smartphone },
    { id: 'wallet', label: 'Wallets', icon: Wallet }
];

const OnlinePayment = () => {
    const { demandId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isCitizenRoute = location.pathname.startsWith('/citizen');
    const basePath = isCitizenRoute ? '/citizen' : '';
    const [loading, setLoading] = useState(false);
    const [demand, setDemand] = useState(null);
    const [loadingDemand, setLoadingDemand] = useState(true);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [orderData, setOrderData] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState(null);

    useEffect(() => {
        if (demandId) {
            fetchDemand();
        }
    }, [demandId]);

    useEffect(() => {
        if (window.Razorpay) return;
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.onerror = () => {
            console.warn('Razorpay checkout script failed to load. If payment does not open, disable ad blocker for this site.');
        };
        document.body.appendChild(script);
        return () => {
            try {
                if (script.parentNode) document.body.removeChild(script);
            } catch (_) { }
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
            navigate(`${basePath}/demands`);
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

        const ownerName = [demand.property?.owner?.firstName, demand.property?.owner?.lastName].filter(Boolean).join(' ') || '';
        const options = {
            key: order.key,
            amount: order.amount,
            currency: order.currency,
            name: 'ULB Tax Payment',
            description: `Demand ${demand.demandNumber}`,
            order_id: order.orderId,
            handler: async function (response) {
                await verifyPayment(response, order.paymentId);
            },
            prefill: {
                name: ownerName,
                email: demand.property?.owner?.email || '',
                contact: demand.property?.ownerPhone || demand.property?.owner?.phone || ''
            },
            theme: {
                color: '#2563eb',
                backdrop_color: '#1e293b'
            },
            modal: {
                ondismiss: function () {
                    toast.info('Payment cancelled');
                    setProcessing(false);
                }
            }
        };
        if (selectedMethod) options.method = selectedMethod;

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
                navigate(`${basePath}/payments/${response.data.data.payment.id}`);
            }
        } catch (error) {
            const msg = error.response?.data?.message || error.response?.data?.error || '';
            const alreadyDone = typeof msg === 'string' && msg.toLowerCase().includes('already');
            if (alreadyDone) {
                toast.success('Payment already recorded.');
                navigate(`${basePath}/payments/${paymentId}`);
            } else {
                toast.error(msg || 'Payment verification failed');
            }
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
                <Link to={`${basePath}/demands`} className="btn btn-secondary mt-4">Back to Demands</Link>
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
                <Link to={`${basePath}/demands/${demandId}`} className="btn btn-primary">
                    View Demand Details
                </Link>
            </div>
        );
    }

    const formatAmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <DetailPageLayout
            backTo={`${basePath}/payments`}
            backLabel="Back to Payments"
            showBackLink={false}
            title="Online Payment"
            subtitle={demand.demandNumber}
            summarySection={
                <>
                    <h2 className="form-section-title flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
                        Demand Summary
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="stat-card">
                            <div className="stat-card-title"><span>Demand Number</span><FileText className="w-5 h-5 text-gray-400" /></div>
                            <p className="stat-card-value text-lg">{demand.demandNumber}</p>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-title"><span>Financial Year</span><Calendar className="w-5 h-5 text-gray-400" /></div>
                            <p className="stat-card-value text-lg">{demand.financialYear}</p>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-title"><span>Property</span><Home className="w-5 h-5 text-gray-400" /></div>
                            <p className="stat-card-value text-lg">
                                <Link to={`/properties/${demand.propertyId}`} className="text-primary-600 hover:underline">
                                    {demand.property?.propertyNumber}
                                </Link>
                            </p>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-title"><span>Total Amount</span></div>
                            <p className="stat-card-value text-lg">{formatAmt(demand.totalAmount)}</p>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-title"><span>Paid Amount</span></div>
                            <p className="stat-card-value text-lg text-green-600">{formatAmt(demand.paidAmount)}</p>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-title"><span>Balance Amount</span></div>
                            <p className="stat-card-value text-xl font-bold text-red-600">{formatAmt(demand.balanceAmount)}</p>
                        </div>
                    </div>
                </>
            }
        >
            <div className="card">
                <h2 className="form-section-title flex items-center">
                    <CreditCard className="w-5 h-5 mr-2 text-primary-600" />
                    Payment Details
                </h2>
                <p className="text-sm text-gray-500 mb-4">Enter amount and choose how you want to pay</p>

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
                            Maximum: {formatAmt(demand.balanceAmount)}
                        </p>
                        {parseFloat(demand.balanceAmount || 0) > 100000 && (
                            <p className="text-sm text-amber-600 mt-1">
                                {/* Large amount? You can pay in parts by entering a smaller amount and paying multiple times, or pay the full amount at the office. */}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <h3 className="form-section-title text-base">Payment Methods</h3>
                        <p className="text-sm text-gray-500">Choose a method and click Pay, or click Pay to choose in the checkout.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {PAYMENT_METHODS.map((method) => {
                                const Icon = method.icon;
                                const isSelected = selectedMethod === method.id;
                                return (
                                    <button
                                        key={method.id}
                                        type="button"
                                        onClick={() => setSelectedMethod(isSelected ? null : method.id)}
                                        className={`flex items-center gap-3 p-3 rounded-ds border-2 text-left transition-all ${isSelected
                                            ? 'border-primary-600 bg-primary-50 text-primary-800'
                                            : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-gray-50 text-gray-700'
                                            }`}
                                    >
                                        <Icon className={`w-5 h-5 shrink-0 ${isSelected ? 'text-primary-600' : 'text-gray-500'}`} />
                                        <span className="text-sm font-medium">{method.label}</span>
                                        {isSelected && <CheckCircle className="w-4 h-4 ml-auto text-primary-600 shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <button
                        onClick={handleCreateOrder}
                        disabled={loading || processing || !paymentAmount || parseFloat(paymentAmount) <= 0}
                        className="btn btn-primary w-full flex items-center justify-center py-3"
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
                                Pay {formatAmt(paymentAmount)}
                            </>
                        )}
                    </button>

                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500 pt-2">
                        <span className="inline-flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            Secured by Razorpay
                        </span>
                        <span>·</span>
                        <span>We do not store card details</span>
                    </div>
                    {/* <p className="text-xs text-amber-600 text-center mt-1">
                            If the payment window does not open, try disabling ad blocker for this site.
                        </p> */}
                </div>
            </div>
        </DetailPageLayout>
    );
};

export default OnlinePayment;
