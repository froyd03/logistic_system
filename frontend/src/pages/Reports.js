import React, { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { analyticsAPI } from '../services/api';
import { Button, Spinner } from '../components/common/UI';
import toast from 'react-hot-toast';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const Reports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [exporting, setExporting] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await analyticsAPI.getMonthly({ year });
      setData(res.data);
    } catch { toast.error('Failed to load analytics'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [year]);

  const handleExport = async (type) => {
    const month = new Date().getMonth() + 1;
    setExporting(type);
    try {
      const res = type === 'pdf'
        ? await analyticsAPI.exportPDF({ month, year })
        : await analyticsAPI.exportCSV({ month, year });
      const url = URL.createObjectURL(new Blob([res]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `transport-report-${year}-${month}.${type}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${type.toUpperCase()} exported`);
    } catch { toast.error('Export failed'); }
    finally { setExporting(''); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Spinner size="lg" /></div>;

  // Process monthly data for chart
  const monthlyTotals = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const rows = (data?.monthlyData || []).filter(d => parseInt(d.month) === month);
    const fuel = rows.find(r => r.expense_type === 'fuel')?.total || 0;
    const maintenance = rows.find(r => r.expense_type === 'maintenance')?.total || 0;
    const other = rows.filter(r => !['fuel','maintenance'].includes(r.expense_type)).reduce((s, r) => s + parseFloat(r.total || 0), 0);
    return { month: MONTHS[i], fuel: parseFloat(fuel), maintenance: parseFloat(maintenance), other: parseFloat(other.toFixed(2)) };
  });

  const topVehicles = data?.vehicleCosts || [];
  const fuel = data?.fuelSummary || {};

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select value={year} onChange={e => setYear(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            {[2023, 2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button onClick={() => handleExport('pdf')} loading={exporting === 'pdf'} variant="outline" size="sm">📄 Export PDF</Button>
          <Button onClick={() => handleExport('csv')} loading={exporting === 'csv'} variant="outline" size="sm">📊 Export CSV</Button>
        </div>
      </div>

      {/* Fuel Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Fuel (L)', value: parseFloat(fuel.total_liters || 0).toFixed(0) + ' L' },
          { label: 'Fuel Cost', value: `₱${parseFloat(fuel.total_cost || 0).toLocaleString()}` },
          { label: 'Avg Price/L', value: `₱${parseFloat(fuel.avg_price || 0).toFixed(2)}` }
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Monthly Cost Breakdown */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Monthly Cost Breakdown ({year})</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyTotals}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} />
            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
              formatter={v => [`₱${parseFloat(v).toLocaleString()}`, '']}
            />
            <Legend />
            <Bar dataKey="fuel" stackId="a" fill="#3B82F6" name="Fuel" radius={[0,0,0,0]} />
            <Bar dataKey="maintenance" stackId="a" fill="#F59E0B" name="Maintenance" />
            <Bar dataKey="other" stackId="a" fill="#10B981" name="Other" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Cost Vehicles */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Highest Cost Vehicles</h3>
        {topVehicles.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No data available</p>
        ) : (
          <div className="space-y-3">
            {topVehicles.map((v, i) => {
              const maxCost = parseFloat(topVehicles[0]?.dataValues?.total_cost || 0);
              const cost = parseFloat(v.dataValues?.total_cost || 0);
              const pct = maxCost > 0 ? (cost / maxCost) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-xs font-bold text-blue-600">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {v.vehicle?.name || 'Unknown'} <span className="text-gray-400 font-mono text-xs">({v.vehicle?.plate_number})</span>
                      </span>
                      <span className="text-sm font-bold text-gray-900">₱{cost.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
