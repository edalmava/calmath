const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, char => ESCAPE_MAP[char]);
}
