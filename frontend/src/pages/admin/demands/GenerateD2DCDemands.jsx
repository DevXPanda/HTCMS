import { Link } from 'react-router-dom';
import { Truck, Zap } from 'lucide-react';
import { useShopTaxBasePath } from '../../../contexts/ShopTaxBasePathContext';

const GenerateD2DCDemands = () => {
  const basePath = useShopTaxBasePath();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="ds-page-title">Generate D2DC Demands</h1>
          <p className="ds-page-subtitle mt-1">D2DC (garbage collection) demand generation</p>
        </div>
        <Link to={`${basePath}/demands/generate`} className="btn btn-secondary">
          ← Back to Generate Demands
        </Link>
      </div>

      <div className="card max-w-2xl">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-purple-600 shrink-0">
              <Truck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-purple-800 mb-2">D2DC Demands</h3>
              <p className="text-sm text-purple-700 mb-4">
                D2DC (door-to-door collection) demands are generated per property as part of the <strong>Unified Tax Demand</strong> flow.
                Use Unified Tax Demand to generate Property + Water + Shop + D2DC demands in one go for a selected property.
              </p>
              <Link
                to={`${basePath}/demands/unified`}
                className="btn btn-primary inline-flex items-center"
              >
                <Zap className="w-4 h-4 mr-2" />
                Go to Unified Tax Demand
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateD2DCDemands;
