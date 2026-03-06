import { useForm } from 'react-hook-form';
import { waterMeterReadingAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

const AddMeterReadingModal = ({ waterConnectionId, connectionNumber, onClose, onSuccess }) => {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: {
      currentReading: '',
      readingDate: new Date().toISOString().slice(0, 10),
      remarks: ''
    }
  });

  const onSubmit = async (data) => {
    try {
      const payload = {
        waterConnectionId: parseInt(waterConnectionId, 10),
        currentReading: parseFloat(data.currentReading),
        readingDate: data.readingDate || new Date().toISOString(),
        remarks: data.remarks?.trim() || null
      };
      await waterMeterReadingAPI.create(payload);
      toast.success('Meter reading added successfully');
      onSuccess?.();
      onClose();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to add meter reading';
      toast.error(msg);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-panel max-w-md">
        <div className="modal-header">
          <h2 className="modal-title">Add Meter Reading</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        {connectionNumber && (
          <p className="px-6 pt-0 text-sm text-gray-600">
            Connection: <span className="font-medium">{connectionNumber}</span>
          </p>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="modal-body space-y-4">
          <div>
            <label className="label">
              Current Reading <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('currentReading', {
                required: 'Current reading is required',
                valueAsNumber: true,
                min: { value: 0, message: 'Must be 0 or more' }
              })}
              className="input"
              placeholder="e.g. 1250.5"
            />
            {errors.currentReading && (
              <p className="text-red-500 text-sm mt-1">{errors.currentReading.message}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Previous reading is taken from the last recorded reading. Consumption is calculated automatically.
            </p>
          </div>
          <div>
            <label className="label">Reading Date</label>
            <input
              type="date"
              {...register('readingDate')}
              className="input"
            />
          </div>
          <div>
            <label className="label">Remarks</label>
            <textarea
              {...register('remarks')}
              className="input"
              rows={2}
              placeholder="Optional notes"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Reading
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMeterReadingModal;
