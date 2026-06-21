'use client'

import * as React from 'react'
import { useActionState, useState } from 'react'
import { ActivityType, MatchFormat, MatchSurface } from '@/generated/prisma'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { createMatchAction, type CreateMatchFormState } from './actions'

const RACKET_SPORTS = [
  { value: ActivityType.PADEL,       label: 'Padel',       icon: 'sports_tennis' },
  { value: ActivityType.TENNIS,      label: 'Tennis',      icon: 'sports_tennis' },
  { value: ActivityType.SQUASH,      label: 'Squash',      icon: 'sports_handball' },
  { value: ActivityType.PICKLEBALL,  label: 'Pickleball',  icon: 'sports_tennis' },
  { value: ActivityType.BADMINTON,   label: 'Badminton',   icon: 'sports_badminton' },
  { value: ActivityType.RACQUETBALL, label: 'Racquetball', icon: 'sports_handball' },
]

const SURFACES = [
  { value: MatchSurface.INDOOR, label: 'Indoor' },
  { value: MatchSurface.HARD,   label: 'Hard' },
  { value: MatchSurface.CLAY,   label: 'Clay' },
  { value: MatchSurface.GRASS,  label: 'Grass' },
  { value: MatchSurface.CARPET, label: 'Carpet' },
]

interface SetInput {
  homeGames: string
  awayGames: string
  homeTiebreak: string
  awayTiebreak: string
}

const emptySet = (): SetInput => ({ homeGames: '', awayGames: '', homeTiebreak: '', awayTiebreak: '' })

const initialState: CreateMatchFormState = {}

