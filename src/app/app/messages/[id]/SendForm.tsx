'use client'

import { useActionState, useEffect, useRef } from 'react'
import { sendMessageAction, type SendMessageState } from './actions'

const INITIAL: SendMessageState = {}

export function SendForm({ conversationId }: { conversationId: string }) {
  const [state, formAction, isPending] = useActionState(sendMessageAction, INITIAL)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

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
    <div className="border-t border-white/5 bg-surface-container-lowest px-md py-sm">
      {state.error && (
        <p className="mb-2 text-label-caps text-error">{state.error}</p>
      )}
      <form ref={formRef} action={formAction} className="flex items-end gap-sm">
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
          className="flex-1 resize-none rounded-xl border border-white/10 bg-surface-container px-md py-sm text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary-fixed disabled:opacity-50"
          style={{ minHeight: '44px' }}
        />
        <button
          type="submit"
          disabled={isPending}
          aria-label="Send"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed hover:opacity-90 transition-opacity disabled:opacity-50 action-glow"
        >
          <span
            className={`material-symbols-outlined${isPending ? ' animate-spin' : ''}`}
            style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
          >
            {isPending ? 'autorenew' : 'send'}
          </span>
        </button>
      </form>
    </div>
  )
}
