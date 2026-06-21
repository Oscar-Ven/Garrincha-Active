'use client'

import * as React from 'react'
import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ActivityType, MatchFormat, MatchSurface } from '@/generated/prisma'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createMatchAction, type CreateMatchFormState } from './actions'

const RACKET_SPORTS = [
  { value: ActivityType.PADEL,       label: 'Padel',       icon: '🎾' },
  { value: ActivityType.TENNIS,      label: 'Tennis',      icon: '🎾' },
  { value: ActivityType.SQUASH,      label: 'Squash',      icon: '🏸' },
  { value: ActivityType.PICKLEBALL,  label: 'Pickleball',  icon: '🏓' },
  { value: ActivityType.BADMINTON,   label: 'Badminton',   icon: '🏸' },
  { value: ActivityType.RACQUETBALL, label: 'Racquetball', icon: '🎾' },
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
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Record a Match</h1>
        <p className="text-white/50 text-sm mt-1">Submit the result — your opponent will confirm</p>
      </div>

      <form action={formAction} className="space-y-6">
        {/* Hidden: setsCount */}
        <input type="hidden" name="setsCount" value={sets.length} />

        {/* Sport */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-white/70">Sport</legend>
          <div className="grid grid-cols-3 gap-2">
            {RACKET_SPORTS.map((s) => (
              <label key={s.value} className={`cursor-pointer rounded-lg border p-3 text-center transition-colors ${
                sport === s.value
                  ? 'border-green-500 bg-green-900/30 text-green-300'
                  : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
              }`}>
                <input
                  type="radio"
                  name="sport"
                  value={s.value}
                  checked={sport === s.value}
                  onChange={() => setSport(s.value)}
                  className="sr-only"
                />
                <div className="text-xl">{s.icon}</div>
                <div className="text-xs mt-1 font-medium">{s.label}</div>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Format */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-white/70">Format</legend>
          <div className="grid grid-cols-2 gap-2">
            {([MatchFormat.SINGLES, MatchFormat.DOUBLES] as const).map((f) => (
              <label key={f} className={`cursor-pointer rounded-lg border p-3 text-center transition-colors ${
                format === f
                  ? 'border-green-500 bg-green-900/30 text-green-300'
                  : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
              }`}>
                <input
                  type="radio"
                  name="format"
                  value={f}
                  checked={format === f}
                  onChange={() => setFormat(f)}
                  className="sr-only"
                />
                <span className="text-sm font-medium">{f === MatchFormat.SINGLES ? 'Singles' : 'Doubles'}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Best Of */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-white/70">Best of</legend>
          <div className="grid grid-cols-2 gap-2">
            {([3, 5] as const).map((n) => (
              <label key={n} className={`cursor-pointer rounded-lg border p-3 text-center transition-colors ${
                bestOf === n
                  ? 'border-green-500 bg-green-900/30 text-green-300'
                  : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
              }`}>
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
                <span className="text-sm font-medium">Best of {n}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Opponent */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70" htmlFor="awayUserId">
            Opponent player ID
          </label>
          <Input
            id="awayUserId"
            name="awayUserId"
            placeholder="Player ID"
            className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
          />
          {state.errors?.awayUserId && (
            <p className="text-red-400 text-xs">{state.errors.awayUserId[0]}</p>
          )}
        </div>

        {/* Doubles partners */}
        {isDoubles && (
          <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium text-white/70">Doubles partners</p>
            <div className="space-y-2">
              <label className="text-xs text-white/50" htmlFor="homePartnerUserId">Your partner</label>
              <Input
                id="homePartnerUserId"
                name="homePartnerUserId"
                placeholder="Partner player ID"
                className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
              />
              {state.errors?.homePartnerUserId && (
                <p className="text-red-400 text-xs">{state.errors.homePartnerUserId[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs text-white/50" htmlFor="awayPartnerUserId">Opponent&apos;s partner</label>
              <Input
                id="awayPartnerUserId"
                name="awayPartnerUserId"
                placeholder="Partner player ID"
                className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
              />
              {state.errors?.awayPartnerUserId && (
                <p className="text-red-400 text-xs">{state.errors.awayPartnerUserId[0]}</p>
              )}
            </div>
          </div>
        )}

        {/* Sets */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white/70">Sets</span>
            {sets.length < maxSets && (
              <button
                type="button"
                onClick={addSet}
                className="text-xs text-green-400 hover:text-green-300"
              >
                + Add set
              </button>
            )}
          </div>

          {sets.map((set, i) => (
            <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/50">Set {i + 1}</span>
                {sets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSet(i)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40">You</label>
                  <Input
                    name={`sets[${i}][homeGames]`}
                    type="number"
                    min="0"
                    placeholder="0"
                    value={set.homeGames}
                    onChange={(e) => updateSet(i, 'homeGames', e.target.value)}
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/30 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40">Opponent</label>
                  <Input
                    name={`sets[${i}][awayGames]`}
                    type="number"
                    min="0"
                    placeholder="0"
                    value={set.awayGames}
                    onChange={(e) => updateSet(i, 'awayGames', e.target.value)}
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/30 mt-1"
                  />
                </div>
              </div>
              {/* Tiebreak (tennis/padel 7-6 sets) */}
              {(set.homeGames === '7' && set.awayGames === '6') ||
               (set.homeGames === '6' && set.awayGames === '7') ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/40">Tiebreak (you)</label>
                    <Input
                      name={`sets[${i}][homeTiebreak]`}
                      type="number"
                      min="0"
                      placeholder="0"
                      value={set.homeTiebreak}
                      onChange={(e) => updateSet(i, 'homeTiebreak', e.target.value)}
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/30 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40">Tiebreak (opp)</label>
                    <Input
                      name={`sets[${i}][awayTiebreak]`}
                      type="number"
                      min="0"
                      placeholder="0"
                      value={set.awayTiebreak}
                      onChange={(e) => updateSet(i, 'awayTiebreak', e.target.value)}
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/30 mt-1"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* Surface */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70" htmlFor="surface">Surface (optional)</label>
          <select
            id="surface"
            name="surface"
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            <option value="">Not specified</option>
            {SURFACES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70" htmlFor="playedAt">Match date (optional)</label>
          <Input
            id="playedAt"
            name="playedAt"
            type="datetime-local"
            className="bg-white/5 border-white/20 text-white"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70" htmlFor="notes">Notes (optional)</label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            maxLength={500}
            placeholder="How did it go?"
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
          />
        </div>

        {state.errors?._form && (
          <div className="rounded-lg bg-red-900/30 border border-red-700/50 p-3">
            {state.errors._form.map((e) => (
              <p key={e} className="text-red-300 text-sm">{e}</p>
            ))}
          </div>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold"
        >
          {isPending ? 'Submitting…' : 'Submit Match Result'}
        </Button>
      </form>
    </div>
  )
}
