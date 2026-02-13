import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// Get background image path that works in both dev and production
// Use absolute path for public assets - Vite serves public folder from root
const backgroundImageUrl = '/background.png';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login, user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in OR after successful login
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      // Get role from localStorage - exact value from API
      const role = localStorage.getItem('role');
      
      if (role) {
        // Redirect based on exact role from API
        if (role === 'admin' || role === 'assessor' || role === 'cashier') {
          navigate('/dashboard', { replace: true });
        } else if (role === 'collector') {
          navigate('/collector/dashboard', { replace: true });
        } else if (role === 'citizen') {
          navigate('/citizen/dashboard', { replace: true });
        }
      }
    }
  }, [isAuthenticated, user, authLoading, navigate]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center relative"
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
        <div 
          className="absolute inset-0 bg-black opacity-45"
          style={{ zIndex: 0 }}
        />
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 relative" style={{ zIndex: 1 }}></div>
      </div>
    );
  }

  // Don't show login form if already authenticated (redirect will happen)
  if (isAuthenticated && user) {
    return null;
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
        toast.success('Login successful!');
        
        // Get exact role from API response - AuthContext already stored it
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
            <h1 className="text-3xl font-bold text-primary-600 mb-2">HTCMS</h1>
            <p className="text-gray-600">House Tax Collection & Management System</p>
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
              className="btn btn-primary w-full"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-600 hover:underline font-medium">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
