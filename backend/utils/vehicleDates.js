/**
 * vehicleDates.js
 * Auto-compute registration and insurance expiry dates
 * following Philippines LTO + CTPL rules.
 *
 * Rules:
 *  1. New vehicle registration is valid for 3 years from registration_start_date.
 *  2. CTPL (Compulsory Third-Party Liability) insurance must be renewed yearly
 *     and must be coterminous with the registration month.
 *     i.e. insurance_expiry month === registration_expiry month
 *  3. On renewal, registration is extended by 1 year from the current expiry.
 */

/**
 * Given a registration start date (new vehicle), compute:
 *  - registration_expiry: start + 3 years
 *  - insurance_expiry   : 1 year from start, same day/month as registration_expiry
 *
 * @param {string|Date} registrationStartDate
 * @returns {{ registration_expiry: string, insurance_expiry: string }}
 */
function computeExpiryDates(registrationStartDate) {
  if (!registrationStartDate) return {};

  const start = new Date(registrationStartDate);
  if (isNaN(start.getTime())) return {};

  // Registration: valid 3 years from start (Philippines LTO initial plate)
  const regExpiry = new Date(start);
  regExpiry.setFullYear(regExpiry.getFullYear() + 3);

  // Insurance (CTPL): renewed yearly, expiry must align to registration month
  // First insurance period: start → same month/day next year
  const insExpiry = new Date(start);
  insExpiry.setFullYear(insExpiry.getFullYear() + 1);

  return {
    registration_expiry: regExpiry.toISOString().split('T')[0],
    insurance_expiry:    insExpiry.toISOString().split('T')[0]
  };
}

/**
 * Align insurance expiry to registration expiry month.
 * Used when registration_expiry is provided manually.
 *
 * The insurance must expire in the SAME month as registration,
 * but insurance is renewed yearly so it expires 1 year from now
 * in the registration month.
 *
 * @param {string|Date} registrationExpiry
 * @returns {string} insurance_expiry as YYYY-MM-DD
 */
function alignInsuranceToRegistration(registrationExpiry) {
  if (!registrationExpiry) return null;
  const reg = new Date(registrationExpiry);
  if (isNaN(reg.getTime())) return null;

  const today = new Date();

  // Target month = registration expiry month
  const targetMonth = reg.getMonth(); // 0-indexed
  const targetDay   = reg.getDate();

  // Insurance expires in that target month, but next year from today
  const insYear = today.getFullYear() + (today.getMonth() >= targetMonth ? 1 : 0);
  const ins = new Date(insYear, targetMonth, targetDay);

  return ins.toISOString().split('T')[0];
}

/**
 * Get registration status for UI color coding.
 * @param {string|null} registrationExpiry
 * @returns {'valid'|'expiring_soon'|'expired'|'unknown'}
 */
function getRegistrationStatus(registrationExpiry) {
  if (!registrationExpiry) return 'unknown';
  const expiry = new Date(registrationExpiry);
  const today  = new Date();
  const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0)  return 'expired';
  if (daysLeft <= 30) return 'expiring_soon';
  return 'valid';
}

module.exports = { computeExpiryDates, alignInsuranceToRegistration, getRegistrationStatus };
