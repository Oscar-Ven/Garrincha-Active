'use client'

import * as React from 'react'
import { useTransition, useState, useEffect, useRef } from 'react'
import { z } from 'zod'
import { ActivityVisibility, SkillLevel } from '@/generated/prisma'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import {
  loadSettingsData,
  saveProfileInfo,
  savePrivacySettings,
  saveSkillLevel,
  changePassword,
  type SettingsData,
} from '@/app/app/settings/actions'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VISIBILITY_PREF_KEY = 'ga_default_visibility'

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const profileInfoSchema = z.object({
  name: z.string().min(1, 'Full name is required').max(100, 'Name is too long'),
  nickname: z
    .string()
    .min(2, 'Nickname must be at least 2 characters')
    .max(32, 'Nickname is too long')
    .regex(/^[a-zA-Z0-9_.\-]+$/, 'Nickname may only contain letters, numbers, _ . -'),
  bio: z.string().max(300, 'Bio must be 300 characters or fewer').optional(),
  favoriteSport: z.string().max(60, 'Too long').optional(),
  phone: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z
      .string()
      .regex(/^\+?[0-9\s\-().]{7,20}$/, 'Enter a valid phone number')
      .optional(),
  ),
  dateOfBirth: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().optional(),
  ),
})

const privacySchema = z.object({
  defaultVisibility: z.nativeEnum(ActivityVisibility),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .max(128, 'Password is too long'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ProfileInfoValues = z.infer<typeof profileInfoSchema>
type PasswordValues = z.infer<typeof passwordSchema>
type FieldErrors<T> = Partial<Record<keyof T, string>>

// ---------------------------------------------------------------------------
// Shared UI helpers
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="glass-card rounded-xl shadow-lg">
      <div className="border-b border-white/10 px-6 py-4">
        <h2 className="text-base font-semibold text-on-surface">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-on-surface-variant">{description}</p>
        )}
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </section>
  )
}

function FieldWrapper({
  label,
  error,
  hint,
  children,
}: {
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-on-surface">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-on-surface-variant">{hint}</p>}
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  )
}

function SaveButton({ pending, label = 'Save Changes' }: { pending: boolean; label?: string }) {
  return (
    <Button type="submit" disabled={pending} size="md">
      {pending ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          Saving...
        </span>
      ) : (
        label
      )}
    </Button>
  )
}

function ServerErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
      {message}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Profile Info Section
// ---------------------------------------------------------------------------

