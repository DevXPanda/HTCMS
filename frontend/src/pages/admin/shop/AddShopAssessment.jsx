import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useShopTaxBasePath } from '../../../contexts/ShopTaxBasePathContext';
import { shopTaxAssessmentsAPI, shopsAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

const AddShopAssessment = () => {
  const navigate = useNavigate();
  const basePath = useShopTaxBasePath();
  const [loading, setLoading] = useState(false);
  const [shops, setShops] = useState([]);
  const [loadingShops, setLoadingShops] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: {
      assessmentYear: new Date().getFullYear(),
      financialYear: `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`,
      assessedValue: '',
      rate: '',
      annualTaxAmount: '',
      remarks: ''
    }
  });

  useEffect(() => {
    shopsAPI.getAll({ limit: 1000, status: 'active' })
      .then(res => {
        if (res.data.success) setShops(res.data.data.shops || []);
      })
      .catch(() => toast.error('Failed to load shops'))
      .finally(() => setLoadingShops(false));
  }, []);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const payload = {
        shopId: parseInt(data.shopId, 10),
        assessmentYear: parseInt(data.assessmentYear, 10),
        financialYear: data.financialYear || undefined,
        assessedValue: data.assessedValue ? parseFloat(data.assessedValue) : null,
        rate: data.rate ? parseFloat(data.rate) : null,
        annualTaxAmount: parseFloat(data.annualTaxAmount) || 0,
        remarks: data.remarks || null
      };
      const response = await shopTaxAssessmentsAPI.create(payload);
      if (response.data.success) {
        toast.success('Shop tax assessment created successfully');
        navigate(`${basePath}/shop-tax/assessments`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create assessment');
    } finally {
      setLoading(false);
    }
  };

  if (loadingShops) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link to={`${basePath}/shop-tax/assessments`} className="mr-4 text-primary-600 hover:text-primary-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Create Shop Tax Assessment</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Shop & Year</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Shop <span className="text-red-500">*</span></label>
              <select
                {...register('shopId', { required: 'Shop is required' })}
                className="input"
              >
                <option value="">Select Shop</option>
                {shops.map(shop => (
                  <option key={shop.id} value={shop.id}>
                    {shop.shopNumber} – {shop.shopName} {shop.ward?.wardName ? `(${shop.ward.wardName})` : ''}
                  </option>
                ))}
              </select>
              {errors.shopId && (
                <p className="text-red-500 text-sm mt-1">{errors.shopId.message}</p>
              )}
            </div>
            <div>
              <label className="label">Assessment Year <span className="text-red-500">*</span></label>
              <input
                type="number"
                {...register('assessmentYear', {
                  required: 'Assessment year is required',
                  min: { value: 2000, message: 'Year must be 2000 or later' },
                  max: { value: 2100, message: 'Year must be 2100 or earlier' },
                  valueAsNumber: true
                })}
                className="input"
              />
              {errors.assessmentYear && (
                <p className="text-red-500 text-sm mt-1">{errors.assessmentYear.message}</p>
              )}
            </div>
            <div>
              <label className="label">Financial Year</label>
              <input
                type="text"
                {...register('financialYear')}
                className="input"
                placeholder="e.g. 2024-25"
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Tax Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Assessed Value (₹)</label>
              <input
                type="number"
                step="0.01"
                {...register('assessedValue')}
                className="input"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="label">Rate (₹)</label>
              <input
                type="number"
                step="0.01"
                {...register('rate')}
                className="input"
                placeholder="Optional"
              />
            </div>
            <div className="md:col-span-2">
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
                placeholder="Optional"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Creating...' : 'Create Assessment'}
          </button>
          <Link to={`${basePath}/shop-tax/assessments`} className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default AddShopAssessment;
