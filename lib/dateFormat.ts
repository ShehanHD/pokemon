const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function formatTcgcReleaseDate(yyyySlashMmSlashDd: string): string {
  const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(yyyySlashMmSlashDd)
  if (!m) return yyyySlashMmSlashDd
  const [, y, mm, dd] = m
  const monthIdx = parseInt(mm, 10) - 1
  if (monthIdx < 0 || monthIdx > 11) return yyyySlashMmSlashDd
  return `${MONTHS[monthIdx]} ${parseInt(dd, 10)}, ${y}`
}
