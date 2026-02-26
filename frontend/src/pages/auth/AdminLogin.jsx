import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Shield, Building2, CreditCard } from 'lucide-react';

const AdminLogin = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login, user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in with admin role
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const role = localStorage.getItem('role');
      const isAdminRole = role === 'admin' || role === 'assessor' || role === 'cashier';

      if (isAdminRole) {
        navigate('/dashboard', { replace: true });
      } else if (role) {
        // User has different role, redirect to their login page
        if (role === 'citizen') {
          navigate('/citizen/login', { replace: true });
        } else if (role === 'collector' || role === 'tax_collector') {
          navigate('/collector/login', { replace: true });
        }
      }
    }
  }, [isAuthenticated, user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="auth-page-bg min-h-screen flex items-center justify-center relative">
        <div className="absolute inset-0 bg-black opacity-45 z-0" />
        <div className="spinner spinner-md relative z-10" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    const role = localStorage.getItem('role');
    const isAdminRole = role === 'admin' || role === 'assessor' || role === 'cashier';
    if (isAdminRole) {
      return null; // Redirect will happen
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);

      if (result.success && result.user) {
        const loggedInUser = result.user;
        const role = loggedInUser.role; // Get exact role from backend response

        // Validate that user has admin role - exact matching
        const isAdminRole = role === 'admin' || role === 'assessor' || role === 'cashier';

        if (!isAdminRole) {
          toast.error('Access denied. This login is only for admin, assessor, or cashier.');
          // Clear auth data through AuthContext by using a dummy login call
          // This will trigger the error handling and clear data
          setLoading(false);
          return;
        }

        toast.success('Login successful!');

        // Redirect based on exact role
        if (role === 'admin' || role === 'assessor' || role === 'cashier') {
          navigate('/dashboard', { replace: true });
        } else {
          toast.error('Invalid role for admin portal');
          setLoading(false);
        }
      } else {
        toast.error(result.message || 'Login failed');
        setLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred during login');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-bg min-h-screen flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 bg-black opacity-45 z-0" />
      <div className="max-w-md w-full relative z-10">
        <div className="card max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-primary-100 p-3 rounded-full">
                <Shield className="w-8 h-8 text-primary-600" />
              </div>
            </div>
            <h1 className="ds-page-title text-primary-600 mb-2">Admin Portal</h1>
            <p className="text-gray-600">HTCMS - House Tax Collection & Management System</p>
            <p className="text-sm text-gray-500 mt-2">For Admin, Assessor & Cashier</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="Enter your email"
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
              {loading ? 'Logging in...' : 'Login to Admin Portal'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/admin/register" className="text-blue-600 hover:underline font-medium">
                Register here
              </Link>
            </p>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-center gap-4 text-sm">
              <a href="/staff/login" className="text-gray-600 hover:text-blue-600">
                Staff Login
              </a>
              <span className="text-gray-300">|</span>
              <a href="/citizen/login" className="text-gray-600 hover:text-blue-600">
                Citizen Login
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