function ProfileInfoSection({
  userId,
  initial,
}: {
  userId: string
  initial: Omit<SettingsData, 'id' | 'defaultVisibility' | 'avatarUrl' | 'skillLevel'>
}) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<FieldErrors<ProfileInfoValues>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const [name, setName] = useState(initial.name)
  const [nickname, setNickname] = useState(initial.nickname)
  const [bio, setBio] = useState(initial.bio ?? '')
  const [favoriteSport, setFavoriteSport] = useState(initial.favoriteSport ?? '')
  const [phone, setPhone] = useState(initial.phone ?? '')
  const [dateOfBirth, setDateOfBirth] = useState(
    initial.dateOfBirth
      ? new Date(initial.dateOfBirth).toISOString().slice(0, 10)
      : '',
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})
    setServerError(null)

    const raw = {
      name,
      nickname,
      bio: bio || undefined,
      favoriteSport: favoriteSport || undefined,
      phone: phone || undefined,
      dateOfBirth: dateOfBirth || undefined,
    }

    const result = profileInfoSchema.safeParse(raw)
    if (!result.success) {
      const errs: FieldErrors<ProfileInfoValues> = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof ProfileInfoValues
        if (!errs[key]) errs[key] = issue.message
      }
      setErrors(errs)
      return
    }

    startTransition(async () => {
      try {
        const { error } = await saveProfileInfo(userId, result.data)
        if (error) {
          setServerError(error)
          return
        }
        toast({
          variant: 'success',
          title: 'Profile updated',
          description: 'Your profile information has been saved.',
          duration: 4000,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
        setServerError(msg)
      }
    })
  }

  return (
    <SectionCard
      title="Profile Information"
      description="Update your public profile details."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {serverError && <ServerErrorBanner message={serverError} />}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrapper label="Full Name" error={errors.name}>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              maxLength={100}
              autoComplete="name"
            />
          </FieldWrapper>

          <FieldWrapper
            label="Nickname"
            error={errors.nickname}
            hint="Unique handle. Letters, numbers, _ . - only."
          >
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-on-surface-variant text-sm">
                @
              </span>
              <Input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="your_handle"
                maxLength={32}
                autoComplete="username"
                className="pl-7"
              />
            </div>
          </FieldWrapper>
        </div>

        <FieldWrapper
          label="Bio"
          error={errors.bio}
          hint={`${bio.length}/300 characters`}
        >
          <textarea
            rows={3}
            maxLength={300}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell the community a little about yourself..."
            className={cn(
              'w-full rounded-md border border-white/10 bg-surface-container px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant',
              'focus:outline-none focus:ring-2 focus:ring-primary-fixed focus:border-primary-fixed',
              'disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors duration-150',
            )}
          />
        </FieldWrapper>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrapper
            label="Favorite Sport"
            error={errors.favoriteSport}
            hint="e.g. Football, Running, Cycling"
          >
            <Input
              type="text"
              value={favoriteSport}
              onChange={(e) => setFavoriteSport(e.target.value)}
              placeholder="Football"
              maxLength={60}
            />
          </FieldWrapper>

          <FieldWrapper label="Phone Number" error={errors.phone}>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 0000"
              autoComplete="tel"
            />
          </FieldWrapper>
        </div>

        <FieldWrapper label="Date of Birth" error={errors.dateOfBirth}>
          <Input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className="[color-scheme:dark] max-w-xs"
          />
        </FieldWrapper>

        <div className="flex justify-end pt-2">
          <SaveButton pending={isPending} />
        </div>
      </form>
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Privacy Section
// ---------------------------------------------------------------------------

const VISIBILITY_OPTIONS: {
  value: ActivityVisibility
  label: string
  description: string
}[] = [
  {
    value: ActivityVisibility.PUBLIC,
    label: 'Public',
    description: 'Anyone on the platform can see your activities',
  },
  {
    value: ActivityVisibility.FOLLOWERS,
    label: 'Followers only',
    description: 'Only people who follow you can see your activities',
  },
  {
    value: ActivityVisibility.PRIVATE,
    label: 'Private',
    description: 'Only you can see your activities',
  },
]

function PrivacySection({
  userId,
  initial,
}: {
  userId: string
  initial: ActivityVisibility
}) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [visibility, setVisibility] = useState<ActivityVisibility>(initial)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError(null)

    const result = privacySchema.safeParse({ defaultVisibility: visibility })
    if (!result.success) return

    startTransition(async () => {
      try {
        const { error } = await savePrivacySettings(userId)
        if (error) {
          setServerError(error)
          return
        }
        localStorage.setItem(VISIBILITY_PREF_KEY, visibility)
        const label =
          VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.label ?? visibility
        toast({
          variant: 'success',
          title: 'Privacy settings saved',
          description: `New activities will default to "${label}".`,
          duration: 4000,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
        setServerError(msg)
      }
    })
  }

  return (
    <SectionCard
      title="Privacy"
      description="Control who can see the activities you log by default."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {serverError && <ServerErrorBanner message={serverError} />}

        <div className="space-y-2">
          <p className="text-sm font-medium text-on-surface">Default Activity Visibility</p>
          <div className="space-y-2">
            {VISIBILITY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors',
                  visibility === opt.value
                    ? 'border-primary-fixed bg-primary-fixed/10'
                    : 'glass-card hover:bg-surface-container-high',
                )}
              >
                <input
                  type="radio"
                  name="defaultVisibility"
                  value={opt.value}
                  checked={visibility === opt.value}
                  onChange={() => setVisibility(opt.value)}
                  className="mt-0.5 h-4 w-4 accent-[#c3f400]"
                />
                <div>
                  <p className="text-sm font-medium text-on-surface">{opt.label}</p>
                  <p className="text-xs text-on-surface-variant">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <p className="text-xs text-on-surface-variant">
          This applies to new activities you log. You can always override visibility on individual
          activities.
        </p>

        <div className="flex justify-end pt-1">
          <SaveButton pending={isPending} label="Save Privacy Settings" />
        </div>
      </form>
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Change Password Section
// ---------------------------------------------------------------------------

function RevealPasswordInput({
  name,
  placeholder,
  autoComplete,
  error,
}: {
  name: string
  placeholder: string
  autoComplete?: string
  error?: string
}) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative">
      <Input
        name={name}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={cn('pr-10', error && 'border-error focus:ring-error')}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        tabIndex={-1}
        className="absolute inset-y-0 right-2 flex items-center text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none"
      >
        {show ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  )
}

function ChangePasswordSection({ userId }: { userId: string }) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<FieldErrors<PasswordValues>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})
    setServerError(null)

    const fd = new FormData(e.currentTarget)
    const raw = {
      currentPassword: fd.get('currentPassword') as string,
      newPassword: fd.get('newPassword') as string,
      confirmPassword: fd.get('confirmPassword') as string,
    }

    const result = passwordSchema.safeParse(raw)
    if (!result.success) {
      const errs: FieldErrors<PasswordValues> = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof PasswordValues
        if (!errs[key]) errs[key] = issue.message
      }
      setErrors(errs)
      return
    }

    startTransition(async () => {
      try {
        const { error } = await changePassword(
          userId,
          result.data.currentPassword,
          result.data.newPassword,
        )
        if (error) {
          setServerError(error)
          return
        }
        formRef.current?.reset()
        toast({
          variant: 'success',
          title: 'Password changed',
          description: 'Your password has been updated successfully.',
          duration: 4000,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
        setServerError(msg)
      }
    })
  }

  return (
    <SectionCard
      title="Change Password"
      description="Use a strong password with at least 8 characters."
    >
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
        {serverError && <ServerErrorBanner message={serverError} />}

        <FieldWrapper label="Current Password" error={errors.currentPassword}>
          <RevealPasswordInput
            name="currentPassword"
            placeholder="Enter your current password"
            autoComplete="current-password"
            error={errors.currentPassword}
          />
        </FieldWrapper>

        <FieldWrapper label="New Password" error={errors.newPassword}>
          <RevealPasswordInput
            name="newPassword"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            error={errors.newPassword}
          />
        </FieldWrapper>

        <FieldWrapper label="Confirm New Password" error={errors.confirmPassword}>
          <RevealPasswordInput
            name="confirmPassword"
            placeholder="Repeat your new password"
            autoComplete="new-password"
            error={errors.confirmPassword}
          />
        </FieldWrapper>

        <div className="flex justify-end pt-1">
          <SaveButton pending={isPending} label="Change Password" />
        </div>
      </form>
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Avatar Upload Section
// ---------------------------------------------------------------------------

function AvatarSection({ userId, currentAvatarUrl }: { userId: string; currentAvatarUrl?: string | null }) {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl ?? null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setPreview(URL.createObjectURL(file))
    setUploading(true)

    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload/avatar', { method: 'POST', body: fd })
      const data = await res.json() as { url?: string; error?: string }

      if (!res.ok || data.error) {
        toast({ variant: 'destructive', title: 'Upload failed', description: data.error ?? 'Please try again.', duration: 4000 })
        setPreview(currentAvatarUrl ?? null)
      } else {
        toast({ variant: 'success', title: 'Avatar updated', description: 'Your new avatar is now live.', duration: 4000 })
      }
    } catch {
      toast({ variant: 'destructive', title: 'Upload failed', description: 'Network error. Please try again.', duration: 4000 })
      setPreview(currentAvatarUrl ?? null)
    } finally {
      setUploading(false)
    }
  }

  const initials = userId.slice(0, 2).toUpperCase()

  return (
    <SectionCard title="Profile Picture" description="Upload a photo that will appear on your profile and in the feed.">
      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Avatar" className="h-20 w-20 rounded-full object-cover ring-2 ring-white/20" />
          ) : (
            <div className="h-20 w-20 rounded-full bg-primary-fixed/10 ring-2 ring-white/20 flex items-center justify-center text-xl font-bold text-primary-fixed">
              {initials}
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
              <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileChange} />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="glass-card rounded-lg px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-high disabled:opacity-50 transition-colors"
          >
            {uploading ? 'Uploading…' : 'Change Photo'}
          </button>
          <p className="text-xs text-on-surface-variant">JPEG, PNG, WebP or GIF · Max 5 MB</p>
        </div>
      </div>
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Skill Level Section
// ---------------------------------------------------------------------------

const SKILL_LEVELS: { value: SkillLevel; label: string; desc: string }[] = [
  { value: SkillLevel.BEGINNER,      label: 'Beginner',      desc: 'Just getting started' },
  { value: SkillLevel.RECREATIONAL,  label: 'Recreational',  desc: 'Play for fun' },
  { value: SkillLevel.INTERMEDIATE,  label: 'Intermediate',  desc: 'Consistent technique' },
  { value: SkillLevel.ADVANCED,      label: 'Advanced',      desc: 'Competitive level' },
  { value: SkillLevel.EXPERT,        label: 'Expert',        desc: 'Elite / professional' },
]

function SkillLevelSection({
  userId,
  initial,
}: {
  userId: string
  initial: SkillLevel | null
}) {
  const [selected, setSelected] = useState<SkillLevel | null>(initial)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()

  function handleSelect(level: SkillLevel) {
    const next = selected === level ? null : level
    setSelected(next)
    startTransition(async () => {
      const res = await saveSkillLevel(userId, next)
      if (res.error) toast({ variant: 'destructive', title: res.error, duration: 4000 })
      else toast({ variant: 'success', title: 'Skill level saved.', duration: 2000 })
    })
  }

  return (
    <SectionCard
      title="Skill Level"
      description="Shown on your profile and used to match open games."
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
        {SKILL_LEVELS.map((sl) => {
          const active = selected === sl.value
          return (
            <button
              key={sl.value}
              type="button"
              disabled={pending}
              onClick={() => handleSelect(sl.value)}
              className={cn(
                'rounded-lg border px-3 py-3 text-left transition-colors',
                active
                  ? 'border-primary-fixed bg-primary-fixed/10 text-primary-fixed'
                  : 'glass-card text-on-surface hover:bg-surface-container-high',
              )}
            >
              <div className="text-sm font-semibold">{sl.label}</div>
              <div className={cn('text-xs mt-0.5', active ? 'text-primary-fixed/70' : 'text-on-surface-variant')}>{sl.desc}</div>
            </button>
          )
        })}
      </div>
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Push Notifications Section
// ---------------------------------------------------------------------------

function PushNotificationsSection() {
  const { permission, subscribed, subscribe, unsubscribe } = usePushNotifications()

  if (typeof window === 'undefined' || !('Notification' in window)) return null

  return (
    <SectionCard
      title="Push Notifications"
      description="Get instant alerts for session reminders, kudos, and badge unlocks."
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-on-surface">
            {permission === 'granted' && subscribed
              ? 'Notifications are enabled on this device.'
              : permission === 'denied'
              ? 'Notifications are blocked in your browser settings.'
              : 'Enable push notifications to stay in the loop.'}
          </p>
        </div>
        {permission !== 'denied' && (
          <button
            type="button"
            onClick={subscribed ? unsubscribe : subscribe}
            className={cn(
              'shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
              subscribed
                ? 'glass-card text-on-surface hover:bg-surface-container-high'
                : 'bg-primary-fixed text-on-primary-fixed hover:bg-primary-fixed-dim',
            )}
          >
            {subscribed ? 'Turn off' : 'Enable'}
          </button>
        )}
      </div>
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function SkeletonCard({ rows = 4 }: { rows?: number }) {
  return (
    <div className="glass-card rounded-xl animate-pulse">
      <div className="border-b border-white/10 px-6 py-4 space-y-1.5">
        <div className="h-4 w-44 rounded bg-surface-container-highest" />
        <div className="h-3 w-64 rounded bg-surface-container-highest/60" />
      </div>
      <div className="px-6 py-5 space-y-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="h-10 rounded-md bg-surface-container-highest" />
        ))}
        <div className="flex justify-end">
          <div className="h-10 w-32 rounded-md bg-surface-container-highest" />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [userData, setUserData] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await loadSettingsData()
        if (cancelled) return

        if (!data) {
          setAuthError(true)
          setLoading(false)
          return
        }

        const stored = localStorage.getItem(VISIBILITY_PREF_KEY) as ActivityVisibility | null
        if (stored && (Object.values(ActivityVisibility) as string[]).includes(stored)) {
          data.defaultVisibility = stored
        }

        setUserData(data)
      } catch {
        if (!cancelled) setAuthError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Settings</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Manage your profile, privacy preferences, and account security.
        </p>
      </div>

      {/* Auth error */}
      {authError && !loading && (
        <div className="rounded-lg border border-error/30 bg-error/10 px-6 py-4 text-sm text-error">
          Unable to load your settings. Please refresh the page or log in again.
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <>
          <SkeletonCard rows={5} />
          <SkeletonCard rows={3} />
          <SkeletonCard rows={3} />
        </>
      )}

      {/* Loaded state */}
      {!loading && userData && (
        <>
          <AvatarSection userId={userData.id} currentAvatarUrl={userData.avatarUrl} />

          <ProfileInfoSection
            userId={userData.id}
            initial={{
              name: userData.name,
              nickname: userData.nickname,
              email: userData.email,
              bio: userData.bio ?? null,
              favoriteSport: userData.favoriteSport ?? null,
              phone: userData.phone,
              dateOfBirth: userData.dateOfBirth,
            }}
          />

          <SkillLevelSection
            userId={userData.id}
            initial={userData.skillLevel}
          />

          <PrivacySection
            userId={userData.id}
            initial={userData.defaultVisibility}
          />

          <PushNotificationsSection />

          <ChangePasswordSection userId={userData.id} />
        </>
      )}
    </div>
  )
}
