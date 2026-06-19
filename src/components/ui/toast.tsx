'use client'

import * as React from 'react'
import * as ToastPrimitives from '@radix-ui/react-toast'
import { cn } from '@/lib/utils'

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-4 sm:right-4 sm:max-w-[420px]',
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

type ToastVariant = 'default' | 'success' | 'destructive'

const toastVariantClasses: Record<ToastVariant, string> = {
  default:
    'border border-slate-700 bg-slate-800 text-slate-100',
  success:
    'border border-green-700 bg-green-900/90 text-green-100',
  destructive:
    'border border-red-700 bg-red-900/90 text-red-100',
}

export interface ToastProps
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> {
  variant?: ToastVariant
}

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  ToastProps
>(({ className, variant = 'default', ...props }, ref) => (
  <ToastPrimitives.Root
    ref={ref}
    className={cn(
      'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg p-4 shadow-lg transition-all',
      'data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',
      'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full',
      'data-[state=open]:slide-in-from-bottom-full',
      toastVariantClasses[variant],
      className
    )}
    {...props}
  />
))
Toast.displayName = ToastPrimitives.Root.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn('text-sm font-semibold leading-snug', className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('text-sm opacity-80 leading-snug', className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'ml-auto shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-400',
      className
    )}
    toast-close=""
    {...props}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

// ---- useToast hook ----

export interface ToastOptions {
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToastState extends ToastOptions {
  id: string
  open: boolean
}

type ToastAction =
  | { type: 'ADD'; toast: ToastState }
  | { type: 'UPDATE'; id: string; toast: Partial<ToastState> }
  | { type: 'DISMISS'; id: string }
  | { type: 'REMOVE'; id: string }

const TOAST_LIMIT = 5

function toastReducer(state: ToastState[], action: ToastAction): ToastState[] {
  switch (action.type) {
    case 'ADD':
      return [action.toast, ...state].slice(0, TOAST_LIMIT)
    case 'UPDATE':
      return state.map((t) =>
        t.id === action.id ? { ...t, ...action.toast } : t
      )
    case 'DISMISS':
      return state.map((t) =>
        t.id === action.id ? { ...t, open: false } : t
      )
    case 'REMOVE':
      return state.filter((t) => t.id !== action.id)
    default:
      return state
  }
}

let idCounter = 0
function genId() {
  idCounter = (idCounter + 1) % Number.MAX_SAFE_INTEGER
  return String(idCounter)
}

// Module-level listeners so multiple useToast calls share state
type Listener = (state: ToastState[]) => void
let memoryState: ToastState[] = []
const listeners: Set<Listener> = new Set()

function dispatch(action: ToastAction) {
  memoryState = toastReducer(memoryState, action)
  listeners.forEach((l) => l(memoryState))
}

function addToast(options: ToastOptions) {
  const id = genId()
  const duration = options.duration ?? 5000

  dispatch({
    type: 'ADD',
    toast: { ...options, id, open: true },
  })

  if (duration !== Infinity) {
    setTimeout(() => {
      dispatch({ type: 'DISMISS', id })
      setTimeout(() => dispatch({ type: 'REMOVE', id }), 300)
    }, duration)
  }

  return id
}

export function useToast() {
  const [toasts, setToasts] = React.useState<ToastState[]>(memoryState)

  React.useEffect(() => {
    listeners.add(setToasts)
    return () => {
      listeners.delete(setToasts)
    }
  }, [])

  return {
    toasts,
    toast: (options: ToastOptions) => addToast(options),
    dismiss: (id: string) => dispatch({ type: 'DISMISS', id }),
  }
}

// ---- Toaster (renders all active toasts) ----

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, variant, open }) => (
        <Toast
          key={id}
          variant={variant}
          open={open}
          onOpenChange={(isOpen) => {
            if (!isOpen) dismiss(id)
          }}
        >
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && (
              <ToastDescription>{description}</ToastDescription>
            )}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}

export { ToastViewport, ToastTitle, ToastDescription, ToastClose }
