type CustomerListFiltersProps = {
  dateFrom: string
  dateTo: string
  search: string
  agencyFilter: string
  onDateFromChange: (v: string) => void
  onDateToChange: (v: string) => void
  onSearchChange: (v: string) => void
  onAgencyChange: (v: string) => void
  onFilter: () => void
  loading: boolean
}

export function CustomerListFilters({
  dateFrom,
  dateTo,
  search,
  agencyFilter,
  onDateFromChange,
  onDateToChange,
  onSearchChange,
  onAgencyChange,
  onFilter,
  loading,
}: CustomerListFiltersProps) {
  return (
    <div className="toolbar">
      <input
        type="date"
        value={dateFrom}
        onChange={(e) => onDateFromChange(e.target.value)}
        placeholder="Başlangıç"
        aria-label="Başlangıç tarihi"
      />
      <input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} aria-label="Bitiş tarihi" />
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Ad, TC, telefon, e-posta ara..."
        aria-label="Ara"
      />
      <input
        type="text"
        value={agencyFilter}
        onChange={(e) => onAgencyChange(e.target.value)}
        placeholder="Acenta adı filtrele"
        aria-label="Acenta"
      />
      <button type="button" onClick={onFilter} disabled={loading} className="btn btn-primary">
        Filtrele
      </button>
    </div>
  )
}
