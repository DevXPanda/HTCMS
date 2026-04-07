import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Building2, Users, HardHat, CreditCard, FileText, ClipboardCheck, Bell, UserCog, Loader2 } from 'lucide-react';
import { globalSearchAPI } from '../services/api';

const CATEGORY_META = {
  properties:  { label: 'Properties',  icon: Building2,      color: 'text-blue-600 bg-blue-50' },
  citizens:    { label: 'Citizens',    icon: Users,           color: 'text-green-600 bg-green-50' },
  workers:     { label: 'Workers',     icon: HardHat,         color: 'text-orange-600 bg-orange-50' },
  payments:    { label: 'Payments',    icon: CreditCard,      color: 'text-purple-600 bg-purple-50' },
  demands:     { label: 'Demands',     icon: FileText,        color: 'text-red-600 bg-red-50' },
  assessments: { label: 'Assessments', icon: ClipboardCheck,  color: 'text-teal-600 bg-teal-50' },
  notices:     { label: 'Notices',     icon: Bell,            color: 'text-amber-600 bg-amber-50' },
  staff:       { label: 'Staff',       icon: UserCog,         color: 'text-indigo-600 bg-indigo-50' },
};

const ROLE_PREFIX = {
  admin: '', assessor: '', cashier: '',
  citizen: '/citizen',
  collector: '/collector', tax_collector: '/collector',
  clerk: '/clerk',
  inspector: '/inspector',
  officer: '/officer',
  eo: '/eo',
  supervisor: '/supervisor',
  sfi: '/sfi',
  sbm: '/sbm',
  account_officer: '/account-officer',
};

function getPrefix(role) {
  const r = (role || '').toLowerCase().replace(/-/g, '_');
  return ROLE_PREFIX[r] ?? '';
}

function getNavigationPath(category, item, prefix) {
  switch (category) {
    case 'properties':  return `${prefix}/properties/${item.id}`;
    case 'citizens':    return prefix === '/sbm' ? `/sbm/citizen/${item.id}` : `${prefix}/users`;
    case 'workers':     return prefix === '/sbm' ? `/sbm/workers/${item.id}` : `${prefix}/workers`;
    case 'payments':    return `${prefix}/payments/${item.id}`;
    case 'demands':     return `${prefix}/demands/${item.id}`;
    case 'assessments': return `${prefix}/assessments/${item.id}`;
    case 'notices':     return `${prefix}/notices/${item.id}`;
    case 'staff':       return prefix === '/sbm' ? `/sbm/staff/${item.id}` : `${prefix}/admin-management`;
    default: return prefix || '/';
  }
}

function renderItem(category, item) {
  switch (category) {
    case 'properties':
      return (
        <>
          <span className="font-medium text-gray-900 truncate">{item.ownerName || 'N/A'}</span>
          <span className="text-xs text-gray-500 truncate">{item.propertyNumber || item.uniqueCode} &middot; {item.address || ''}</span>
        </>
      );
    case 'citizens':
      return (
        <>
          <span className="font-medium text-gray-900 truncate">{item.firstName} {item.lastName}</span>
          <span className="text-xs text-gray-500 truncate">{item.phone || item.email || item.username}</span>
        </>
      );
    case 'workers':
      return (
        <>
          <span className="font-medium text-gray-900 truncate">{item.full_name}</span>
          <span className="text-xs text-gray-500 truncate">{item.employee_code} &middot; {item.worker_type || ''}</span>
        </>
      );
    case 'payments':
      return (
        <>
          <span className="font-medium text-gray-900 truncate">{item.paymentNumber || item.receiptNumber}</span>
          <span className="text-xs text-gray-500 truncate">
            {item.amount != null ? `₹${Number(item.amount).toLocaleString('en-IN')}` : ''} &middot; {item.status || ''}
          </span>
        </>
      );
    case 'demands':
      return (
        <>
          <span className="font-medium text-gray-900 truncate">{item.demandNumber}</span>
          <span className="text-xs text-gray-500 truncate">
            {item.financialYear || ''} &middot; {item.serviceType || ''} &middot; {item.status || ''}
            {item.totalAmount != null ? ` &middot; ₹${Number(item.totalAmount).toLocaleString('en-IN')}` : ''}
          </span>
        </>
      );
    case 'assessments':
      return (
        <>
          <span className="font-medium text-gray-900 truncate">{item.assessmentNumber}</span>
          <span className="text-xs text-gray-500 truncate">
            {item.assessmentYear || ''} &middot; {item.status || ''}
            {item.annualTaxAmount != null ? ` &middot; ₹${Number(item.annualTaxAmount).toLocaleString('en-IN')}` : ''}
          </span>
        </>
      );
    case 'notices':
      return (
        <>
          <span className="font-medium text-gray-900 truncate">{item.noticeNumber}</span>
          <span className="text-xs text-gray-500 truncate">{item.noticeType || ''} &middot; {item.financialYear || ''} &middot; {item.status || ''}</span>
        </>
      );
    case 'staff':
      return (
        <>
          <span className="font-medium text-gray-900 truncate">{item.full_name}</span>
          <span className="text-xs text-gray-500 truncate">{item.employee_id} &middot; {item.role || ''} &middot; {item.status || ''}</span>
        </>
      );
    default:
      return <span className="text-gray-700">{JSON.stringify(item)}</span>;
  }
}

