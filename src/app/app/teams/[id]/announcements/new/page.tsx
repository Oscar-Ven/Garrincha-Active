import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const metadata = { title: 'New Announcement' }

export default async function NewAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: id, userId: user.id } },
    include: { team: { select: { name: true } } },
  })

  if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
    redirect(`/app/teams/${id}`)
  }

  async function createAnnouncement(formData: FormData) {
    'use server'
    const u = await getCurrentUser()
    if (!u) redirect('/login')

    const title = (formData.get('title') as string)?.trim()
    const content = (formData.get('content') as string)?.trim()
    const isPinned = formData.get('isPinned') === 'on'

    if (!title || !content) return

    const ann = await prisma.teamAnnouncement.create({
      data: { teamId: id, authorId: u.id, title, content, isPinned },
    })

    // Notify all team members
    const members = await prisma.teamMember.findMany({
      where: { teamId: id, userId: { not: u.id } },
      select: { userId: true },
    })
    if (members.length > 0) {
      await prisma.notification.createMany({
        data: members.map((m) => ({
          userId: m.userId,
          type: 'ANNOUNCEMENT' as const,
          title: `New announcement in your team`,
          body: title,
          linkUrl: `/app/teams/${id}`,
        })),
      })
    }

    revalidatePath(`/app/teams/${id}`)
    redirect(`/app/teams/${id}`)
  }

  const inputCls = 'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600'

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/app/teams/${id}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Post Announcement</h1>
          <p className="text-xs text-slate-400">{membership.team.name}</p>
        </div>
      </div>

      <form action={createAnnouncement} className="space-y-5">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Title <span className="text-red-400">*</span></label>
            <input name="title" type="text" required maxLength={100} placeholder="e.g. Training cancelled this Saturday" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Message <span className="text-red-400">*</span></label>
            <textarea name="content" rows={5} required maxLength={1000} placeholder="Write your announcement here…"
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input name="isPinned" type="checkbox" className="h-4 w-4 rounded border-slate-600 bg-slate-700 accent-blue-500" />
            <div>
              <p className="text-sm font-medium text-slate-300">📌 Pin this announcement</p>
              <p className="text-xs text-slate-500">Pinned posts appear at the top of the announcements list</p>
            </div>
          </label>
        </div>

        <div className="flex gap-3 pb-2">
          <Link href={`/app/teams/${id}`}
            className="flex-1 rounded-xl border border-slate-700 py-3 text-sm font-medium text-slate-400 hover:text-white hover:border-slate-500 transition-colors text-center">
            Cancel
          </Link>
          <button type="submit"
            className="flex-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors">
            Post Announcement
          </button>
        </div>
      </form>
    </div>
  )
}
