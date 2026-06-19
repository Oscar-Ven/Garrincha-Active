import {
  Role,
  ActivityType,
  ActivityVisibility,
  ActivityStatus,
  FeedPostType,
  ModerationStatus,
  ChallengeType,
  RewardCategory,
  RedemptionStatus,
  EventType,
  EventStatus,
  Level,
  TeamRole,
} from '@/generated/prisma'

// ─── Session / Auth ───────────────────────────────────────────────────────────

export type SessionUser = {
  id: string
  email: string
  role: Role
  name: string
  nickname: string
}

// ─── API Envelope ─────────────────────────────────────────────────────────────

export type ApiResponse<T = unknown> = {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export type PaginatedResponse<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export type LeaderboardEntry = {
  rank: number
  userId: string
  name: string
  nickname: string
  avatarUrl: string | null
  centerId: string | null
  centerName: string | null
  points: number
  distance: number
  minutes: number
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export type ActivityWithUser = {
  id: string
  userId: string
  title: string
  type: ActivityType
  startedAt: Date
  endedAt: Date | null
  durationMinutes: number
  distanceKm: number | null
  paceMinPerKm: number | null
  speedKmH: number | null
  caloriesBurned: number | null
  description: string | null
  visibility: ActivityVisibility
  status: ActivityStatus
  pointsEarned: number
  flagReason: string | null
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    name: string
    nickname: string
    avatarUrl: string | null
    centerId: string | null
    center: {
      id: string
      name: string
    } | null
    playerProfile: {
      level: Level
      totalPoints: number
    } | null
  }
  media: {
    id: string
    url: string
    type: string
  }[]
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

export type FeedPostWithRelations = {
  id: string
  userId: string
  type: FeedPostType
  content: string | null
  imageUrl: string | null
  visibility: ActivityVisibility
  moderationStatus: ModerationStatus
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    name: string
    nickname: string
    avatarUrl: string | null
  }
  activity: {
    id: string
    title: string
    type: ActivityType
    durationMinutes: number
    distanceKm: number | null
    pointsEarned: number
  } | null
  userBadge: {
    id: string
    awardedAt: Date
    badge: {
      id: string
      key: string
      name: string
      description: string
      iconUrl: string | null
    }
  } | null
  challengeParticipant: {
    id: string
    completedAt: Date | null
    challenge: {
      id: string
      title: string
      type: ChallengeType
      pointsReward: number
    }
  } | null
  rewardRedemption: {
    id: string
    createdAt: Date
    reward: {
      id: string
      title: string
      imageUrl: string | null
      category: RewardCategory
    }
  } | null
  eventRegistration: {
    id: string
    registeredAt: Date
    event: {
      id: string
      title: string
      type: EventType
      startDate: Date
    }
  } | null
  comments: {
    id: string
    userId: string
    content: string
    createdAt: Date
    moderationStatus: ModerationStatus
    user: {
      id: string
      name: string
      nickname: string
      avatarUrl: string | null
    }
  }[]
  reactions: {
    id: string
    userId: string
    type: string
  }[]
  _count: {
    comments: number
    reactions: number
  }
}

// ─── Challenges ───────────────────────────────────────────────────────────────

export type ChallengeWithParticipants = {
  id: string
  title: string
  description: string
  type: ChallengeType
  startDate: Date
  endDate: Date
  targetValue: number
  pointsReward: number
  isActive: boolean
  imageUrl: string | null
  createdAt: Date
  updatedAt: Date
  badge: {
    id: string
    key: string
    name: string
    iconUrl: string | null
  } | null
  center: {
    id: string
    name: string
  } | null
  sponsor: {
    id: string
    name: string
    logoUrl: string | null
  } | null
  participants: {
    id: string
    userId: string
    progress: number
    isCompleted: boolean
    completedAt: Date | null
    joinedAt: Date
    user: {
      id: string
      name: string
      nickname: string
      avatarUrl: string | null
    }
  }[]
  _count: {
    participants: number
  }
}

// ─── Rewards ──────────────────────────────────────────────────────────────────

export type RewardWithRedemptions = {
  id: string
  title: string
  description: string
  imageUrl: string | null
  pointsCost: number
  stock: number
  category: RewardCategory
  isActive: boolean
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
  center: {
    id: string
    name: string
  } | null
  sponsor: {
    id: string
    name: string
    logoUrl: string | null
  } | null
  redemptions: {
    id: string
    userId: string
    pointsSpent: number
    redemptionCode: string
    status: RedemptionStatus
    usedAt: Date | null
    createdAt: Date
    user: {
      id: string
      name: string
      nickname: string
      avatarUrl: string | null
    }
  }[]
  _count: {
    redemptions: number
  }
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type EventWithRegistrations = {
  id: string
  title: string
  description: string
  type: EventType
  status: EventStatus
  location: string | null
  startDate: Date
  endDate: Date
  capacity: number | null
  pointsReward: number
  imageUrl: string | null
  isTournament: boolean
  createdAt: Date
  updatedAt: Date
  center: {
    id: string
    name: string
    logoUrl: string | null
  } | null
  registrations: {
    id: string
    userId: string
    attended: boolean
    attendedAt: Date | null
    registeredAt: Date
    user: {
      id: string
      name: string
      nickname: string
      avatarUrl: string | null
    }
  }[]
  _count: {
    registrations: number
  }
}