export default function NewMatchPage() {
  const [state, formAction, isPending] = useActionState(createMatchAction, initialState)

  const [sport, setSport] = useState<ActivityType>(ActivityType.PADEL)
  const [format, setFormat] = useState<MatchFormat>(MatchFormat.SINGLES)
  const [bestOf, setBestOf] = useState<3 | 5>(3)
  const [sets, setSets] = useState<SetInput[]>([emptySet()])

  const maxSets = bestOf
  const isDoubles = format === MatchFormat.DOUBLES

  function addSet() {
    if (sets.length < maxSets) setSets((s) => [...s, emptySet()])
  }

  function removeSet(idx: number) {
    setSets((s) => s.filter((_, i) => i !== idx))
  }

  function updateSet(idx: number, field: keyof SetInput, val: string) {
    setSets((s) => s.map((set, i) => i === idx ? { ...set, [field]: val } : set))
  }

  return (
    <div className="max-w-xl mx-auto space-y-lg">
      <div>
        <h1 className="text-headline-lg font-black italic tracking-tight text-primary-fixed uppercase">
          Record a Match
        </h1>
        <p className="text-label-caps text-on-surface-variant mt-xs">
          Submit the result — your opponent will confirm
        </p>
      </div>

      <form action={formAction} className="space-y-lg">
        {/* Hidden: setsCount */}
        <input type="hidden" name="setsCount" value={sets.length} />

        {/* Sport */}
        <fieldset className="space-y-sm">
          <legend className="text-label-caps text-on-surface-variant">Sport</legend>
          <div className="grid grid-cols-3 gap-sm">
            {RACKET_SPORTS.map((s) => (
              <label
                key={s.value}
                className={cn(
                  'cursor-pointer rounded-xl p-sm text-center transition-colors flex flex-col items-center gap-xs',
                  sport === s.value
                    ? 'bg-primary-fixed text-on-primary-fixed'
                    : 'glass-card text-on-surface-variant hover:text-on-surface',
                )}
              >
                <input
                  type="radio"
                  name="sport"
                  value={s.value}
                  checked={sport === s.value}
                  onChange={() => setSport(s.value)}
                  className="sr-only"
                />
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}
                >
                  {s.icon}
                </span>
                <span className="text-label-caps">{s.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Format */}
        <fieldset className="space-y-sm">
          <legend className="text-label-caps text-on-surface-variant">Format</legend>
          <div className="grid grid-cols-2 gap-sm">
            {([MatchFormat.SINGLES, MatchFormat.DOUBLES] as const).map((f) => (
              <label
                key={f}
                className={cn(
                  'cursor-pointer rounded-xl p-sm text-center transition-colors',
                  format === f
                    ? 'bg-primary-fixed text-on-primary-fixed'
                    : 'glass-card text-on-surface-variant hover:text-on-surface',
                )}
              >
                <input
                  type="radio"
                  name="format"
                  value={f}
                  checked={format === f}
                  onChange={() => setFormat(f)}
                  className="sr-only"
                />
                <span className="text-label-caps">
                  {f === MatchFormat.SINGLES ? 'Singles' : 'Doubles'}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Best Of */}
        <fieldset className="space-y-sm">
          <legend className="text-label-caps text-on-surface-variant">Best of</legend>
          <div className="grid grid-cols-2 gap-sm">
            {([3, 5] as const).map((n) => (
              <label
                key={n}
                className={cn(
                  'cursor-pointer rounded-xl p-sm text-center transition-colors',
                  bestOf === n
                    ? 'bg-primary-fixed text-on-primary-fixed'
                    : 'glass-card text-on-surface-variant hover:text-on-surface',
                )}
              >
                <input
                  type="radio"
                  name="bestOf"
                  value={n}
                  checked={bestOf === n}
                  onChange={() => {
                    setBestOf(n)
                    setSets(sets.slice(0, n))
                  }}
                  className="sr-only"
                />
                <span className="text-label-caps">Best of {n}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Opponent */}
        <div className="space-y-xs">
          <label className="text-label-caps text-on-surface-variant" htmlFor="awayUserId">
            Opponent player ID
          </label>
          <div className="glass-card rounded-xl px-md py-sm">
            <Input
              id="awayUserId"
              name="awayUserId"
              placeholder="Player ID"
              className="bg-transparent border-none outline-none text-on-surface w-full placeholder:text-on-surface-variant shadow-none focus-visible:ring-0 p-0"
            />
          </div>
          {state.errors?.awayUserId && (
            <p className="text-error text-label-caps">{state.errors.awayUserId[0]}</p>
          )}
        </div>

        {/* Doubles partners */}
        {isDoubles && (
          <div className="space-y-sm glass-card rounded-xl p-md">
            <p className="text-label-caps text-on-surface-variant">Doubles partners</p>
            <div className="space-y-xs">
              <label className="text-label-caps text-on-surface-variant" htmlFor="homePartnerUserId">
                Your partner
              </label>
              <div className="glass-card rounded-xl px-md py-sm">
                <Input
                  id="homePartnerUserId"
                  name="homePartnerUserId"
                  placeholder="Partner player ID"
                  className="bg-transparent border-none outline-none text-on-surface w-full placeholder:text-on-surface-variant shadow-none focus-visible:ring-0 p-0"
                />
              </div>
              {state.errors?.homePartnerUserId && (
                <p className="text-error text-label-caps">{state.errors.homePartnerUserId[0]}</p>
              )}
            </div>
            <div className="space-y-xs">
              <label className="text-label-caps text-on-surface-variant" htmlFor="awayPartnerUserId">
                Opponent&apos;s partner
              </label>
              <div className="glass-card rounded-xl px-md py-sm">
                <Input
                  id="awayPartnerUserId"
                  name="awayPartnerUserId"
                  placeholder="Partner player ID"
                  className="bg-transparent border-none outline-none text-on-surface w-full placeholder:text-on-surface-variant shadow-none focus-visible:ring-0 p-0"
                />
              </div>
              {state.errors?.awayPartnerUserId && (
                <p className="text-error text-label-caps">{state.errors.awayPartnerUserId[0]}</p>
              )}
            </div>
          </div>
        )}

        {/* Sets */}
        <div className="space-y-sm">
          <div className="flex items-center justify-between">
            <span className="text-label-caps text-on-surface-variant">Sets</span>
            {sets.length < maxSets && (
              <button
                type="button"
                onClick={addSet}
                className="text-label-caps text-primary-fixed hover:text-primary-fixed-dim flex items-center gap-1"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                Add set
              </button>
            )}
          </div>

          {sets.map((set, i) => (
            <div key={i} className="glass-card rounded-xl p-md space-y-sm">
              <div className="flex items-center justify-between">
                <span className="text-label-caps text-on-surface-variant">Set {i + 1}</span>
                {sets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSet(i)}
                    className="text-label-caps text-error hover:opacity-80 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>remove</span>
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-sm">
                <div className="space-y-xs">
                  <label className="text-label-caps text-on-surface-variant">You</label>
                  <div className="glass-card rounded-xl px-md py-sm">
                    <Input
                      name={`sets[${i}][homeGames]`}
                      type="number"
                      min="0"
                      placeholder="0"
                      value={set.homeGames}
                      onChange={(e) => updateSet(i, 'homeGames', e.target.value)}
                      className="bg-transparent border-none outline-none text-on-surface w-full placeholder:text-on-surface-variant shadow-none focus-visible:ring-0 p-0"
                    />
                  </div>
                </div>
                <div className="space-y-xs">
                  <label className="text-label-caps text-on-surface-variant">Opponent</label>
                  <div className="glass-card rounded-xl px-md py-sm">
                    <Input
                      name={`sets[${i}][awayGames]`}
                      type="number"
                      min="0"
                      placeholder="0"
                      value={set.awayGames}
                      onChange={(e) => updateSet(i, 'awayGames', e.target.value)}
                      className="bg-transparent border-none outline-none text-on-surface w-full placeholder:text-on-surface-variant shadow-none focus-visible:ring-0 p-0"
                    />
                  </div>
                </div>
              </div>
              {/* Tiebreak (tennis/padel 7-6 sets) */}
              {((set.homeGames === '7' && set.awayGames === '6') ||
                (set.homeGames === '6' && set.awayGames === '7')) && (
                <div className="grid grid-cols-2 gap-sm">
                  <div className="space-y-xs">
                    <label className="text-label-caps text-on-surface-variant">Tiebreak (you)</label>
                    <div className="glass-card rounded-xl px-md py-sm">
                      <Input
                        name={`sets[${i}][homeTiebreak]`}
                        type="number"
                        min="0"
                        placeholder="0"
                        value={set.homeTiebreak}
                        onChange={(e) => updateSet(i, 'homeTiebreak', e.target.value)}
                        className="bg-transparent border-none outline-none text-on-surface w-full placeholder:text-on-surface-variant shadow-none focus-visible:ring-0 p-0"
                      />
                    </div>
                  </div>
                  <div className="space-y-xs">
                    <label className="text-label-caps text-on-surface-variant">Tiebreak (opp)</label>
                    <div className="glass-card rounded-xl px-md py-sm">
                      <Input
                        name={`sets[${i}][awayTiebreak]`}
                        type="number"
                        min="0"
                        placeholder="0"
                        value={set.awayTiebreak}
                        onChange={(e) => updateSet(i, 'awayTiebreak', e.target.value)}
                        className="bg-transparent border-none outline-none text-on-surface w-full placeholder:text-on-surface-variant shadow-none focus-visible:ring-0 p-0"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Surface */}
        <div className="space-y-xs">
          <label className="text-label-caps text-on-surface-variant" htmlFor="surface">
            Surface (optional)
          </label>
          <div className="glass-card rounded-xl px-md py-sm">
            <select
              id="surface"
              name="surface"
              className="w-full bg-transparent text-on-surface text-body-md outline-none border-none focus:ring-0"
            >
              <option value="" className="bg-surface-container-highest">Not specified</option>
              {SURFACES.map((s) => (
                <option key={s.value} value={s.value} className="bg-surface-container-highest">
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date */}
        <div className="space-y-xs">
          <label className="text-label-caps text-on-surface-variant" htmlFor="playedAt">
            Match date (optional)
          </label>
          <div className="glass-card rounded-xl px-md py-sm">
            <Input
              id="playedAt"
              name="playedAt"
              type="datetime-local"
              className="bg-transparent border-none outline-none text-on-surface w-full shadow-none focus-visible:ring-0 p-0"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-xs">
          <label className="text-label-caps text-on-surface-variant" htmlFor="notes">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            maxLength={500}
            placeholder="How did it go?"
            className="glass-card rounded-xl p-md w-full text-on-surface text-body-md bg-transparent border-none outline-none focus:ring-1 focus:ring-primary-fixed resize-none placeholder:text-on-surface-variant"
          />
        </div>

        {state.errors?._form && (
          <div className="glass-card rounded-xl p-sm border-l-4 border-l-error space-y-xs">
            {state.errors._form.map((e) => (
              <p key={e} className="text-error text-label-caps">{e}</p>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-primary-fixed text-on-primary-fixed py-4 rounded-xl font-bold text-label-caps action-glow hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:pointer-events-none"
        >
          {isPending ? 'Submitting…' : 'Submit Match Result'}
        </button>
      </form>
    </div>
  )
}
