import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { User, Home } from 'lucide-react';

const CitizenLogin = () => {
  const [formData, setFormData] = useState({ emailOrPhone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login, user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in with citizen role
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const role = localStorage.getItem('role');

      if (role === 'citizen') {
        navigate('/citizen/dashboard', { replace: true });
      } else if (role) {
        // User has different role, redirect to their login page
        if (role === 'admin' || role === 'assessor' || role === 'cashier') {
          navigate('/admin/login', { replace: true });
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
    if (role === 'citizen') {
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
      const result = await login(formData.emailOrPhone, formData.password);

      if (result.success && result.user) {
        const loggedInUser = result.user;
        const role = loggedInUser.role; // Get exact role from backend response

        // Validate that user has citizen role - exact matching
        if (role !== 'citizen') {
          toast.error('Access denied. This login is only for citizens.');
          // Clear auth data through AuthContext logout
          await login('logout', 'dummy'); // This will trigger logout
          setLoading(false);
          return;
        }

        toast.success('Login successful!');

        // Redirect based on exact role
        if (role === 'citizen') {
          navigate('/citizen/dashboard', { replace: true });
        } else {
          toast.error('Invalid role for citizen portal');
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
        <div className="card">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-purple-100 p-3 rounded-full">
                <Home className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            <h1 className="ds-page-title text-purple-600 mb-2">Citizen Portal</h1>
            <p className="text-gray-600">HTCMS - House Tax Collection & Management System</p>
            <p className="text-sm text-gray-500 mt-2">For Property Owners</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="emailOrPhone" className="label">
                Email or Phone Number
              </label>
              <input
                type="text"
                id="emailOrPhone"
                name="emailOrPhone"
                value={formData.emailOrPhone}
                onChange={handleChange}
                required
                className="input"
                placeholder="Enter your email or phone number"
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
              className="btn btn-primary w-full bg-purple-600 hover:bg-purple-700"
            >
              {loading ? 'Logging in...' : 'Login to Citizen Portal'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/citizen/register" className="text-purple-600 hover:underline font-medium">
                Register here
              </Link>
            </p>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-center gap-4 text-sm">
              <a href="/admin/login" className="text-gray-600 hover:text-purple-600">
                Admin Login
              </a>
              <span className="text-gray-300">|</span>
              <a href="/staff/login" className="text-gray-600 hover:text-purple-600">
                Staff Login
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenLogin;
