import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Users, Shield, Building } from 'lucide-react';
import { useStaffAuth } from '../../contexts/StaffAuthContext';

const StaffLogin = ({ isModal = false, onClose, onSwitch }) => {
  const [formData, setFormData] = useState({ login_identifier: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, logout } = useStaffAuth();



  // Check if already logged in (check for valid token)
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (token && role) {
      // Normalize role to uppercase for comparison
      const normalizedRole = role.toUpperCase().replace(/-/g, '_');

      // Redirect staff users to their respective dashboards
      if (normalizedRole === 'CLERK') {
        navigate('/clerk/dashboard', { replace: true });
      } else if (normalizedRole === 'INSPECTOR') {
        navigate('/inspector/dashboard', { replace: true });
      } else if (normalizedRole === 'OFFICER') {
        navigate('/officer/dashboard', { replace: true });
      } else if (normalizedRole === 'COLLECTOR') {
        navigate('/collector/dashboard', { replace: true });
      } else if (normalizedRole === 'EO') {
        navigate('/eo/dashboard', { replace: true });
      } else if (normalizedRole === 'SUPERVISOR') {
        navigate('/supervisor/dashboard', { replace: true });
      } else if (normalizedRole === 'SFI') {
        navigate('/sfi/dashboard', { replace: true });
      } else if (normalizedRole === 'SBM') {
        navigate('/sbm/dashboard', { replace: true });
      } else if (normalizedRole === 'ACCOUNT_OFFICER') {
        navigate('/account-officer/dashboard', { replace: true });
      } else if (normalizedRole === 'FIELD_WORKER') {
        navigate('/field-worker/dashboard', { replace: true });
      } else if (normalizedRole === 'ADMIN' || normalizedRole === 'ASSESSOR' || normalizedRole === 'CASHIER') {
        navigate('/dashboard', { replace: true });
      } else if (normalizedRole === 'CITIZEN') {
        // Citizen trying to access staff login - redirect to citizen login
        navigate('/citizen/login', { replace: true });
      }
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const staffRoles = ['CLERK', 'INSPECTOR', 'OFFICER', 'COLLECTOR', 'TAX_COLLECTOR', 'EO', 'SUPERVISOR', 'FIELD_WORKER', 'CONTRACTOR', 'SFI', 'SBM', 'ACCOUNT_OFFICER'];

    try {
      const result = await login(formData.login_identifier, formData.password, staffRoles);

      if (result.success && result.user) {
        const { role } = result.user;
        const normalizedRole = role ? role.toUpperCase().replace(/-/g, '_') : role;

        toast.success('Login successful!');

        if (normalizedRole === 'CLERK') {
          navigate('/clerk/dashboard', { replace: true });
        } else if (normalizedRole === 'INSPECTOR') {
          navigate('/inspector/dashboard', { replace: true });
        } else if (normalizedRole === 'OFFICER') {
          navigate('/officer/dashboard', { replace: true });
        } else if (normalizedRole === 'COLLECTOR') {
          navigate('/collector/dashboard', { replace: true });
        } else if (normalizedRole === 'EO') {
          navigate('/eo/dashboard', { replace: true });
        } else if (normalizedRole === 'SUPERVISOR') {
          navigate('/supervisor/dashboard', { replace: true });
        } else if (normalizedRole === 'SFI') {
          navigate('/sfi/dashboard', { replace: true });
        } else if (normalizedRole === 'SBM') {
          navigate('/sbm/dashboard', { replace: true });
        } else if (normalizedRole === 'ACCOUNT_OFFICER') {
          navigate('/account-officer/dashboard', { replace: true });
        } else if (normalizedRole === 'FIELD_WORKER') {
          navigate('/field-worker/dashboard', { replace: true });
        } else if (normalizedRole === 'CONTRACTOR') {
          navigate('/contractor/dashboard', { replace: true });
        } else if (normalizedRole === 'TAX_COLLECTOR') {
          navigate('/collector/dashboard', { replace: true });
        }

        if (isModal && onClose) {
          onClose();
        }
      } else {
        toast.error(result.message || 'Login failed');
        setLoading(false);
      }
    } catch (error) {

      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'An error occurred during login');
      setLoading(false);
    }
  };

  const content = (
    <div className="max-w-md w-full relative z-10">
      <div className="card relative">
        {isModal && (
          <button
            onClick={onClose}
            type="button"
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
             <img src="/ULB Logo.png" alt="ULB Logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="ds-page-title text-primary-600 mb-2">Urban Local Bodies</h1>
          <p className="text-gray-600 font-medium italic">Staff Management Portal</p>
          <p className="text-sm text-gray-500 mt-2">For Staff Members Only</p>
        </div>

        {/* <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-medium text-blue-900">Staff Access</h3>
            </div>
            <p className="text-xs text-blue-700">
              This portal is for authorized staff members only. Staff accounts are created by administrators.
            </p>
          </div> */}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="login_identifier" className="label">
              Employee ID / Email / Phone
            </label>
            <input
              type="text"
              id="login_identifier"
              name="login_identifier"
              value={formData.login_identifier}
              onChange={handleChange}
              required
              className="input"
              placeholder="Enter employee ID, email, or phone number"
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="input"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Logging in...' : 'Login to Staff Portal'}
          </button>
        </form>

        {/* <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-3">
            <Users className="w-4 h-4" />
            <span>Staff Roles: EO, Supervisor, Collector, Field Worker, SFI, SBM, Account Officer</span>
          </div>
        </div> */}

        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-center gap-4 text-sm">
            {isModal && onSwitch ? (
              <button
                onClick={() => onSwitch('citizen')}
                className="text-gray-600 hover:text-blue-600"
              >
                Citizen Login
              </button>
            ) : (
              <Link to="/citizen/login" className="text-gray-600 hover:text-blue-600">
                Citizen Login
              </Link>
            )}
            <span className="text-gray-300">|</span>
            {isModal && onSwitch ? (
              <button
                onClick={() => onSwitch('admin')}
                className="text-gray-600 hover:text-blue-600"
              >
                Admin Login
              </button>
            ) : (
              <Link to="/admin/login" className="text-gray-600 hover:text-blue-600">
                Admin Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative bg-slate-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-0" />
      {content}
    </div>
  );

};

export default StaffLogin;
