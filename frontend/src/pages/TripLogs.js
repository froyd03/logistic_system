import React, { useEffect, useState, useCallback } from 'react';
import { reservationAPI } from '../services/api';
import { StatusBadge, Spinner, SearchBar, Pagination, EmptyState } from '../components/common/UI';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const StarDisplay = ({ rating }) => {
  if (!rating) return <span className="text-gray-400 text-xs">Not rated</span>;
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`text-sm ${i <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
      ))}
      <span className="text-xs text-gray-500 ml-1">{parseFloat(rating).toFixed(1)}</span>
    </div>
  );
};

const TripLogs = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('completed');

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reservationAPI.getAll({
        page,
        limit: 20,
        status: statusFilter || 'completed'
      });
      setReservations(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      console.error('[TripLogs] fetch error:', err);
      toast.error('Failed to load trip logs');
    } finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  const filtered = search
    ? reservations.filter(r =>
        r.reservation_code?.toLowerCase().includes(search.toLowerCase()) ||
        r.pickup_location?.toLowerCase().includes(search.toLowerCase()) ||
        r.dropoff_location?.toLowerCase().includes(search.toLowerCase()) ||
        r.vehicle?.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.driver?.user?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : reservations;

  const calcDuration = (start, end) => {
    if (!start || !end) return '—';
    const mins = Math.round((new Date(end) - new Date(start)) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const purposeLabel = (p) => p?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—';

  return (
    <div>
      <div className="tblMainContainer">
        <div className="tblContainer">
        <SearchBar
          value={search}
          onChange={v => setSearch(v)}
          placeholder="Search by code, location, vehicle or driver..."
        >
          <div className="flex gap-2 text-xs">
            {['completed', 'cancelled', 'dispatched', ''].map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </SearchBar>

        {loading ? (
          <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🛣️"
            title="No trip logs found"
            description="Completed trips will appear here once vehicles return from dispatch"
          />
        ) : (
       
          <table>
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Code', 'Purpose', 'Route', 'Vehicle / Driver', 'Scheduled', 'Duration', 'Rating', 'Status'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody >
              {filtered.map(r => (
                <tr key={r.id}>
                  <td>
                    <span className="font-mono font-medium text-blue-600 text-xs">{r.reservation_code}</span>
                  </td>
                  <td>{purposeLabel(r.purpose)}</td>
                  <td>
                    <p className="truncate text-xs"><span className="font-medium">From:</span> {r.pickup_location}</p>
                    <p className="truncate text-xs"><span className="font-medium">To:</span> {r.dropoff_location}</p>
                  </td>
                  <td>
                    <p className="font-medium text-gray-900">{r.vehicle?.name || '—'}</p>
                    <p className="text-xs text-gray-400">{r.driver?.user?.name || '—'}</p>
                  </td>
                  <td>
                    <p>{r.scheduled_start ? format(new Date(r.scheduled_start), 'MMM dd, HH:mm') : '—'}</p>
                    <p className="text-gray-400">→ {r.scheduled_end ? format(new Date(r.scheduled_end), 'HH:mm') : '—'}</p>
                  </td>
                  <td>
                    {calcDuration(r.scheduled_start, r.scheduled_end)}
                  </td>
                  <td>
                    <StarDisplay rating={r.dispatch?.driver_rating} />
                  </td>
                  <td >
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>)}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
};

export default TripLogs;