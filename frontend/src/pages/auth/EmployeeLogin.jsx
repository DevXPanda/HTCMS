import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Eye, EyeOff, AlertCircle, Shield } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Get background image path that works in both dev and production
// Use absolute path for public assets - Vite serves public folder from root
const backgroundImageUrl = '/background.png';

const EmployeeLogin = () => {
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/api/employee-auth/login', formData);
      
      // Clear any existing cached data before storing new data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userType');
      localStorage.removeItem('role');
      
      // Store fresh authentication data
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.employee));
      localStorage.setItem('userType', 'admin_management');
      localStorage.setItem('role', response.data.employee.role);

      toast.success('Login successful!');

      // Redirect based on role - NO password change required
        switch (response.data.employee.role) {
          case 'clerk':
            navigate('/clerk/dashboard');
            break;
          case 'inspector':
            navigate('/inspector/dashboard');
            break;
          case 'officer':
            navigate('/officer/dashboard');
            break;
          case 'collector':
            navigate('/collector/dashboard');
            break;
          default:
            navigate('/dashboard');
        }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative"
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
      <div className="max-w-md w-full space-y-8 relative" style={{ zIndex: 1 }}>
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
            <Users className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Employee Portal
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your employee account
          </p>
        </div>

        <div className="bg-white shadow-xl rounded-lg p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-1">
                Employee ID, Email, or Phone Number
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                required
                value={formData.identifier}
                onChange={handleChange}
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter employee ID, email, or phone"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-3 py-3 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Login Options</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <Link
                to="/login"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Shield className="h-4 w-4 mr-2" />
                Admin Login
              </Link>
            </div>
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Login Information:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Use your Employee ID (e.g., CLK-0001), Email, or Phone Number</li>
                  <li>Contact your administrator if you forgot your password</li>
                  <li>You'll be prompted to change your password on first login</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-gray-600">
          <p>&copy; 2024 HTCMS. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLogin;
