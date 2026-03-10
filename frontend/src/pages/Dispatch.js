import React, { useEffect, useState, useCallback } from 'react';
import { reservationAPI } from '../services/api';
import { StatusBadge, Spinner, Modal, Button, Input, EmptyState } from '../components/common/UI';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import EngineeringOutlinedIcon from '@mui/icons-material/EngineeringOutlined';
import OutlinedFlagIcon from '@mui/icons-material/OutlinedFlag';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';

const CompleteTripModal = ({ tripLog, onSave, onClose }) => {
  const [form, setForm] = useState({
    trip_log_id: tripLog?.id || '',
    odometer_end: '',
    fuel_end: '',
    fuel_consumed: '',
    distance_km: '',
    driver_rating: '5',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await reservationAPI.completeTrip({
        ...form,
        trip_log_id: tripLog.id,
        odometer_end: form.odometer_end ? parseFloat(form.odometer_end) : undefined,
        distance_km: form.distance_km ? parseFloat(form.distance_km) : undefined,
        fuel_consumed: form.fuel_consumed ? parseFloat(form.fuel_consumed) : undefined,
        driver_rating: form.driver_rating ? parseFloat(form.driver_rating) : undefined
      });
      toast.success('Trip completed successfully!');
      onSave();
    } catch (err) {
      toast.error(err.message || 'Failed to complete trip');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm space-y-1">
        <p className="font-semibold text-green-900">Complete Trip</p>
        <p className="text-green-700">Vehicle: {tripLog?.vehicle?.name} ({tripLog?.vehicle?.plate_number})</p>
        <p className="text-green-700">Driver: {tripLog?.driver?.user?.name}</p>
        <p className="text-green-600 text-xs">Started: {tripLog?.actual_start ? format(new Date(tripLog.actual_start), 'MMM dd, HH:mm') : 'Pending'}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="End Odometer (km)" type="number" name="odometer_end" value={form.odometer_end} onChange={handleChange} min={0} />
        <Input label="Distance Traveled (km)" type="number" name="distance_km" value={form.distance_km} onChange={handleChange} min={0} step="0.1" />
        <Input label="Fuel End (%)" type="number" name="fuel_end" value={form.fuel_end} onChange={handleChange} min={0} max={100} />
        <Input label="Fuel Consumed (L)" type="number" name="fuel_consumed" value={form.fuel_consumed} onChange={handleChange} min={0} step="0.01" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Driver Rating (1–5)</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setForm(f => ({ ...f, driver_rating: String(n) }))}
              className={`w-10 h-10 rounded-xl text-sm font-bold transition-colors ${
                parseInt(form.driver_rating) >= n ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-400'
              }`}
            >★</button>
          ))}
          <span className="self-center text-sm text-gray-500">{form.driver_rating}/5</span>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Any remarks about the trip..." />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} variant="success" className="flex-1">✅ Mark as Completed</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
};

const Dispatch = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ type: null, data: null });

  const fetchActive = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch dispatched and in_progress reservations
      const [dispatchedRes, inProgressRes] = await Promise.all([
        reservationAPI.getAll({ status: 'dispatched', limit: 50 }),
        reservationAPI.getAll({ status: 'in_progress', limit: 50 })
      ]);
      const combined = [
        ...(dispatchedRes.data || []),
        ...(inProgressRes.data || [])
      ];
      // Deduplicate
      const unique = combined.filter((v, i, a) => a.findIndex(x => x.id === v.id) === i);
      setReservations(unique);
    } catch (err) {
      console.error('[Dispatch] fetch error:', err);
      toast.error('Failed to load active dispatches');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchActive(); }, [fetchActive]);

  // Build a synthetic tripLog-like object from reservation for the complete modal
  const buildTripContext = (r) => ({
    id: r.dispatch?.id || null, // TripLog id — may be null, handle gracefully
    reservationId: r.id,
    vehicle: r.vehicle,
    driver: r.driver,
    actual_start: r.dispatch?.actual_start || r.dispatch?.dispatched_at
  });

  const close = () => setModal({ type: null, data: null });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        
        <Button variant="outline" onClick={fetchActive}>Refresh</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
      ) : reservations.length === 0 ? (
        <EmptyState
          icon="🗺️"
          title="No active dispatches"
          description="All vehicles are idle. Approve a reservation and dispatch to see it here."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {reservations.map(r => {
            const dispatchedAt = r.dispatch?.dispatched_at;
            const elapsed = dispatchedAt ? formatDistanceToNow(new Date(dispatchedAt), { addSuffix: false }) : null;

            return (
              <div key={r.id} className="dispatch-card">
                {/* Status bar */}

                <div className="flex items-start justify-between gap-3 mt-1">
                  <div className="flex-1 gap-4 dispatch-card-content">
                    <div className="dispatch-header">
                      <span className="font-mono text-sm font-bold text-blue-600">{r.reservation_code}</span>
                      <StatusBadge status={r.status} />
                    </div>

                    {/* Vehicle & Driver */}
                    <div className="flex items-center ">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-lg"><EngineeringOutlinedIcon sx={{fontSize: 34, color:'#0000008e'}}/></span>
                        <div>
                          <p className="font-medium text-gray-900">{r.driver?.user?.name || 'N/A'}</p>
                          <p className="text-xs text-gray-400">{r.vehicle?.name || 'N/A'} • {r.vehicle?.plate_number}</p>
                        </div>
                      </div>
                    </div>

                    {/* Route */}
                    <div className="route-container">
                      <p><LocationOnOutlinedIcon sx={{color:'#ff0000a3'}}/>{r.pickup_location}</p>
                      <ArrowRightAltIcon sx={{fontSize: 44, color:'#000000a9'}}/>
                      <p><OutlinedFlagIcon sx={{color:'#0000008e'}}/> {r.dropoff_location}</p>
                    </div>

                    {/* Timing */}
                    <div className="flex items-center gap-8 justify-center text-xs text-gray-400">
                      {dispatchedAt && <span>Dispatched {elapsed} ago</span>}
                      <span>•</span>
                      {r.scheduled_end && <span>ETA {format(new Date(r.scheduled_end), 'HH:mm')}</span>}
                      <span>•</span>
                      <span>{r.passenger_count} pax</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    className="flex justify-center"
                    onClick={() => setModal({ type: 'complete', data: buildTripContext(r) })}
                  >
                    Complete Trip
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = `/reservations`}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={modal.type === 'complete'}
        onClose={close}
        title="Complete Trip"
        size="md"
      >
        {modal.data && (
          <CompleteTripModal
            tripLog={modal.data}
            onSave={() => { fetchActive(); close(); }}
            onClose={close}
          />
        )}
      </Modal>
    </div>
  );
};

export default Dispatch;