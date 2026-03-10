import React from 'react';

// Status Badge
export const StatusBadge = ({ status }) => {
  const config = {
    available: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500', label: 'Available' },
    reserved: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500', label: 'Reserved' },
    in_transit: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500', label: 'In Transit' },
    maintenance: { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500', label: 'Maintenance' },
    inactive: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', label: 'Inactive' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500', label: 'Pending' },
    approved: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500', label: 'Approved' },
    rejected: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500', label: 'Rejected' },
    dispatched: { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500', label: 'Dispatched' },
    in_progress: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500', label: 'In Progress' },
    completed: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500', label: 'Completed' },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', label: 'Cancelled' },
    on_trip: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500', label: 'On Trip' },
    suspended: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500', label: 'Suspended' },
    off_duty: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', label: 'Off Duty' },
    expired: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500', label: 'Expired' },
    expiring_soon: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500', label: 'Expiring Soon' },
    valid: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500', label: 'Valid' }
  };
  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};

// Loading Spinner
export const Spinner = ({ size = 'md' }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex items-center justify-center">
      <div className={`animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 ${sizes[size]}`} />
    </div>
  );
};

// Modal
export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizes[size]} mx-4 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// Card
export const Card = ({ title, value, icon, color = 'blue', subtitle }) => {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600'
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white text-xl shadow-sm`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// Empty State
export const EmptyState = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-5xl mb-4">{icon}</div>
    <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
    <p className="text-sm text-gray-500 mb-6 max-w-sm">{description}</p>
    {action}
  </div>
);

// Search & Filter Bar
export const SearchBar = ({ value, onChange, placeholder = 'Search...', children }) => (
  <div className="flex flex-wrap gap-3">
    <div className="relative flex-1 min-w-60">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="inputText pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      />
    </div>
    {children}
  </div>
);

// Form Input
export const Input = ({ label, error, ...props }) => (
  <div>
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input
      {...props}
      className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${error ? 'border-red-300' : 'border-gray-200'} ${props.className || ''}`}
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

// Select
export const Select = ({ label, error, options = [], ...props }) => (
  <div>
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <select
      {...props}
      className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white ${error ? 'border-red-300' : 'border-gray-200'}`}
    >
      <option value="">Select...</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

// Button
export const Button = ({ variant = 'primary', size = 'md', loading, children, ...props }) => {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
    outline: 'border border-gray-200 hover:bg-gray-50 text-gray-700'
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' };
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center gap-2 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${props.className || ''}`}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
};

// Pagination
export const Pagination = ({ page, totalPages, onPageChange }) => (
  <div className="flex items-center justify-center gap-2 mt-6">
    <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>← Prev</Button>
    <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
    <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>Next →</Button>
  </div>
);
