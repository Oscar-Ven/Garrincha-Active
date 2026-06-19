import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Explore everything Garrincha Active offers — activity tracking, points, rewards, challenges, social tools, events, teams, and admin dashboards.",
};

// ---------------------------------------------------------------------------
// Icon components (inline SVGs, no external dependency)
// ---------------------------------------------------------------------------

function IconActivity() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconGift() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

function IconTrophy() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconBarChart() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const SECTIONS = [
  {
    id: "activity-tracking",
    icon: <IconActivity />,
    iconBg: "bg-green-50 text-green-600",
    accent: "border-green-500",
    title: "Activity Tracking",
    tagline: "Log every move, every sport, every session.",
    description:
      "Record seven distinct activity types with automatic point calculations. Each log is reviewed and approved to maintain leaderboard integrity.",
    items: [
      { label: "Run", detail: "Distance-based outdoor or treadmill runs" },
      { label: "Walk", detail: "Casual walks and step challenges" },
      { label: "Cycling", detail: "Road, MTB, or stationary cycling" },
      { label: "Football Training", detail: "Structured drills and skill work" },
      { label: "Football Match", detail: "Competitive or friendly matches" },
      { label: "Fitness", detail: "Gym sessions and cross-training" },
      { label: "Custom", detail: "Any other activity you want to track" },
    ],
  },
  {
    id: "points-levels",
    icon: <IconStar />,
    iconBg: "bg-yellow-50 text-yellow-600",
    accent: "border-yellow-500",
    title: "Points & Levels",
    tagline: "Earn your way to the top.",
    description:
      "Every approved activity, completed challenge, event attendance, and referral earns points. Points accumulate toward four progression levels that unlock exclusive perks.",
    items: [
      { label: "Bronze", detail: "Starting level for all new players" },
      { label: "Silver", detail: "Consistent performers with growing streaks" },
      { label: "Gold", detail: "Dedicated athletes in the top tier" },
      { label: "Elite", detail: "The highest recognition on the platform" },
    ],
  },
  {
    id: "rewards",
    icon: <IconGift />,
    iconBg: "bg-purple-50 text-purple-600",
    accent: "border-purple-500",
    title: "Rewards Catalog",
    tagline: "Spend your points on things that matter.",
    description:
      "Redeem accumulated points across six reward categories sourced from sports centers, sponsors, and platform partners.",
    items: [
      { label: "Discount", detail: "Percentage off sessions and gear" },
      { label: "Merchandise", detail: "Branded kits, accessories, and equipment" },
      { label: "Free Session", detail: "Complimentary court or pitch time" },
      { label: "Food & Drink", detail: "Vouchers at partner cafes and canteens" },
      {
        label: "Tournament Entry",
        detail: "Free or discounted competition slots",
      },
      { label: "Sponsor Voucher", detail: "Exclusive offers from brand partners" },
      { label: "VIP Access", detail: "Priority booking and backstage passes" },
    ],
  },
  {
    id: "challenges",
    icon: <IconTrophy />,
    iconBg: "bg-orange-50 text-orange-600",
    accent: "border-orange-500",
    title: "Challenges & Leaderboards",
    tagline: "Compete, improve, and claim glory.",
    description:
      "Join time-bound challenges across seven categories. Real-time leaderboards rank participants globally, per center, and within teams.",
    items: [
      { label: "Distance", detail: "Total km covered in a period" },
      { label: "Active Minutes", detail: "Cumulative workout time" },
      { label: "Activity Count", detail: "Number of logged sessions" },
      {
        label: "Football Training Attendance",
        detail: "Sessions at registered centers",
      },
      { label: "Match Count", detail: "Games played in a window" },
      { label: "Points", detail: "Pure points-earning race" },
      {
        label: "Center vs Center / Team",
        detail: "Collective squad challenges",
      },
    ],
  },
  {
    id: "social",
    icon: <IconUsers />,
    iconBg: "bg-sky-50 text-sky-600",
    accent: "border-sky-500",
    title: "Social Feed & Following",
    tagline: "Share the journey, celebrate together.",
    description:
      "A moderated activity feed surfaces achievements from players you follow. React, comment, and share milestones across the community.",
    items: [
      { label: "Activity Posts", detail: "Auto-generated cards for each log" },
      { label: "Badge Announcements", detail: "Celebrate earned badges publicly" },
      {
        label: "Challenge Completions",
        detail: "Broadcast when you finish a challenge",
      },
      { label: "Reward Redemptions", detail: "Share what you unlocked" },
      {
        label: "Event Registrations",
        detail: "Let followers know where you are playing",
      },
      { label: "Team Joins", detail: "Announce new club memberships" },
      {
        label: "Custom Posts",
        detail: "Free-form updates with visibility controls",
      },
    ],
  },
  {
    id: "events",
    icon: <IconCalendar />,
    iconBg: "bg-rose-50 text-rose-600",
    accent: "border-rose-500",
    title: "Events & Tournaments",
    tagline: "Find your next competition or training camp.",
    description:
      "Centers and platform admins publish events that players can register for. Attendance is tracked and rewarded with points.",
    items: [
      { label: "Training Sessions", detail: "Scheduled group practice at centers" },
      { label: "Tournaments", detail: "Single and multi-day knockout events" },
      { label: "Leagues", detail: "Season-long standings and fixtures" },
      { label: "Camps", detail: "Intensive development programs" },
      {
        label: "Community Events",
        detail: "Open days, charity matches, and meetups",
      },
    ],
  },
  {
    id: "teams",
    icon: <IconShield />,
    iconBg: "bg-indigo-50 text-indigo-600",
    accent: "border-indigo-500",
    title: "Team & Club Support",
    tagline: "Play together, win together.",
    description:
      "Create or join teams with owner, admin, and member roles. Teams can enter collective challenges, appear on center vs center leaderboards, and build their own identity.",
    items: [
      { label: "Team Ownership", detail: "Full control for the founding member" },
      {
        label: "Admin Roles",
        detail: "Delegate management to trusted members",
      },
      { label: "Member Roster", detail: "Searchable and filterable squad list" },
      {
        label: "Collective Challenges",
        detail: "Center vs center and team challenge modes",
      },
      { label: "Team Feed", detail: "Activity aggregated from all members" },
    ],
  },
  {
    id: "admin",
    icon: <IconBarChart />,
    iconBg: "bg-slate-100 text-slate-600",
    accent: "border-slate-400",
    title: "Admin Dashboard",
    tagline: "Full control for centers, sponsors, and platform staff.",
    description:
      "Role-based dashboards give center admins, sponsor admins, and platform admins the tools to manage activities, rewards, events, and users.",
    items: [
      {
        label: "Activity Moderation",
        detail: "Approve, flag, or reject submitted logs",
      },
      { label: "Points Management", detail: "Issue bonus or deduct points manually" },
      {
        label: "Reward Management",
        detail: "Create, price, and expire reward items",
      },
      {
        label: "Challenge Management",
        detail: "Launch and close challenges on schedule",
      },
      {
        label: "Event Management",
        detail: "Publish events and track attendance",
      },
      {
        label: "User Management",
        detail: "Verify, suspend, or promote accounts",
      },
      {
        label: "Analytics",
        detail: "Engagement, redemption, and leaderboard stats",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Badge({ text }: { text: string }) {
  return (
    <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
      {text}
    </span>
  );
}

function FeatureCard({
  section,
}: {
  section: (typeof SECTIONS)[number];
}) {
  return (
    <article
      className={`flex flex-col rounded-2xl border-t-4 ${section.accent} bg-white shadow-sm ring-1 ring-slate-100 hover:shadow-md transition-shadow duration-200`}
    >
      {/* Header */}
      <div className="flex items-start gap-4 p-6 pb-4">
        <div
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${section.iconBg}`}
        >
          {section.icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-slate-900 leading-snug">
            {section.title}
          </h3>
          <p className="mt-0.5 text-sm font-medium text-slate-500 italic">
            {section.tagline}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="px-6 text-sm text-slate-600 leading-relaxed">
        {section.description}
      </p>

      {/* Items */}
      <ul className="mt-4 px-6 pb-6 space-y-2">
        {section.items.map((item) => (
          <li key={item.label} className="flex items-start gap-2 text-sm">
            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
            <span>
              <span className="font-medium text-slate-800">{item.label}</span>
              {item.detail && (
                <span className="text-slate-500"> — {item.detail}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="bg-slate-900 px-4 py-20 text-center">
        <Badge text="Platform Overview" />
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Everything in one place
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
          Garrincha Active combines activity tracking, gamification, social
          tools, and event management into a single platform built for sports
          communities.
        </p>

        {/* Quick stat strip */}
        <dl className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { value: "7", label: "Activity types" },
            { value: "4", label: "Player levels" },
            { value: "7", label: "Reward categories" },
            { value: "7", label: "Challenge modes" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl bg-white/10 px-4 py-4 backdrop-blur-sm"
            >
              <dt className="text-3xl font-bold text-green-400">{stat.value}</dt>
              <dd className="mt-1 text-sm text-slate-300">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {SECTIONS.map((section) => (
            <FeatureCard key={section.id} section={section} />
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-slate-200 bg-white py-16 text-center">
        <h2 className="text-2xl font-bold text-slate-900">
          Ready to start tracking?
        </h2>
        <p className="mt-2 text-slate-500">
          Join thousands of athletes already earning points on Garrincha Active.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="/register"
            className="inline-flex items-center rounded-full bg-green-600 px-7 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
          >
            Create free account
          </a>
          <a
            href="/login"
            className="inline-flex items-center rounded-full border border-slate-300 bg-white px-7 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          >
            Sign in
          </a>
        </div>
      </section>
    </main>
  );
}
