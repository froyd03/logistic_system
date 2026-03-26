/**
 * vehicleStatus.js  —  Single source of truth for vehicle state transitions.
 *
 * VALID STATUSES:
 *   available            → ready for assignment
 *   reserved             → approved reservation, awaiting dispatch
 *   in_transit           → actively on a trip
 *   maintenance_scheduled → maintenance record created, vehicle grounded
 *   under_maintenance    → maintenance actively in progress
 *   inactive             → decommissioned / archived
 *
 * STATE MACHINE:
 *   available            → reserved             (approve reservation)
 *   available            → maintenance_scheduled (schedule maintenance)
 *   reserved             → in_transit           (dispatch)
 *   reserved             → available            (cancel reservation)
 *   in_transit           → available            (complete trip)
 *   maintenance_scheduled → under_maintenance   (start maintenance)
 *   maintenance_scheduled → available           (cancel maintenance)
 *   under_maintenance    → available            (complete maintenance)
 */

const STATUSES = {
  AVAILABLE:             'available',
  RESERVED:              'reserved',
  IN_TRANSIT:            'in_transit',
  MAINTENANCE_SCHEDULED: 'maintenance_scheduled',
  UNDER_MAINTENANCE:     'under_maintenance',
  INACTIVE:              'inactive',
};

/**
 * Validate that a transition is legal.
 * Throws a descriptive Error if not allowed.
 */
function assertTransition(vehicle, targetStatus, context = '') {
  const from = vehicle.status;
  const name = vehicle.name || vehicle.id;

  const allowed = {
    [STATUSES.AVAILABLE]:             [STATUSES.RESERVED, STATUSES.MAINTENANCE_SCHEDULED, STATUSES.INACTIVE],
    [STATUSES.RESERVED]:              [STATUSES.IN_TRANSIT, STATUSES.AVAILABLE],
    [STATUSES.IN_TRANSIT]:            [STATUSES.AVAILABLE],
    [STATUSES.MAINTENANCE_SCHEDULED]: [STATUSES.UNDER_MAINTENANCE, STATUSES.AVAILABLE],
    [STATUSES.UNDER_MAINTENANCE]:     [STATUSES.AVAILABLE],
    [STATUSES.INACTIVE]:              [],
  };

  const validTargets = allowed[from] || [];
  if (!validTargets.includes(targetStatus)) {
    throw new Error(
      buildBlockMessage(name, from, targetStatus, context)
    );
  }
}

/**
 * Build a user-facing error message for a blocked transition.
 */
function buildBlockMessage(vehicleName, fromStatus, targetStatus, context) {
  const statusLabels = {
    available:             'Available',
    reserved:              'Reserved (awaiting dispatch)',
    in_transit:            'In Transit',
    maintenance_scheduled: 'Scheduled for Maintenance',
    under_maintenance:     'Under Maintenance',
    inactive:              'Inactive / Decommissioned',
  };
  const from = statusLabels[fromStatus] || fromStatus;

  // Friendly context-specific messages
  if (targetStatus === STATUSES.IN_TRANSIT) {
    if (fromStatus === STATUSES.IN_TRANSIT)
      return `Vehicle "${vehicleName}" is already in transit. Cannot dispatch the same vehicle twice.`;
    if (fromStatus === STATUSES.UNDER_MAINTENANCE)
      return `Vehicle "${vehicleName}" is currently under maintenance. Complete or cancel the maintenance record before dispatching.`;
    if (fromStatus === STATUSES.MAINTENANCE_SCHEDULED)
      return `Vehicle "${vehicleName}" is scheduled for maintenance and cannot be dispatched. Cancel the maintenance schedule first.`;
    if (fromStatus === STATUSES.INACTIVE)
      return `Vehicle "${vehicleName}" is decommissioned and cannot be dispatched.`;
    return `Vehicle "${vehicleName}" (status: ${from}) cannot be dispatched.`;
  }

  if (targetStatus === STATUSES.MAINTENANCE_SCHEDULED) {
    if (fromStatus === STATUSES.IN_TRANSIT)
      return `Vehicle "${vehicleName}" is currently in transit. Cannot schedule maintenance for a vehicle on an active trip.`;
    if (fromStatus === STATUSES.UNDER_MAINTENANCE)
      return `Vehicle "${vehicleName}" is already under maintenance.`;
    if (fromStatus === STATUSES.MAINTENANCE_SCHEDULED)
      return `Vehicle "${vehicleName}" already has a scheduled maintenance record.`;
    return `Vehicle "${vehicleName}" (status: ${from}) cannot be scheduled for maintenance.`;
  }

  if (targetStatus === STATUSES.UNDER_MAINTENANCE) {
    if (fromStatus !== STATUSES.MAINTENANCE_SCHEDULED)
      return `Vehicle "${vehicleName}" must be in "maintenance_scheduled" status before starting maintenance (current: ${from}).`;
  }

  return `Vehicle "${vehicleName}" cannot transition from "${from}" to "${targetStatus}"${context ? ` (${context})` : ''}.`;
}

/**
 * Check if a vehicle can be dispatched. Throws if blocked.
 */
function assertDispatchable(vehicle) {
  const { AVAILABLE, RESERVED } = STATUSES;
  if (vehicle.status !== AVAILABLE && vehicle.status !== RESERVED) {
    assertTransition(vehicle, STATUSES.IN_TRANSIT, 'dispatch');
  }
}

/**
 * Check if a vehicle can have maintenance scheduled. Throws if blocked.
 */
function assertMaintenanceSchedulable(vehicle) {
  if (vehicle.status !== STATUSES.AVAILABLE) {
    assertTransition(vehicle, STATUSES.MAINTENANCE_SCHEDULED, 'schedule maintenance');
  }
}

/**
 * Check if a vehicle can start maintenance. Throws if blocked.
 */
function assertMaintenanceStartable(vehicle) {
  if (vehicle.status !== STATUSES.MAINTENANCE_SCHEDULED) {
    assertTransition(vehicle, STATUSES.UNDER_MAINTENANCE, 'start maintenance');
  }
}

module.exports = {
  STATUSES,
  assertTransition,
  assertDispatchable,
  assertMaintenanceSchedulable,
  assertMaintenanceStartable,
};
