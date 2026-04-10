/**
 * Returns the local date string in YYYY-MM-DD format.
 * Uses local timezone instead of UTC to avoid date shifting
 * for users in UTC-offset timezones (e.g. Brazil UTC-3).
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns a human-readable relative time string in Portuguese.
 * e.g. "agora", "há 3 min", "há 2 horas", "há 5 dias"
 */
export function formatDistanceToNow(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'agora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} dia${days !== 1 ? 's' : ''}`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `há ${weeks} semana${weeks !== 1 ? 's' : ''}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} mês${months !== 1 ? 'es' : ''}`;
  const years = Math.floor(days / 365);
  return `há ${years} ano${years !== 1 ? 's' : ''}`;
}
