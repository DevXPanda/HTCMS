import { Link } from 'react-router-dom';
import { Building2, Droplet, Store, Truck, Zap } from 'lucide-react';
import { useShopTaxBasePath } from '../../../contexts/ShopTaxBasePathContext';

const GenerateDemands = () => {
  const basePath = useShopTaxBasePath();

  return (
    <div>
      <div className="mb-6">
        <h1 className="ds-page-title">Generate Demands</h1>
        <p className="ds-page-subtitle mt-1">
          Each module has its own generate demands. Go to the module to generate that tax type. Use Unified Tax Demand to generate all in one go.
        </p>
      </div>

      <div className="card p-6 max-w-2xl">
        <p className="text-gray-600 mb-6">
          <strong>Property Tax</strong> → Open Property Tax module and use &quot;Generate Property Tax Demands&quot;.<br />
          <strong>Water Tax</strong> → Open Water Tax module and use &quot;Generate Water Tax Demands&quot;.<br />
          <strong>Shop Tax</strong> → Open Shop Tax module and use &quot;Generate Shop Tax Demands&quot;.<br />
          <strong>D2DC</strong> → Open D2DC module and use &quot;Generate D2DC Demands&quot;.<br />
          <strong>All modules at once</strong> → Use Unified Tax Demand.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/property-tax" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
            <Building2 className="w-4 h-4" /> Property Tax Module
          </Link>
          <Link to="/water-tax" className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-200">
            <Droplet className="w-4 h-4" /> Water Tax Module
          </Link>
          <Link to={basePath ? `${basePath}/shop-tax` : '/shop-tax'} className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200">
            <Store className="w-4 h-4" /> Shop Tax Module
          </Link>
          <Link to="/tax-management/d2dc" className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200">
            <Truck className="w-4 h-4" /> D2DC Module
          </Link>
          <Link to={`${basePath}/demands/unified`} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            <Zap className="w-4 h-4" /> Unified Tax Demand
          </Link>
        </div>
      </div>
    </div>
  );
};

export default GenerateDemands;
