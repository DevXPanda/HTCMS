import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Building2, Receipt, Shield, Bell, LineChart,
  Users, CheckCircle2, ArrowRight, FileText,
  UserCheck, Briefcase, User, X
} from 'lucide-react';
import CitizenLogin from './auth/CitizenLogin';
import AdminLogin from './auth/AdminLogin';
import StaffLogin from './auth/StaffLogin';
import Register from './auth/Register';
import { StaffAuthProvider } from '../contexts/StaffAuthContext';

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showLogin, setShowLogin] = React.useState(false);
  const [loginType, setLoginType] = React.useState('citizen'); // 'citizen', 'admin', 'staff', 'register'

  React.useEffect(() => {
    const authType = searchParams.get('auth');
    if (authType) {
      setLoginType(authType);
      setShowLogin(true);
      // Clean up the URL after opening
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const renderLoginModal = () => {
    if (!showLogin) return null;

    const props = {
      isModal: true,
      onClose: () => setShowLogin(false),
      onSwitch: (type) => setLoginType(type)
    };

    switch (loginType) {
      case 'admin':
        return <AdminLogin {...props} />;
      case 'staff':
        return <StaffLogin {...props} />;

      case 'register':
        return <Register {...props} />;
      default:
        return <CitizenLogin {...props} />;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col font-sans ${showLogin ? 'overflow-hidden' : ''}`}>
      {renderLoginModal()}
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/ULB Logo.png" alt="ULB Logo" className="w-12 h-12 object-contain" />
            <span className="text-2xl font-black text-gray-900 tracking-tight">Urban Local Bodies</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setLoginType('citizen'); setShowLogin(true); }}
              className="text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => { setLoginType('register'); setShowLogin(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
            >
              Register
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 md:pt-32 md:pb-40 overflow-hidden bg-slate-900">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900/80 to-slate-900 z-10" />
          <img
            src="https://images.unsplash.com/photo-1449844908441-8829872d2607?q=80&w=2070&auto=format&fit=crop"
            alt="City overview"
            className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-blue-100 text-sm font-medium mb-8 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-green-400"></span>
            Smart Urban Governance
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-white drop-shadow-md">
            Urban Local Bodies <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Tax Collection & Management System</span>
          </h1>
          <p className="text-lg md:text-xl text-blue-100/90 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
            Manage, Track & Collect Taxes Efficiently. A comprehensive platform for urban local bodies to streamline revenue collection and citizen services.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => { setLoginType('citizen'); setShowLogin(true); }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2 border border-blue-500"
            >
              Go to Login <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => { setLoginType('register'); setShowLogin(true); }}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center"
            >
              Register as Citizen
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-blue-600 font-semibold tracking-wider uppercase text-sm mb-2">Platform Capabilities</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Core Features</h3>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              Our system is designed with powerful tools to make tax administration transparent, easy, and highly efficient.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Receipt, title: 'Demand Generation', desc: 'Automatically calculate and generate tax demands for residential and commercial properties.' },
              { icon: LineChart, title: 'Payment Tracking', desc: 'Monitor collections, arrears, and partial payments in real-time with dashboards.' },
              { icon: Shield, title: 'Role-based Access', desc: 'Secure hierarchy for Admins, Accountants, Collectors, and Citizens.' },
              { icon: FileText, title: 'Real-time Reports', desc: 'Generate printable receipts, detailed ledgers, and insightful reports instantly.' },
              { icon: Bell, title: 'Notifications', desc: 'Automated SMS and email alerts for pending dues, payment confirmations.' },
              { icon: CheckCircle2, title: 'Secure Data', desc: 'End-to-end security ensuring citizen data and financial transactions remain safe.' },
            ].map((feature, idx) => (
              <div key={idx} className="bg-gray-50/50 p-8 rounded-2xl border border-gray-100 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-900/5 transition-all group">
                <div className="w-14 h-14 bg-white shadow-sm text-blue-600 rounded-xl flex items-center justify-center mb-6 border border-gray-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <feature.icon className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h4>
                <p className="text-gray-600 leading-relaxed text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-blue-600 font-semibold tracking-wider uppercase text-sm mb-2">Process</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h3>
          </div>

          <div className="relative">
            <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-blue-100 via-blue-500 to-blue-100"></div>

            <div className="grid md:grid-cols-4 gap-12 md:gap-8">
              {[
                { step: '01', title: 'Generate Demand', desc: 'System auto-generates tax bills based on property details.' },
                { step: '02', title: 'Citizen Pays', desc: 'Online portal allows quick and secure tax payment.' },
                { step: '03', title: 'Admin Approves', desc: 'Payments are reviewed and reconciled by accountants.' },
                { step: '04', title: 'Collector Assigned', desc: 'Field staff manage pending offline collections.' },
              ].map((item, idx) => (
                <div key={idx} className="relative z-10 flex flex-col items-center text-center group">
                  <div className="w-24 h-24 bg-white text-blue-600 rounded-2xl flex items-center justify-center text-3xl font-black mb-6 shadow-xl shadow-blue-900/5 border border-gray-100 group-hover:-translate-y-2 transition-transform">
                    {item.step}
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h4>
                  <p className="text-gray-500 text-sm leading-relaxed max-w-xs">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* User Roles Section */}
      <section className="py-24 bg-blue-900 text-white relative overflow-hidden">
        {/* Decorative background circle */}
        <div className="absolute top-0 right-0 -mr-40 -mt-40 w-96 h-96 rounded-full bg-blue-800/50 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-40 -mb-40 w-96 h-96 rounded-full bg-blue-800/50 blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Empowering Every Stakeholder</h2>
            <p className="text-blue-200 max-w-2xl mx-auto text-lg font-light">
              Tailored interfaces to optimize workflow for different government roles.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, role: 'Admin', desc: 'Complete oversee of properties, users, and overall system configuration.' },
              { icon: Briefcase, role: 'Accountant', desc: 'Manages ledgers, verifies payments, and generates financial reports.' },
              { icon: UserCheck, role: 'Collector', desc: 'Mobile-friendly access for on-the-ground cash and cheque collections.' },
              { icon: User, role: 'Citizen', desc: 'Self-service portal to view demands, history, and make online payments.' },
            ].map((role, idx) => (
              <div key={idx} className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 hover:bg-white/10 transition-all text-left">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6">
                  <role.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 tracking-wide">{role.role}</h3>
                <p className="text-blue-100/70 text-sm leading-relaxed">{role.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-gray-50 to-white -z-10"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight">Start Managing Taxes Smartly</h2>
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
            Join the digital transformation of civic governance today. Login to your dashboard to get started.
          </p>
          <button
            onClick={() => { setLoginType('citizen'); setShowLogin(true); }}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5"
          >
            Go to Login <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-12 border-t border-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="p-1.5 bg-white rounded-xl shadow-lg border border-white/10">
              <img src="/ULB Logo.png" alt="ULB Logo" className="w-8 h-8 object-contain" />
            </span>
            <div className="flex flex-col">
              <span className="text-white text-lg font-bold tracking-tight leading-none">Urban Local Bodies</span>
              <span className="text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Governance Portal</span>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-500 text-center md:text-left">
            &copy; {new Date().getFullYear()} Urban Local Bodies. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm font-medium">
            <button onClick={() => { setLoginType('citizen'); setShowLogin(true); }} className="hover:text-white transition-colors">Login</button>
            <button onClick={() => { setLoginType('register'); setShowLogin(true); }} className="hover:text-white transition-colors">Register</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
