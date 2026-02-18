import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Users, Shield, Building } from 'lucide-react';
import { useStaffAuth } from '../../contexts/StaffAuthContext';

// Get background image path that works in both dev and production
// Use absolute path for public assets - Vite serves public folder from root
const backgroundImageUrl = '/background.png';

const StaffLogin = () => {
  const [formData, setFormData] = useState({ login_identifier: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useStaffAuth();

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

    try {
      const result = await login(formData.login_identifier, formData.password);

      if (!result.success || !result.user) {
        toast.error(result.message || 'Login failed');
        setLoading(false);
        return;
      }

      const { role } = result.user;
      
      // Normalize role to uppercase for comparison
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
      } else if (normalizedRole === 'FIELD_WORKER') {
        navigate('/field-worker/dashboard', { replace: true });
      } else if (normalizedRole === 'CONTRACTOR') {
        navigate('/contractor/dashboard', { replace: true });
      } else {
        toast.error('Invalid role for staff portal');
        setLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'An error occurred during login');
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 relative"
        style={{
          backgroundImage: `url(${backgroundImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          minHeight: '100vh',
          width: '100%'
        }}
    >
      {/* Dark overlay for better text readability */}
      <div 
        className="absolute inset-0 bg-black opacity-45"
        style={{ zIndex: 0 }}
      />
      <div className="max-w-md w-full relative" style={{ zIndex: 1 }}>
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <Building className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-blue-600 mb-2">Staff Portal</h1>
            <p className="text-gray-600">HTCMS - House Tax Collection & Management System</p>
            <p className="text-sm text-gray-500 mt-2">For Staff Members Only</p>
          </div>

          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-medium text-blue-900">Staff Access</h3>
            </div>
            <p className="text-xs text-blue-700">
              This portal is for authorized staff members only. Staff accounts are created by administrators.
            </p>
          </div>

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

          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-3">
              <Users className="w-4 h-4" />
              <span>Staff Roles: Clerk, Inspector, Officer, Collector, EO</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-center gap-4 text-sm">
              <Link to="/citizen/login" className="text-gray-600 hover:text-blue-600">
                Citizen Login
              </Link>
              <span className="text-gray-300">|</span>
              <Link to="/register" className="text-gray-600 hover:text-blue-600">
                Register
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;
