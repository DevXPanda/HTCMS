import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

const Unauthorized = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');

  useEffect(() => {
    // Auto-redirect to appropriate dashboard after 3 seconds
    const timer = setTimeout(() => {
      if (role === 'admin' || role === 'assessor' || role === 'cashier') {
        navigate('/dashboard', { replace: true });
      } else if (role === 'collector') {
        navigate('/collector/dashboard', { replace: true });
      } else if (role === 'citizen') {
        navigate('/citizen/dashboard', { replace: true });
      } else {
        navigate('/citizen/login', { replace: true });
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [role, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-red-100 p-3 rounded-full">
            <AlertCircle className="w-12 h-12 text-red-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          You don't have permission to access this page. You will be redirected to your dashboard shortly.
        </p>
        <button
          onClick={() => {
            if (role === 'admin' || role === 'assessor' || role === 'cashier') {
              navigate('/dashboard', { replace: true });
            } else if (role === 'collector') {
              navigate('/collector/dashboard', { replace: true });
            } else if (role === 'citizen') {
              navigate('/citizen/dashboard', { replace: true });
            } else {
              navigate('/citizen/login', { replace: true });
            }
          }}
          className="btn btn-primary"
        >
          Go to My Dashboard
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;