const DISPLAY_ORDER = ['properties', 'demands', 'payments', 'assessments', 'citizens', 'workers', 'notices', 'staff'];

export default function GlobalHeaderSearch({
  role,
  embeddedInMenu = false,
  onAfterSelect,
  variant = 'default'
}) {
  const isCentered = variant === 'centered';
  const fullWidthResults = embeddedInMenu || isCentered;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();
  const prefix = getPrefix(role);

  const doSearch = useCallback(async (term) => {
    if (!term || term.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await globalSearchAPI.search(term.trim());
      setResults(data);
      const hasAny = Object.values(data).some((arr) => arr?.length > 0);
      setOpen(hasAny || term.trim().length >= 2);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (val.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(val), 350);
  };

  const handleClear = () => {
    setQuery('');
    setResults(null);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleSelect = (category, item) => {
    const path = getNavigationPath(category, item, prefix);
    setOpen(false);
    setMobileOpen(false);
    setQuery('');
    setResults(null);
    navigate(path);
    onAfterSelect?.();
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setMobileOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const totalResults = results
    ? Object.values(results).reduce((sum, arr) => sum + (arr?.length || 0), 0)
    : 0;

  const renderResults = () => (
    <div
      className={`bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[480px] overflow-y-auto min-w-0 ${
        fullWidthResults ? 'w-full' : 'w-[min(92vw,420px)] sm:w-[340px] md:w-[420px]'
      }`}
    >
      {totalResults === 0 && !loading && (
        <div className="px-4 py-6 text-center text-sm text-gray-500">
          No results found for &ldquo;{query}&rdquo;
        </div>
      )}

      {results && DISPLAY_ORDER.map((cat) => {
        const items = results[cat];
        if (!items?.length) return null;
        const meta = CATEGORY_META[cat];
        if (!meta) return null;
        const Icon = meta.icon;

        return (
          <div key={cat}>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100 sticky top-0">
              <div className={`w-6 h-6 rounded flex items-center justify-center ${meta.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{meta.label}</span>
              <span className="text-xs text-gray-400 ml-auto">{items.length} found</span>
            </div>
            {items.map((item) => (
              <button
                key={`${cat}-${item.id}`}
                type="button"
                onClick={() => handleSelect(cat, item)}
                className="w-full text-left px-3 py-2.5 hover:bg-primary-50 flex flex-col gap-0.5 border-b border-gray-50 transition-colors"
              >
                {renderItem(cat, item)}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );

  const searchInputRowClass = embeddedInMenu || isCentered
    ? 'flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-200/60 transition-all w-full'
    : 'hidden sm:flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus-within:border-primary-400 focus-within:ring-1 focus-within:ring-primary-200 transition-all w-48 md:w-64 lg:w-72';

  return (
    <div ref={containerRef} className={`relative ${embeddedInMenu || isCentered ? 'w-full' : ''}`}>
      {!embeddedInMenu && !isCentered && (
        <button
          type="button"
          onClick={() => {
            setMobileOpen(true);
            setTimeout(() => inputRef.current?.focus(), 10);
          }}
          className="sm:hidden header-icon-btn p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
          title="Search"
        >
          <Search className="w-5 h-5 shrink-0" />
        </button>
      )}

      <div className={searchInputRowClass}>
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (results && totalResults > 0) setOpen(true); }}
          placeholder="Search... (Ctrl+K)"
          className="ml-2 flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none min-w-0"
        />
        {loading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin shrink-0" />}
        {!loading && query && (
          <button type="button" onClick={handleClear} className="p-0.5 text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div
          className={`absolute top-full mt-1.5 z-[85] ${fullWidthResults ? 'left-0 right-0' : 'left-0'}`}
        >
          {renderResults()}
        </div>
      )}

      {!embeddedInMenu && !isCentered && mobileOpen && (
        <div className="sm:hidden fixed inset-0 z-[70] bg-black/40 p-3" onClick={() => setMobileOpen(false)}>
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 max-h-[85vh] overflow-hidden mt-12" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus-within:border-primary-400 focus-within:ring-1 focus-within:ring-primary-200 transition-all">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={handleChange}
                  placeholder="Search..."
                  className="ml-2 flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none min-w-0"
                />
                {loading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin shrink-0" />}
                {!loading && query && (
                  <button type="button" onClick={handleClear} className="p-0.5 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-y-auto max-h-[calc(85vh-68px)]">
              {renderResults()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
