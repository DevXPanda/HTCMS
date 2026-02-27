import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { demandAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { Store, Zap } from 'lucide-react';
import { useConfirm } from '../../../components/ConfirmModal';
import { useShopTaxBasePath } from '../../../contexts/ShopTaxBasePathContext';

const GenerateShopDemands = () => {
  const basePath = useShopTaxBasePath();
  const { confirm } = useConfirm();
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      financialYear: `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`,
      dueDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]
    }
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    const fy = watch('financialYear')?.trim();
    const due = watch('dueDate');
    if (!fy || !/^\d{4}-\d{2}$/.test(fy)) {
      toast.error('Financial year is required (e.g. 2024-25)');
      return;
    }
    const ok = await confirm({ title: 'Generate shop demands', message: `Generate shop tax demands for financial year ${fy} for all approved shop assessments?`, confirmLabel: 'Generate' });
    if (!ok) return;
    try {
      setGenerating(true);
      setResult(null);
      const response = await demandAPI.generateBulkShop({ financialYear: fy, dueDate: due || undefined });
      if (response.data.success) {
        setResult(response.data.data);
        const d = response.data.data;
        const msg = `Shop demands: ${d.createdCount ?? d.created ?? 0} created, ${d.skippedCount ?? d.skipped ?? 0} already existed${(d.errorDetails?.length) ? `, ${d.errorDetails.length} errors` : ''}`;
        (d.errorDetails?.length) ? toast.error(msg) : toast.success(msg);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate shop demands');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="ds-page-title">Generate Shop Tax Demands</h1>
          <p className="ds-page-subtitle mt-1">Bulk generation for shop tax only</p>
        </div>
        <Link to={`${basePath}/demands/generate`} className="btn btn-secondary">
          ← Back to Generate Demands
        </Link>
      </div>

      <div className="card max-w-2xl">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-amber-800 mb-1 flex items-center">
            <Store className="w-5 h-5 mr-2 text-amber-600" />
            Bulk Shop Tax Demands
          </h3>
          <p className="text-sm text-amber-700">
            Generate shop tax demands for all approved shop assessments. Existing demands for the same financial year are skipped.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Financial Year <span className="text-red-500">*</span></label>
            <input type="text" {...register('financialYear')} className="input" placeholder="2024-25" />
          </div>
          <div>
            <label className="label">Due Date (optional)</label>
            <input type="date" {...register('dueDate')} className="input" />
          </div>
          {result && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <strong>Result:</strong> {result.createdCount ?? result.created ?? 0} created, {result.skippedCount ?? result.skipped ?? 0} already existed
              {(result.errorDetails?.length) > 0 && (
                <ul className="mt-2 list-disc list-inside text-amber-900">
                  {result.errorDetails.map((e, i) => (
                    <li key={i}>Assessment {e.assessmentId}: {e.errorMessage}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <Link to={`${basePath}/demands`} className="btn btn-secondary">Cancel</Link>
            <button type="submit" disabled={generating} className="btn btn-secondary flex items-center">
              <Store className="w-4 h-4 mr-2" />
              {generating ? 'Generating...' : 'Generate Shop Tax Demands'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GenerateShopDemands;
