/**
 * Consider "recent" if the date is within the last 24 hours (for admin to spot newly generated items).
 * @param {string|Date} date - createdAt or similar
 * @returns {boolean}
 */
export const isRecentDate = (date) => {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const hoursDiff = (now - d) / (1000 * 60 * 60);
  return hoursDiff >= 0 && hoursDiff < 24;
};

/**
 * Consider "recent" if the date is within the last N minutes (e.g. for payment list "Recent" badge).
 * @param {string|Date} date - createdAt or similar
 * @param {number} minutes - window in minutes (e.g. 10)
 * @returns {boolean}
 */
export const isRecentWithinMinutes = (date, minutes = 10) => {
  if (!date || minutes <= 0) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const diffMs = now - d;
  return diffMs >= 0 && diffMs < minutes * 60 * 1000;
};

/**
 * Sort items newest first by createdAt, generatedDate, or paymentDate.
 */
export const sortByCreatedDesc = (a, b) => {
  const getTime = (x) => {
    const d = x?.createdAt || x?.generatedDate || x?.paymentDate;
    return d ? new Date(d).getTime() : 0;
  };
  return getTime(b) - getTime(a);
};

/** Indian Standard Time zone (IST, UTC+5:30) */
const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Format date only in Indian timezone (IST).
 * @param {string|Date|null|undefined} date
 * @returns {string} e.g. "13/3/2026" or "—" if invalid/missing
 */
export const formatDateIST = (date) => {
  if (date == null || date === '') return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { timeZone: IST_TIMEZONE, day: '2-digit', month: '2-digit', year: 'numeric' });
};

/**
 * Format date and time in Indian timezone (IST).
 * @param {string|Date|null|undefined} date
 * @returns {string} e.g. "13/3/2026, 12:26:55 pm" or "—" if invalid/missing
 */
export const formatDateTimeIST = (date) => {
  if (date == null || date === '') return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

/**
 * Format time only in Indian timezone (IST).
 * @param {string|Date|null|undefined} date
 * @returns {string} e.g. "12:26:55 pm" or "—" if invalid/missing
 */
export const formatTimeIST = (date) => {
  if (date == null || date === '') return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};
