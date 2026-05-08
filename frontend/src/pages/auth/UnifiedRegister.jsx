import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Phone, User, Lock, ArrowRight, AlertCircle, CheckCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';

const UnifiedRegister = ({ onToggleLogin, onSuccess, onClose }) => {
  const navigate = useNavigate();
  const { register, verifyCitizenRegistration, resendCitizenRegistrationOtp } = useAuth();

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'citizen'
  });

  // UI states
  const [step, setStep] = useState('register'); // 'register' or 'otp'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...userData } = formData;
      const result = await register(userData);

      if (result.success) {
        if (result.requiresVerification) {
          setVerifyEmail(result.email || formData.email);
          setStep('otp');
          toast.success(result.message || 'Verification code sent to your email.');
        } else {
          // Success (e.g. if verification is disabled or for specific roles)
          toast.success('Registration successful!');
          if (onSuccess) onSuccess();
          navigate('/citizen/dashboard');
        }
      } else {
        setError(result.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otpValue.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await verifyCitizenRegistration(verifyEmail, otpValue);
      if (result.success) {
        toast.success('Account verified successfully!');
        if (onToggleLogin) onToggleLogin(); // Switch to login after verification
      } else {
        setError(result.message || 'Invalid verification code.');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const result = await resendCitizenRegistrationOtp(verifyEmail);
      if (result.success) {
        toast.success('A new code has been sent to your email.');
      } else {
        setError(result.message || 'Could not resend code.');
      }
    } catch (err) {
      setError('Error resending code.');
    } finally {
      setLoading(false);
    }
  };

  const renderRegisterForm = () => (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
            First Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <User size={18} />
            </div>
            <input
              type="text"
              name="firstName"
              required
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              placeholder="John"
              value={formData.firstName}
              onChange={handleChange}
            />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
            Last Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <User size={18} />
            </div>
            <input
              type="text"
              name="lastName"
              required
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              placeholder="Doe"
              value={formData.lastName}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
          Email Address
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Mail size={18} />
          </div>
          <input
            type="email"
            name="email"
            required
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            placeholder="john@example.com"
            value={formData.email}
            onChange={handleChange}
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
          Phone Number
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Phone size={18} />
          </div>
          <input
            type="tel"
            name="phone"
            required
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            placeholder="98XXXXXXXX"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Lock size={18} />
            </div>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
            />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
            Confirm
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Lock size={18} />
            </div>
            <input
              type="password"
              name="confirmPassword"
              required
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all hover:-translate-y-0.5 active:translate-y-0"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <>
            Complete Registration <ArrowRight className="ml-2" size={18} />
          </>
        )}
      </button>

      <div className="text-center pt-2">
        <p className="text-sm text-gray-500">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onToggleLogin}
            className="text-blue-600 font-bold hover:underline"
          >
            Sign In
          </button>
        </p>
      </div>
    </form>
  );

  const renderOtpForm = () => (
    <form onSubmit={handleVerifyOtp} className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Mail size={32} />
        </div>
      </div>

      <div className="flex justify-center">
        <input
          type="text"
          maxLength={6}
          className="w-full max-w-[200px] text-center text-3xl font-black tracking-[0.5em] py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
          placeholder="000000"
          value={otpValue}
          onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
          autoFocus
        />
      </div>

      <button
        type="submit"
        disabled={loading || otpValue.length !== 6}
        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          'Verify Account'
        )}
      </button>

      <div className="text-center space-y-3">
        <button
          type="button"
          onClick={handleResendOtp}
          disabled={loading}
          className="text-sm text-blue-600 font-bold hover:underline block w-full"
        >
          Resend verification code
        </button>
        <button
          type="button"
          onClick={() => setStep('register')}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Back to registration
        </button>
      </div>
    </form>
  );

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 relative overflow-hidden">
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 transition-colors z-20"
          >
            <X size={20} />
          </button>
        )}
        
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>
        
        <div className="text-center mb-8 relative">
          {step === 'register' ? (
            <>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Create Account</h2>
              <p className="text-gray-500 mt-2 text-sm font-medium">Join the digital governance platform</p>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Security Check</h2>
              <p className="text-gray-500 mt-2 text-sm font-medium">Enter the verification code sent to your email</p>
            </>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl flex items-start animate-shake">
            <AlertCircle className="text-red-500 mt-0.5 mr-3 flex-shrink-0" size={18} />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {step === 'register' ? renderRegisterForm() : renderOtpForm()}
      </div>
    </div>
  );
};

export default UnifiedRegister;
