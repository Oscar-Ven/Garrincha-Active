'use client'

import { useActionState, useEffect, useRef } from 'react'
import { sendMessageAction, type SendMessageState } from './actions'

const INITIAL: SendMessageState = {}

export function SendForm({ conversationId }: { conversationId: string }) {
  const [state, formAction, isPending] = useActionState(sendMessageAction, INITIAL)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Clear textarea after successful send
  useEffect(() => {
    if (!state.error && !isPending && textareaRef.current) {
      textareaRef.current.value = ''
      textareaRef.current.style.height = 'auto'
    }
  }, [state, isPending])

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

  return (
    <div className="border-t border-slate-800 bg-slate-950 px-4 py-3">
      {state.error && (
        <p className="mb-2 text-xs text-red-400">{state.error}</p>
      )}
      <form ref={formRef} action={formAction} className="flex items-end gap-2">
        <input type="hidden" name="conversationId" value={conversationId} />
        <textarea
          ref={textareaRef}
          name="body"
          rows={1}
          placeholder="Message… (Enter to send)"
          maxLength={1000}
          onChange={autoResize}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          className="flex-1 resize-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
          style={{ minHeight: '44px' }}
        />
        <button
          type="submit"
          disabled={isPending}
          aria-label="Send"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-500 transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </form>
    </div>
  )
}
