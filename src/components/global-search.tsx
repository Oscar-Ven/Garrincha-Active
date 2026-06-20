'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Search, X, User, Calendar, MapPin, Trophy } from 'lucide-react'

interface SearchResults {
  users: { id: string; name: string; nickname: string; avatarUrl: string | null }[]
  events: { id: string; title: string; startDate: string }[]
  routes: { id: string; title: string; distanceKm: number | null }[]
  challenges: { id: string; title: string }[]
  query: string
}

export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounced fetch
  useEffect(() => {
    if (query.length < 2) {
      setResults(null)
      setOpen(false)
      return
    }
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data: SearchResults = await res.json()
        setResults(data)
        setOpen(true)
      } catch {
        // silent — network errors should not surface to the user
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const hasAnyResults =
    results &&
    (results.users.length > 0 ||
      results.events.length > 0 ||
      results.routes.length > 0 ||
      results.challenges.length > 0)

  function close() {
    setOpen(false)
    setQuery('')
    setResults(null)
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      {/* Input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search players, events, routes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results && setOpen(true)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          aria-label="Global search"
          aria-expanded={open}
          aria-autocomplete="list"
          className="h-9 w-full rounded-lg border border-slate-700 bg-slate-800 pl-9 pr-8 text-sm text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
        {query && (
          <button
            type="button"
            onClick={close}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[280px] overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-xl"
        >
          {loading && <p className="px-4 py-3 text-sm text-slate-400">Searching…</p>}

          {!loading && !hasAnyResults && results && (
            <p className="px-4 py-3 text-sm text-slate-400">
              No results for &ldquo;{results.query}&rdquo;
            </p>
          )}

          {!loading && results && results.users.length > 0 && (
            <ResultSection icon={<User className="h-3 w-3" />} title="Players">
              {results.users.map((u) => (
                <ResultLink key={u.id} href={`/app/players/${u.id}`} onSelect={close}>
                  <span className="font-medium text-white">{u.name}</span>
                  <span className="text-xs text-slate-400">@{u.nickname}</span>
                </ResultLink>
              ))}
            </ResultSection>
          )}

          {!loading && results && results.events.length > 0 && (
            <ResultSection icon={<Calendar className="h-3 w-3" />} title="Events">
              {results.events.map((e) => (
                <ResultLink key={e.id} href={`/app/events/${e.id}`} onSelect={close}>
                  <span className="font-medium text-white">{e.title}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(e.startDate).toLocaleDateString()}
                  </span>
                </ResultLink>
              ))}
            </ResultSection>
          )}

          {!loading && results && results.routes.length > 0 && (
            <ResultSection icon={<MapPin className="h-3 w-3" />} title="Routes">
              {results.routes.map((r) => (
                <ResultLink key={r.id} href={`/app/routes/${r.id}`} onSelect={close}>
                  <span className="font-medium text-white">{r.title}</span>
                  {r.distanceKm != null && (
                    <span className="text-xs text-slate-400">{r.distanceKm} km</span>
                  )}
                </ResultLink>
              ))}
            </ResultSection>
          )}

          {!loading && results && results.challenges.length > 0 && (
            <ResultSection icon={<Trophy className="h-3 w-3" />} title="Challenges">
              {results.challenges.map((c) => (
                <ResultLink key={c.id} href={`/app/challenges/${c.id}`} onSelect={close}>
                  <span className="font-medium text-white">{c.title}</span>
                </ResultLink>
              ))}
            </ResultSection>
          )}
        </div>
      )}
    </div>
  )
}

function ResultSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-white/5 first:border-t-0">
      <div className="flex items-center gap-1.5 px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {icon}
        {title}
      </div>
      {children}
    </div>
  )
}

function ResultLink({
  href,
  onSelect,
  children,
}: {
  href: string
  onSelect: () => void
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      role="option"
      onClick={onSelect}
      className="flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-white/5"
    >
      {children}
    </Link>
  )
}
