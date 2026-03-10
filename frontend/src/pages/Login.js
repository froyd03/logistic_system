import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import logisticLogo from '../assets/logistics_logo.png';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/vehicles');
    } catch (err) {
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    // { role: 'Admin', email: 'admin@hotel.com', password: 'Admin@123', color: 'bg-purple-50 border-purple-200 text-purple-700' },
    // { role: 'Transport Mgr', email: 'transport@hotel.com', password: 'Manager@123', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    // { role: 'Driver', email: 'juan@hotel.com', password: 'Driver@123', color: 'bg-green-50 border-green-200 text-green-700' },
    // { role: 'Staff', email: 'maria@hotel.com', password: 'Staff@123', color: 'bg-orange-50 border-orange-200 text-orange-700' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 flex items-center justify-center p-4">
      <div className="contentContainer">
        {/* Left: Branding */}
        <div className="brandingContent gap-2 text-white">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center">
              <img src={logisticLogo} alt="Logo" className="w-12 h-12" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Logistic 2</h1>
            </div>
          </div>
          <h2 className="text-4xl font-bold mb-4 leading-tight">Fleet & Transportation<br />Operations System</h2>
          {/* {<p className="text-blue-200 text-sm leading-relaxed mb-8">
            Manage your entire hotel and restaurant fleet operations with real-time tracking, driver management, cost analytics, and automated dispatch.
          </p>} */}
          <div className="grid grid-cols-2 gap-3">
            {['Fleet & Vehicle Managmnt',
              'Vehicle Reservation & Dispatch',
              'Driver and Trip Performance Monitoring',
              'Transport Cost Analysis & Optimization '
              ].map(f => (
              <div key={f} className="bg-white/10 backdrop-blur rounded-xl px-3 py-2 text-xs text-blue-100">{f}</div>
            ))}
          </div>
        </div>

        {/* Right: Login Form */}
        <div className="loginFormContent">
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Sign In</h3>
            <p className="text-sm text-gray-400 mb-6">Access your operations dashboard</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email" required value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password" required value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : ''}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6">
              {/* <p className="text-xs text-gray-400 mb-3 text-center">Demo Accounts</p> */}
              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map(a => (
                  <button
                    key={a.role}
                    onClick={() => setForm({ email: a.email, password: a.password })}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors hover:opacity-80 ${a.color}`}
                  >
                    {a.role}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
