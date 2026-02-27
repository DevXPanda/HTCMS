import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { demandAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { Zap, AlertCircle, Droplet } from 'lucide-react';
import { useConfirm } from '../../../components/ConfirmModal';
import { useShopTaxBasePath } from '../../../contexts/ShopTaxBasePathContext';

const GenerateWaterDemands = () => {
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
      title: 'Generate water demands',
      message: `Are you sure you want to generate water tax demands for financial year ${data.financialYear}? This will create demands for all approved water tax assessments.`,
      confirmLabel: 'Generate'
    });
    if (!ok) return;

    try {
      setGenerating(true);
      setResult(null);
      const response = await demandAPI.generateBulkWater({
        financialYear: data.financialYear,
        dueDate: data.dueDate
      });
      if (response.data.success) {
        const d = response.data.data;
        setResult(d);
        const msg = `Water demands: ${d.createdCount ?? 0} created, ${d.skippedCount ?? 0} already existed${(d.errorDetails?.length) ? `, ${d.errorDetails.length} errors` : ''}`;
        (d.errorDetails?.length) ? toast.error(msg) : toast.success(msg);
        if ((d.createdCount ?? 0) > 0) setTimeout(() => navigate(`${basePath}/demands`), 3000);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate water demands');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="ds-page-title">Generate Water Tax Demands</h1>
          <p className="ds-page-subtitle mt-1">Bulk generation for water tax only</p>
        </div>
        <Link to={`${basePath}/demands/generate`} className="btn btn-secondary">
          ← Back to Generate Demands
        </Link>
      </div>

      <div className="card max-w-2xl">
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-cyan-600 mr-2 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-cyan-800 mb-1 flex items-center">
                <Droplet className="w-5 h-5 mr-1 text-cyan-600" />
                Bulk Generation - Water Tax Only
              </h3>
              <ul className="text-sm text-cyan-700 space-y-1 list-disc list-inside">
                <li>Generates Water Tax demands for all approved water tax assessments</li>
                <li>Existing demands for the same financial year will be skipped</li>
                <li>Arrears from previous unpaid water demands will be included</li>
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
              <p className="text-sm text-green-700"><strong>Created:</strong> {result.createdCount ?? 0} demands</p>
              <p className="text-sm text-green-700"><strong>Skipped (already existed):</strong> {result.skippedCount ?? 0}</p>
              {(result.errorDetails?.length) > 0 && (
                <p className="text-amber-700 text-sm mt-1"><strong>Errors:</strong> {result.errorDetails.length}</p>
              )}
            </div>
          )}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <Link to={`${basePath}/demands`} className="btn btn-secondary">Cancel</Link>
            <button type="submit" disabled={generating} className="btn btn-primary flex items-center">
              <Zap className="w-4 h-4 mr-2" />
              {generating ? 'Generating...' : 'Generate Water Tax Demands'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GenerateWaterDemands;
