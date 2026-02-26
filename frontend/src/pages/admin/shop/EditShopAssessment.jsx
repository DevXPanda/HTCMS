import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useShopTaxBasePath } from '../../../contexts/ShopTaxBasePathContext';
import { shopTaxAssessmentsAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import Loading from '../../../components/Loading';

const EditShopAssessment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePath = useShopTaxBasePath();
  const [loading, setLoading] = useState(false);
  const [loadingAssessment, setLoadingAssessment] = useState(true);
  const [assessment, setAssessment] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm();

  useEffect(() => {
    fetchAssessment();
  }, [id]);

  const fetchAssessment = async () => {
    try {
      setLoadingAssessment(true);
      const response = await shopTaxAssessmentsAPI.getById(id);
      const a = response.data.data.assessment;
      setAssessment(a);
      if (a.status !== 'draft') {
        toast.error('Only draft assessments can be edited');
        navigate(`${basePath}/shop-tax/assessments`);
        return;
      }
      reset({
        financialYear: a.financialYear || '',
        assessedValue: a.assessedValue ?? '',
        rate: a.rate ?? '',
        annualTaxAmount: a.annualTaxAmount ?? '',
        remarks: a.remarks || ''
      });
    } catch (error) {
      toast.error('Failed to load assessment');
      navigate(`${basePath}/shop-tax/assessments`);
    } finally {
      setLoadingAssessment(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const payload = {
        financialYear: data.financialYear || null,
        assessedValue: data.assessedValue ? parseFloat(data.assessedValue) : null,
        rate: data.rate ? parseFloat(data.rate) : null,
        annualTaxAmount: parseFloat(data.annualTaxAmount) || 0,
        remarks: data.remarks || null
      };
      await shopTaxAssessmentsAPI.update(id, payload);
      toast.success('Shop tax assessment updated successfully');
      navigate(`${basePath}/shop-tax/assessments/${id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update assessment');
    } finally {
      setLoading(false);
    }
  };

  if (loadingAssessment) return <Loading message="Loading shop tax assessment..." />;
  if (!assessment) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="ds-page-title">Edit Shop Tax Assessment</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Assessment Information</h2>
          <p className="text-sm text-gray-600">
            Shop and Assessment Year cannot be changed. Only tax details can be updated.
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-gray-500">Assessment:</dt>
            <dd className="font-medium">{assessment.assessmentNumber}</dd>
            <dt className="text-gray-500">Shop:</dt>
            <dd className="font-medium">{assessment.shop?.shopName || assessment.shopId}</dd>
            <dt className="text-gray-500">Year:</dt>
            <dd className="font-medium">{assessment.assessmentYear}</dd>
          </dl>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Tax Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Financial Year</label>
              <input
                type="text"
                {...register('financialYear')}
                className="input"
                placeholder="e.g. 2024-25"
              />
            </div>
            <div>
              <label className="label">Assessed Value (₹)</label>
              <input
                type="number"
                step="0.01"
                {...register('assessedValue')}
                className="input"
              />
            </div>
            <div>
              <label className="label">Rate (₹)</label>
              <input
                type="number"
                step="0.01"
                {...register('rate')}
                className="input"
              />
            </div>
            <div>
              <label className="label">Annual Tax Amount (₹) <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="0.01"
                {...register('annualTaxAmount', {
                  required: 'Annual tax amount is required',
                  min: { value: 0, message: 'Must be ≥ 0' },
                  valueAsNumber: true
                })}
                className="input"
              />
              {errors.annualTaxAmount && (
                <p className="text-red-500 text-sm mt-1">{errors.annualTaxAmount.message}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="label">Remarks</label>
              <textarea
                {...register('remarks')}
                className="input"
                rows={2}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Link to={`${basePath}/shop-tax/assessments/${id}`} className="btn btn-secondary">
            Cancel
          </Link>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Updating...' : 'Update Assessment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditShopAssessment;
