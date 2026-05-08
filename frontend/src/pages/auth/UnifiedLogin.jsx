import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getRoleDashboardPath } from '../../utils/roleUtils';
import { Mail, Lock, AlertCircle, CheckCircle, ArrowRight, Phone, X } from 'lucide-react';

const UnifiedLogin = ({ onToggleRegister, onSuccess, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, completeCitizenLogin, isAuthenticated, user, forgotPassword: apiForgotPassword, verifyResetOtp, resetPassword: apiResetPassword } = useAuth();

  // Form states
  const [identifier, setIdentifier] = useState(''); // Email, Phone, or Employee ID
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  
  // UI states
  const [step, setStep] = useState('login'); // 'login', 'otp', 'forgot-password', 'verify-reset', 'reset-password', 'staff-reset-pending'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // OTP specific states
  const [pendingToken, setPendingToken] = useState('');
  const [emailMasked, setEmailMasked] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetIdentifier, setResetIdentifier] = useState(''); // Email/Username used for reset

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (onSuccess) onSuccess();
      const path = getRoleDashboardPath(user.role);
      navigate(path);
    }
  }, [isAuthenticated, user, navigate, onSuccess]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(identifier, password);

      if (result.success) {
        if (result.requiresOtp) {
          setPendingToken(result.pendingToken);
          setEmailMasked(result.emailMasked);
          setMessage(result.message);
          setStep('otp');
        } else {
          // Success (Admin or Staff)
          if (onSuccess) onSuccess();
          const path = getRoleDashboardPath(result.user.role);
          navigate(path);
        }
      } else {
        setError(result.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return false;

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    // Focus next input
    if (element.nextSibling && element.value !== '') {
      element.nextSibling.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && e.target.previousSibling) {
      e.target.previousSibling.focus();
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await completeCitizenLogin(pendingToken, otpCode);

      if (result.success) {
        if (onSuccess) onSuccess();
        const path = getRoleDashboardPath(result.user.role);
        navigate(path);
      } else {
        setError(result.message || 'Invalid verification code.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetIdentifier) {
      setError('Please enter your email or username.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await apiForgotPassword(resetIdentifier);

      if (result.success) {
        if (result.isStaff) {
          setMessage(result.message);
          setStep('staff-reset-pending');
        } else {
          setEmailMasked(result.email);
          setMessage(result.message);
          setStep('verify-reset');
          setOtp(['', '', '', '', '', '']); // Clear OTP for next step
        }
      } else {
        setError(result.message || 'Request failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetOtp = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await verifyResetOtp(resetIdentifier, otpCode);

      if (result.success) {
        setStep('reset-password');
      } else {
        setError(result.message || 'Invalid verification code.');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await apiResetPassword(resetIdentifier, otp.join(''), newPassword);

      if (result.success) {
        setMessage(result.message);
        setStep('login');
        setResetIdentifier('');
        setOtp(['', '', '', '', '', '']);
      } else {
        setError(result.message || 'Reset failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderLoginForm = () => (
    <form onSubmit={handleLoginSubmit} className="space-y-4">
      <div>
        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
          Email, Phone, or Employee ID
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {identifier.includes('@') ? <Mail size={18} /> : <Phone size={18} />}
          </div>
          <input
            type="text"
            required
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            placeholder="Enter your identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider">
            Password
          </label>
          <button 
            type="button" 
            onClick={() => {
              setStep('forgot-password');
              setError('');
              setResetIdentifier(identifier); // Pre-fill if they typed something
            }}
            className="text-[10px] font-bold text-blue-600 uppercase hover:underline"
          >
            Forgot?
          </button>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Lock size={18} />
          </div>
          <input
            type="password"
            required
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
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
            Sign In <ArrowRight className="ml-2" size={18} />
          </>
        )}
      </button>

      {onToggleRegister && (
        <div className="text-center pt-2">
          <p className="text-sm text-gray-500">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onToggleRegister}
              className="text-blue-600 font-bold hover:underline"
            >
              Register as Citizen
            </button>
          </p>
        </div>
      )}
    </form>
  );

  const renderForgotPasswordForm = () => (
    <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
      <div>
        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
          Email or Username
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Mail size={18} />
          </div>
          <input
            type="text"
            required
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            placeholder="Enter your registered email or username"
            value={resetIdentifier}
            onChange={(e) => setResetIdentifier(e.target.value)}
          />
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
          'Send Reset Link'
        )}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={() => setStep('login')}
          className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
        >
          Back to Login
        </button>
      </div>
    </form>
  );

  const renderVerifyResetForm = () => (
    <form onSubmit={handleVerifyResetOtp} className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-4">
          Enter the 6-digit code sent to <span className="font-semibold text-gray-900">{emailMasked}</span>
        </p>
        
        <div className="flex justify-between gap-2">
          {otp.map((data, index) => (
            <input
              key={index}
              type="text"
              maxLength="1"
              className="w-12 h-12 text-center text-xl font-black border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              value={data}
              onChange={(e) => handleOtpChange(e.target, index)}
              onKeyDown={(e) => handleOtpKeyDown(e, index)}
              onFocus={(e) => e.target.select()}
            />
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || otp.join('').length !== 6}
        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all hover:-translate-y-0.5 active:translate-y-0"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          'Verify Code'
        )}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={() => setStep('forgot-password')}
          className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
        >
          Try a different email
        </button>
      </div>
    </form>
  );

  const renderResetPasswordForm = () => (
    <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
      <div>
        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
          New Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Lock size={18} />
          </div>
          <input
            type="password"
            required
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
          Confirm New Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Lock size={18} />
          </div>
          <input
            type="password"
            required
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-all hover:-translate-y-0.5 active:translate-y-0"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          'Update Password'
        )}
      </button>
    </form>
  );

  const renderStaffResetMessage = () => (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle size={32} />
      </div>
      <p className="text-gray-600 leading-relaxed">
        {message || 'Your password reset request has been sent to your ULB admin. Please contact them for your new password.'}
      </p>
      <button
        type="button"
        onClick={() => setStep('login')}
        className="w-full py-3 px-4 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all"
      >
        Back to Login
      </button>
    </div>
  );

  const renderOtpForm = () => (
    <form onSubmit={handleOtpSubmit} className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-4">
          We've sent a 6-digit verification code to <span className="font-semibold text-gray-900">{emailMasked}</span>
        </p>
        
        <div className="flex justify-between gap-2">
          {otp.map((data, index) => (
            <input
              key={index}
              type="text"
              maxLength="1"
              className="w-12 h-12 text-center text-xl font-black border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              value={data}
              onChange={(e) => handleOtpChange(e.target, index)}
              onKeyDown={(e) => handleOtpKeyDown(e, index)}
              onFocus={(e) => e.target.select()}
            />
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || otp.join('').length !== 6}
        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all hover:-translate-y-0.5 active:translate-y-0"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          'Verify & Sign In'
        )}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={() => setStep('login')}
          className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
        >
          Back to Login
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
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">
            {step === 'login' ? 'Welcome Back' : 
             step === 'otp' || step === 'verify-reset' ? 'Security Check' :
             step === 'forgot-password' ? 'Reset Password' :
             step === 'reset-password' ? 'New Password' :
             'Request Sent'}
          </h2>
          <p className="text-gray-500 mt-2 text-sm font-medium">
            {step === 'login' ? 'Enter your credentials to access your dashboard' :
             step === 'otp' ? 'Enter the verification code sent to your email' :
             step === 'forgot-password' ? 'Enter your email to receive a reset code' :
             step === 'verify-reset' ? `Enter the code sent to ${emailMasked}` :
             step === 'reset-password' ? 'Choose a strong new password' :
             'Check with your admin for updates'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start animate-shake">
            <AlertCircle className="text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {message && step === 'otp' && (
          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg flex items-start">
            <CheckCircle className="text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm text-blue-700">{message}</p>
          </div>
        )}

        {step === 'login' && renderLoginForm()}
        {step === 'otp' && renderOtpForm()}
        {step === 'forgot-password' && renderForgotPasswordForm()}
        {step === 'verify-reset' && renderVerifyResetForm()}
        {step === 'reset-password' && renderResetPasswordForm()}
        {step === 'staff-reset-pending' && renderStaffResetMessage()}
      </div>
    </div>
  );
};

export default UnifiedLogin;
