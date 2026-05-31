/** Pasek statusu iOS — czas + ikony sieci/wifi/baterii. */
export function StatusBar() {
  return (
    <div className="flex h-[50px] flex-shrink-0 items-center justify-between px-8 pt-[18px] text-[15px] font-semibold text-ink-primary">
      <span>9:41</span>
      <div className="flex items-center gap-[5px]">
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none">
          <path d="M1 8h2v2H1zM5 6h2v4H5zM9 3h2v7H9zM13 0h2v10h-2z" fill="currentColor" />
        </svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
          <path
            d="M8 2.5c2 0 3.8.8 5.2 2L14.5 3a9 9 0 0 0-13 0L2.8 4.5A7.2 7.2 0 0 1 8 2.5zM8 6c1 0 2 .4 2.7 1L12 5.7a6 6 0 0 0-8 0L5.3 7C6 6.4 7 6 8 6zm0 3.5L10 7.5a3 3 0 0 0-4 0L8 9.5z"
            fill="currentColor"
          />
        </svg>
        <svg width="25" height="11" viewBox="0 0 25 11" fill="none">
          <rect x="1" y="1" width="20" height="9" rx="2" stroke="currentColor" fill="none" />
          <rect x="3" y="3" width="16" height="5" rx="1" fill="currentColor" />
          <rect x="22" y="4" width="2" height="3" fill="currentColor" />
        </svg>
      </div>
    </div>
  )
}
