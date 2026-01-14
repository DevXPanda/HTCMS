import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const Register = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const roleParam = searchParams.get('role');
  
  // Determine default role from URL path, URL param, or default to citizen
  const getDefaultRole = () => {
    // Check URL path first
    if (location.pathname.startsWith('/admin/register')) {
      return 'admin';
    } else if (location.pathname.startsWith('/collector/register')) {
      return 'collector';
    }
    
    // Then check URL param
    if (roleParam === 'admin' || roleParam === 'assessor' || roleParam === 'cashier') {
      return roleParam;
    } else if (roleParam === 'collector' || roleParam === 'tax_collector') {
      return 'collector';
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
      if (role === 'admin' || role === 'assessor' || role === 'cashier') {
        navigate('/dashboard', { replace: true });
      } else if (role === 'collector') {
        navigate('/collector/dashboard', { replace: true });
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
    if (role === 'admin' || role === 'assessor' || role === 'cashier') {
      return {
        bg: 'from-blue-50 to-blue-100',
        text: 'text-blue-600',
        button: 'bg-blue-600 hover:bg-blue-700',
        link: 'text-blue-600'
      };
    } else if (role === 'collector' || role === 'tax_collector') {
      return {
        bg: 'from-green-50 to-green-100',
        text: 'text-green-600',
        button: 'bg-green-600 hover:bg-green-700',
        link: 'text-green-600'
      };
    } else {
      return {
        bg: 'from-purple-50 to-purple-100',
        text: 'text-purple-600',
        button: 'bg-purple-600 hover:bg-purple-700',
        link: 'text-purple-600'
      };
    }
  };

  const theme = getTheme();

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${theme.bg} px-4 py-8`}>
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className={`text-3xl font-bold ${theme.text} mb-2`}>Register</h1>
            <p className="text-gray-600">Create your HTCMS account</p>
            {formData.role !== 'citizen' && (
              <p className="text-sm text-gray-500 mt-2">
                {formData.role === 'collector' ? 'For Field Collectors' : 
                 formData.role === 'admin' ? 'For Administrators' :
                 formData.role === 'assessor' ? 'For Assessors' :
                 formData.role === 'cashier' ? 'For Cashiers' : ''}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="role" className="label">
                Account Category
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                className="input"
              >
                <option value="citizen">Citizen (Property Owner)</option>
                <option value="collector">Field Collector</option>
                <option value="admin">Administrator</option>
                <option value="assessor">Assessor</option>
                <option value="cashier">Cashier</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Select your account category. Admin, Assessor, and Cashier accounts require approval.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="label">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="label">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="input"
                />
              </div>
            </div>

            <div>
              <label htmlFor="username" className="label">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="input"
              />
            </div>

            <div>
              <label htmlFor="email" className="label">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="input"
              />
            </div>

            <div>
              <label htmlFor="phone" className="label">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input"
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
                minLength={6}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`btn btn-primary w-full ${theme.button} text-white`}
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              {formData.role === 'citizen' && (
                <Link to="/citizen/login" className={`${theme.link} hover:underline font-medium`}>
                  Login here
                </Link>
              )}
              {formData.role === 'collector' && (
                <Link to="/collector/login" className={`${theme.link} hover:underline font-medium`}>
                  Login here
                </Link>
              )}
              {(formData.role === 'admin' || formData.role === 'assessor' || formData.role === 'cashier') && (
                <Link to="/admin/login" className={`${theme.link} hover:underline font-medium`}>
                  Login here
                </Link>
              )}
            </p>
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-center gap-4 text-sm">
                <Link to="/citizen/login" className="text-gray-600 hover:underline">
                  Citizen Login
                </Link>
                <span className="text-gray-300">|</span>
                <Link to="/collector/login" className="text-gray-600 hover:underline">
                  Collector Login
                </Link>
                <span className="text-gray-300">|</span>
                <Link to="/admin/login" className="text-gray-600 hover:underline">
                  Admin Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
