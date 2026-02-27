import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { demandAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { Zap, AlertCircle } from 'lucide-react';
import { useConfirm } from '../../../components/ConfirmModal';
import { useShopTaxBasePath } from '../../../contexts/ShopTaxBasePathContext';

const GeneratePropertyDemands = () => {
  const navigate = useNavigate();
  const basePath = useShopTaxBasePath();
  const { confirm } = useConfirm();
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      financialYear: `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`,
      dueDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]
    }
  });

  const onSubmit = async (data) => {
    const ok = await confirm({
      title: 'Generate property demands',
      message: `Are you sure you want to generate property tax demands for financial year ${data.financialYear}? This will create demands for all approved property tax assessments.`,
      confirmLabel: 'Generate'
    });
    if (!ok) return;

    try {
      setGenerating(true);
      setResult(null);
      const response = await demandAPI.generateBulk({
        financialYear: data.financialYear,
        dueDate: data.dueDate
      });
      if (response.data.success) {
        setResult(response.data.data);
        toast.success(`Successfully generated ${response.data.data.created} property tax demands!`);
        setTimeout(() => navigate(`${basePath}/demands`), 3000);
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
        <div>
          <h1 className="ds-page-title">Generate Property Tax Demands</h1>
          <p className="ds-page-subtitle mt-1">Bulk generation for property (house) tax only</p>
        </div>
        <Link to={`${basePath}/demands/generate`} className="btn btn-secondary">
          ← Back to Generate Demands
        </Link>
      </div>

      <div className="card max-w-2xl">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-800 mb-1">Bulk Generation - House Tax Only</h3>
              <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                <li>Generates House Tax demands for all approved assessments</li>
                <li>Existing demands for the same financial year will be skipped</li>
                <li>Arrears from previous unpaid demands will be included</li>
                <li>This action cannot be undone</li>
              </ul>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="label">Financial Year <span className="text-red-500">*</span></label>
            <input
              type="text"
              {...register('financialYear', {
                required: 'Financial year is required',
                pattern: { value: /^\d{4}-\d{2}$/, message: 'Format must be YYYY-YY (e.g., 2024-25)' }
              })}
              className="input"
              placeholder="2024-25"
            />
            {errors.financialYear && <p className="text-red-500 text-sm mt-1">{errors.financialYear.message}</p>}
          </div>
          <div>
            <label className="label">Due Date <span className="text-red-500">*</span></label>
            <input type="date" {...register('dueDate', { required: 'Due date is required' })} className="input" />
            {errors.dueDate && <p className="text-red-500 text-sm mt-1">{errors.dueDate.message}</p>}
          </div>
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">Results</h3>
              <p className="text-sm text-green-700"><strong>Created:</strong> {result.created} demands</p>
              {result.errors > 0 && <p className="text-yellow-700 text-sm mt-1"><strong>Skipped:</strong> {result.errors}</p>}
            </div>
          )}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <Link to={`${basePath}/demands`} className="btn btn-secondary">Cancel</Link>
            <button type="submit" disabled={generating} className="btn btn-primary flex items-center">
              <Zap className="w-4 h-4 mr-2" />
              {generating ? 'Generating...' : 'Generate Property Tax Demands'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GeneratePropertyDemands;
