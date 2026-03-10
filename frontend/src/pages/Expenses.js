import React, { useState, useEffect } from 'react';
import { analyticsAPI, vehicleAPI, driverAPI } from '../services/api';
import { Button, Input, Select, Modal } from '../components/common/UI';
import toast from 'react-hot-toast';

// ─── Expense Form ────────────────────────────────────────────────────────────
const ExpenseForm = ({ onSave, onClose }) => {
  const [form, setForm] = useState({
    expense_type: 'fuel',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await analyticsAPI.addExpense(form);
      toast.success('Expense recorded');
      onSave();
    } catch (err) {
      const msg = err?.message || 'Failed to record expense';
      toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select label="Type *" name="expense_type" value={form.expense_type} onChange={handleChange}
        options={['fuel','maintenance','toll','parking','insurance','registration','other']
          .map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))} required />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Amount (₱) *" type="number" name="amount" value={form.amount} onChange={handleChange} required min={0} step="0.01" />
        <Input label="Date *" type="date" name="expense_date" value={form.expense_date} onChange={handleChange} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea name="description" value={form.description} onChange={handleChange} rows={2}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">Record Expense</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
};

// ─── Fuel Log Form ────────────────────────────────────────────────────────────
// FIX: Added vehicle_id + driver_id selectors — vehicle_id missing caused NOT NULL DB failure
// FIX: fuel_date now sent as full ISO string, not truncated slice
const FuelLogForm = ({ onSave, onClose }) => {
  const now = new Date();
  // Build local datetime string for the datetime-local input
  const localDatetime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const [form, setForm] = useState({
    vehicle_id: '',
    driver_id: '',
    liters: '',
    price_per_liter: '',
    fuel_date: localDatetime,
    odometer_reading: '',
    station_name: ''
  });
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      vehicleAPI.getAll({ limit: 100 }).catch(() => ({ data: [] })),
      driverAPI.getAll({ limit: 100 }).catch(() => ({ data: [] }))
    ]).then(([vRes, dRes]) => {
      setVehicles(vRes.data || []);
      setDrivers(dRes.data || []);
    });
  }, []);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const total = (parseFloat(form.liters || 0) * parseFloat(form.price_per_liter || 0)).toFixed(2);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.liters || parseFloat(form.liters) <= 0) { toast.error('Enter a valid liter amount'); return; }
    if (!form.price_per_liter || parseFloat(form.price_per_liter) <= 0) { toast.error('Enter a valid price per liter'); return; }
    if (!form.fuel_date) { toast.error('Date is required'); return; }

    setLoading(true);
    try {
      // Build clean payload — only include optional FK fields if they have a value
      const payload = {
        liters: parseFloat(form.liters),
        price_per_liter: parseFloat(form.price_per_liter),
        fuel_date: new Date(form.fuel_date).toISOString()  // Full ISO for backend
      };
      if (form.vehicle_id) payload.vehicle_id = form.vehicle_id;
      if (form.driver_id) payload.driver_id = form.driver_id;
      if (form.odometer_reading) payload.odometer_reading = parseFloat(form.odometer_reading);
      if (form.station_name.trim()) payload.station_name = form.station_name.trim();

      console.log('[FuelLog] submitting:', payload);
      await analyticsAPI.addFuelLog(payload);
      toast.success(`Fuel log recorded — ₱${total} total`);
      onSave();
    } catch (err) {
      console.error('[FuelLog] error:', err);
      const msg = err?.message || err?.errors?.[0]?.message || 'Failed to record fuel log';
      toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Vehicle & Driver selectors — optional but allow proper record linking */}
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Vehicle (optional)"
          name="vehicle_id"
          value={form.vehicle_id}
          onChange={handleChange}
          options={vehicles.map(v => ({ value: v.id, label: `${v.name} (${v.plate_number})` }))}
        />
        <Select
          label="Driver (optional)"
          name="driver_id"
          value={form.driver_id}
          onChange={handleChange}
          options={drivers.map(d => ({ value: d.id, label: d.user?.name || d.license_number }))}
        />
      </div>

      {/* Core required fields */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Liters *"
          type="number" name="liters" value={form.liters} onChange={handleChange}
          required step="0.01" min="0.01" placeholder="e.g. 40.5"
        />
        <Input
          label="Price/Liter (₱) *"
          type="number" name="price_per_liter" value={form.price_per_liter} onChange={handleChange}
          required step="0.01" min="0.01" placeholder="e.g. 62.50"
        />
      </div>

      {/* Live total preview */}
      {parseFloat(form.liters) > 0 && parseFloat(form.price_per_liter) > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
          <span className="text-sm text-blue-600">Total Cost</span>
          <span className="text-lg font-bold text-blue-900">₱{total}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Date & Time *"
          type="datetime-local" name="fuel_date" value={form.fuel_date} onChange={handleChange}
          required
        />
        <Input
          label="Odometer (km)"
          type="number" name="odometer_reading" value={form.odometer_reading} onChange={handleChange}
          step="0.1" min="0"
        />
      </div>
      <Input label="Station Name" name="station_name" value={form.station_name} onChange={handleChange} placeholder="e.g. Shell EDSA" />

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">⛽ Record Fuel Log</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
};

// ─── Expenses Page ────────────────────────────────────────────────────────────
const Expenses = () => {
  const [modal, setModal] = useState(null);
  const close = () => setModal(null);

  return (
    <div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setModal('expense')}
        >
          <div className="text-4xl mb-3">💰</div>
          <h3 className="text-lg font-semibold text-gray-900">Record Expense</h3>
          <p className="text-sm text-gray-500 mt-1">Log maintenance, tolls, parking, insurance, or other costs</p>
        </div>
        <div
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setModal('fuel')}
        >
          <div className="text-4xl mb-3">⛽</div>
          <h3 className="text-lg font-semibold text-gray-900">Log Fuel Fillup</h3>
          <p className="text-sm text-gray-500 mt-1">Record fuel quantity, price per liter, and station details</p>
        </div>
      </div>

      <Modal isOpen={modal === 'expense'} onClose={close} title="Record Expense" size="md">
        <ExpenseForm onSave={close} onClose={close} />
      </Modal>
      <Modal isOpen={modal === 'fuel'} onClose={close} title="Log Fuel Fillup" size="md">
        <FuelLogForm onSave={close} onClose={close} />
      </Modal>
    </div>
  );
};

export default Expenses;