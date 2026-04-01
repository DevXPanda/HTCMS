import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const Register = ({ isModal = false, onClose, onSwitch }) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const roleParam = searchParams.get('role');

  // Determine default role from URL path, URL param, or default to citizen
  const getDefaultRole = () => {
    // Check URL path first
    if (location.pathname.startsWith('/admin/register')) {
      return 'admin';
    }

    // Then check URL param - only allow admin and citizen
    if (roleParam === 'admin') {
      return roleParam;
    }

    return 'citizen';
  };

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: getDefaultRole()
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  // Update role when URL path or param changes
  useEffect(() => {
    const newRole = getDefaultRole();
    setFormData(prev => ({ ...prev, role: newRole }));
  }, [location.pathname, roleParam]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    const { confirmPassword, ...userData } = formData;
    const result = await register(userData);

    if (result.success && result.user) {
      toast.success('Registration successful!');
      // Get exact role from API response
      const role = result.user.role;

      // Redirect based on exact role from API
      if (role === 'admin') {
        navigate('/dashboard', { replace: true });
      } else if (role === 'citizen') {
        navigate('/citizen/dashboard', { replace: true });
      }
    } else {
      toast.error(result.message || 'Registration failed');
    }

    setLoading(false);
  };

  // Determine theme based on role
  const getTheme = () => {
    const role = formData.role;
    if (role === 'admin') {
      return {
        bg: 'from-blue-50 to-blue-100',
        text: 'text-blue-600',
        button: 'bg-blue-600 hover:bg-blue-700',
        link: 'text-blue-600'
      };
    } else {
      // citizen
      return {
        bg: 'from-purple-50 to-purple-100',
        text: 'text-purple-600',
        button: 'bg-purple-600 hover:bg-purple-700',
        link: 'text-purple-600'
      };
    }
  };

  const theme = getTheme();

  const content = (
    <div className="max-w-2xl w-full relative z-10 px-4">
      <div className="card relative p-6 md:p-8">
        {isModal && (
          <button
            onClick={onClose}
            type="button"
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-50 transition-colors bg-gray-100 hover:bg-gray-200 p-1 rounded-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <div className="text-center mb-6">
          <h1 className={`text-2xl font-bold ${theme.text} mb-1`}>Create Account</h1>
          <p className="text-gray-500 text-sm">Join HTCMS for seamless tax management</p>
          {formData.role !== 'citizen' && (
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">
              {formData.role === 'admin' ? 'System Administrator Portal' : ''}
            </p>
          )}
        </div>

        {/* <div className="mb-6 p-3 bg-amber-50/50 rounded-xl border border-amber-100 flex items-start gap-3">
          <div className="mt-0.5">
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-800 font-medium">
              Self-registration is available for <span className="font-bold underline">Citizens</span> and <span className="font-bold underline">Admins</span> only. Staff members must be registered by a system administrator.
            </p>
        </div> */}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* <div>
                <label htmlFor="role" className="label text-xs uppercase tracking-wide font-bold text-gray-500">
                  Account Category
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className="input mt-1"
                >
                  <option value="citizen">Citizen (Property Owner)</option>
                  <option value="admin">Administrator</option>
                </select>
              </div> */}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="label text-xs uppercase tracking-wide font-bold text-gray-500">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="input mt-1"
                  placeholder="John"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="label text-xs uppercase tracking-wide font-bold text-gray-500">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="input mt-1"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="username" className="label text-xs uppercase tracking-wide font-bold text-gray-500">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="input mt-1"
                placeholder="johndoe123"
              />
            </div>

            <div>
              <label htmlFor="email" className="label text-xs uppercase tracking-wide font-bold text-gray-500">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="input mt-1"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="label text-xs uppercase tracking-wide font-bold text-gray-500">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input mt-1"
                placeholder="98XXXXXXXX"
              />
            </div>

            <div>
              <label htmlFor="password" className="label text-xs uppercase tracking-wide font-bold text-gray-500">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className="input mt-1"
                placeholder="••••••••"
              />
            </div>

            <div className="md:col-start-2">
              <label htmlFor="confirmPassword" className="label text-xs uppercase tracking-wide font-bold text-gray-500">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="input mt-1"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`btn btn-primary w-full py-4 text-base font-bold shadow-lg shadow-black/5 ${theme.button} text-white rounded-xl active:scale-[0.98] transition-all`}
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            {formData.role === 'citizen' && (
              isModal && onSwitch ? (
                <button onClick={() => onSwitch('citizen')} className={`${theme.link} hover:underline font-medium ml-1`}>
                  Login here
                </button>
              ) : (
                <Link to="/citizen/login" className={`${theme.link} hover:underline font-medium`}>
                  Login here
                </Link>
              )
            )}
            {formData.role === 'admin' && (
              isModal && onSwitch ? (
                <button onClick={() => onSwitch('admin')} className={`${theme.link} hover:underline font-medium ml-1`}>
                  Login here
                </button>
              ) : (
                <Link to="/staff/login" className={`${theme.link} hover:underline font-medium`}>
                  Staff Login
                </Link>
              )
            )}
          </p>
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-center gap-4 text-sm">
              {isModal && onSwitch ? (
                <>
                  <button onClick={() => onSwitch('citizen')} className="text-gray-600 hover:underline">
                    Citizen Login
                  </button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => onSwitch('staff')} className="text-gray-600 hover:underline">
                    Staff Login
                  </button>
                </>
              ) : (
                <>
                  <Link to="/citizen/login" className="text-gray-600 hover:underline">
                    Citizen Login
                  </Link>
                  <span className="text-gray-300">|</span>
                  <Link to="/staff/login" className="text-gray-600 hover:underline">
                    Staff Login
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8 overflow-y-auto">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
        {content}
      </div>
    );
  }

  return (
    <div className="auth-page-bg min-h-screen flex items-center justify-center px-4 py-8 relative">
      <div className="absolute inset-0 bg-black opacity-45 z-0" />
      {content}
    </div>
  );
};

export default Register;
