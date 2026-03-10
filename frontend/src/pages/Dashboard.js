import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { analyticsAPI } from '../services/api';
import { Card, Spinner } from '../components/common/UI';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const STATUS_COLORS = { available: '#10B981', reserved: '#3B82F6', in_transit: '#F59E0B', maintenance: '#F97316', inactive: '#6B7280' };

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsAPI.getDashboard()
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-96"><Spinner size="lg" /></div>;
  if (!stats) return null;

  const { cards, charts } = stats;

  const tripsChartData = (charts.tripsPerMonth || []).map(t => ({
    name: MONTHS[(t.month || 1) - 1],
    trips: parseInt(t.count || 0)
  }));

  const vehicleStatusData = (charts.vehicleStatus || []).map(s => ({
    name: s.status?.replace('_', ' ') || '',
    value: parseInt(s.count || 0),
    fill: STATUS_COLORS[s.status] || '#6B7280'
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Operations Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Fleet & Transportation Overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Total Vehicles" value={cards.totalVehicles || 0} icon="🚗" color="blue" subtitle="Active fleet" />
        <Card title="Active Drivers" value={cards.activeDrivers || 0} icon="👤" color="green" subtitle="Available now" />
        <Card title="In Transit" value={cards.inTransit || 0} icon="🗺️" color="yellow" subtitle="On the road" />
        <Card title="Pending Requests" value={cards.pendingReservations || 0} icon="📋" color="orange" subtitle="Awaiting approval" />
        <Card title="Monthly Cost" value={`₱${(cards.monthlyExpense || 0).toLocaleString()}`} icon="💰" color="purple" subtitle="This month" />
        <Card title="Fuel Consumed" value={`${(cards.fuelConsumption || 0).toFixed(0)}L`} icon="⛽" color="red" subtitle="This month" />
        <Card title="Completed Trips" value={cards.completedTrips || 0} icon="✅" color="green" subtitle="This month" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Trips Per Month</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={tripsChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="trips" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Vehicle Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={vehicleStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {vehicleStatusData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {vehicleStatusData.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.fill }} />
                  <span className="text-gray-600 capitalize">{s.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'New Reservation', icon: '📋', href: '/reservations?new=1', color: 'bg-blue-50 hover:bg-blue-100 text-blue-700' },
            { label: 'Add Vehicle', icon: '🚗', href: '/vehicles?new=1', color: 'bg-green-50 hover:bg-green-100 text-green-700' },
            { label: 'Add Driver', icon: '👤', href: '/drivers?new=1', color: 'bg-purple-50 hover:bg-purple-100 text-purple-700' },
            { label: 'Log Expense', icon: '💰', href: '/expenses?new=1', color: 'bg-orange-50 hover:bg-orange-100 text-orange-700' }
          ].map(a => (
            <a
              key={a.label}
              href={a.href}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${a.color}`}
            >
              <span>{a.icon}</span>
              {a.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
