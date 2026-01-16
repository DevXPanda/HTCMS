import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { demandAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Zap, AlertCircle } from 'lucide-react';

const GenerateDemands = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: {
      financialYear: `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`,
      dueDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0] // Dec 31 of current year
    }
  });

  const onSubmit = async (data) => {
    if (!window.confirm(
      `Are you sure you want to generate tax demands for financial year ${data.financialYear}?\n\n` +
      `This will create tax demands for all approved tax assessments.`
    )) {
      return;
    }

    try {
      setGenerating(true);
      setResult(null);

      const response = await demandAPI.generateBulk({
        financialYear: data.financialYear,
        dueDate: data.dueDate
      });

      if (response.data.success) {
        setResult(response.data.data);
        toast.success(`Successfully generated ${response.data.data.created} tax demands!`);
        
        // Auto-navigate after 3 seconds
        setTimeout(() => {
          navigate('/demands');
        }, 3000);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to generate demands');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link to="/demands" className="mr-4 text-primary-600 hover:text-primary-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Generate Demands</h1>
        </div>
      </div>

      <div className="card max-w-2xl">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-800 mb-1">Important Information</h3>
              <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                <li>This will generate demands for all approved assessments</li>
                <li>Existing demands for the same financial year will be skipped</li>
                <li>Arrears from previous unpaid demands will be automatically included</li>
                <li>This action cannot be undone</li>
              </ul>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="label">
              Financial Year <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('financialYear', {
                required: 'Financial year is required',
                pattern: {
                  value: /^\d{4}-\d{2}$/,
                  message: 'Format must be YYYY-YY (e.g., 2024-25)'
                }
              })}
              className="input"
              placeholder="2024-25"
            />
            {errors.financialYear && (
              <p className="text-red-500 text-sm mt-1">{errors.financialYear.message}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Format: YYYY-YY (e.g., 2024-25 for April 2024 to March 2025)
            </p>
          </div>

          <div>
            <label className="label">
              Due Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('dueDate', {
                required: 'Due date is required'
              })}
              className="input"
            />
            {errors.dueDate && (
              <p className="text-red-500 text-sm mt-1">{errors.dueDate.message}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              The date by which the demand should be paid
            </p>
          </div>

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">Generation Results</h3>
              <div className="space-y-1 text-sm text-green-700">
                <p><strong>Successfully Created:</strong> {result.created} demands</p>
                {result.errors > 0 && (
                  <p className="text-yellow-700">
                    <strong>Skipped:</strong> {result.errors} demands (already exist or errors)
                  </p>
                )}
              </div>
              {result.details && result.details.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-green-800">
                    View Details
                  </summary>
                  <div className="mt-2 text-xs text-green-600 max-h-40 overflow-y-auto">
                    {result.details.map((detail, index) => (
                      <p key={index}>Assessment {detail.assessmentId}: {detail.message}</p>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Link to="/demands" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={generating || loading}
              className="btn btn-primary flex items-center"
            >
              <Zap className="w-4 h-4 mr-2" />
              {generating ? 'Generating...' : 'Generate Demands'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GenerateDemands;
