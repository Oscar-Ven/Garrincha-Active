import { PrismaClient, ActivityType, ChallengeType, EventType, TeamRole, Level, FeedPostType, NotificationType, DirectChallengeType, DirectChallengeStatus } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'

const databaseUrl = process.env.DATABASE_URL ?? 'file:./prisma/dev.db'
const adapter = new PrismaBetterSqlite3({ url: databaseUrl })
const prisma = new PrismaClient({ adapter } as any)

const SALT_ROUNDS = 10

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function daysFromNow(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

function monthsAgo(n: number): Date {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d
}

function monthsFromNow(n: number): Date {
  const d = new Date()
  d.setMonth(d.getMonth() + n)
  return d
}

function calcPoints(type: ActivityType, durationMinutes: number, distanceKm?: number): number {
  const base: Record<ActivityType, number> = {
    RUN: 10, WALK: 5, CYCLING: 8, FOOTBALL_TRAINING: 12, FOOTBALL_MATCH: 20, FITNESS: 8, CUSTOM: 5,
    PADEL: 15, TENNIS: 15, SQUASH: 12, PICKLEBALL: 10, BADMINTON: 10, RACQUETBALL: 12,
  }
  let pts = base[type] + Math.floor(durationMinutes * 0.5)
  if (distanceKm) pts += Math.floor(distanceKm * 2)
  return Math.min(pts, 200)
}

function levelFromPoints(pts: number): Level {
  if (pts >= 5000) return 'ELITE'
  if (pts >= 2000) return 'GOLD'
  if (pts >= 500) return 'SILVER'
  return 'BRONZE'
}

function generateSplitsData(activityId: string, distanceKm: number, paceMinPerKm: number) {
  const splits = []
  const totalKm = distanceKm
  const fullSplits = Math.floor(totalKm)
  const remainder = totalKm - fullSplits
  for (let i = 0; i < fullSplits; i++) {
    const variance = 0.9 + Math.random() * 0.2
    const elapsedSecs = Math.round(paceMinPerKm * 60 * variance)
    splits.push({
      activityId,
      splitNumber: i + 1,
      distanceKm: 1.0,
      elapsedSecs,
      paceSecPerKm: elapsedSecs,
      elevationGainM: Math.round(3 + Math.random() * 12),
    })
  }
  if (remainder > 0.05) {
    const elapsedSecs = Math.round(paceMinPerKm * 60 * remainder)
    splits.push({
      activityId,
      splitNumber: fullSplits + 1,
      distanceKm: Math.round(remainder * 100) / 100,
      elapsedSecs,
      paceSecPerKm: Math.round(elapsedSecs / remainder),
      elevationGainM: Math.round(1 + Math.random() * 5),
    })
  }
  return splits
}

async function main() {
  console.log('🌱 Starting expanded seed...\n')

  // ── CENTERS ───────────────────────────────────────────────────────────────────

  console.log('Creating centers...')

  const hub = await prisma.center.upsert({
    where: { name: 'Garrincha FC Hub' },
    update: {},
    create: { name: 'Garrincha FC Hub', city: 'Riyadh', address: 'King Fahd Road, Riyadh', description: 'Main hub center' },
  })

  const dome = await prisma.center.upsert({
    where: { name: 'Garrincha Sports Dome' },
    update: {},
    create: { name: 'Garrincha Sports Dome', city: 'Jeddah', address: 'Corniche Road, Jeddah' },
  })

  const academy = await prisma.center.upsert({
    where: { name: 'Garrincha Training Academy' },
    update: {},
    create: { name: 'Garrincha Training Academy', city: 'Dammam', address: 'Dhahran Street, Dammam' },
  })

  console.log('  ✓ 3 centers ready')

  // ── SPONSORS ──────────────────────────────────────────────────────────────────

  console.log('Creating sponsors...')

  const sportsPro = await prisma.sponsor.upsert({
    where: { name: 'SportsPro KSA' },
    update: {},
    create: { name: 'SportsPro KSA', description: 'Leading sports equipment brand', website: 'https://sportspro.example.com' },
  })

  const hydra = await prisma.sponsor.upsert({
    where: { name: 'Hydra Energy' },
    update: {},
    create: { name: 'Hydra Energy', description: 'Sports nutrition and energy drinks', website: 'https://hydra.example.com' },
  })

  console.log('  ✓ 2 sponsors ready')

  // ── ADMIN USERS ───────────────────────────────────────────────────────────────

  console.log('Creating admin users...')

  const adminHash = await bcrypt.hash('Admin123!', SALT_ROUNDS)
  const sponsorHash = await bcrypt.hash('Sponsor123!', SALT_ROUNDS)
  const playerHash = await bcrypt.hash('Player123!', SALT_ROUNDS)

  const platformAdmin = await prisma.user.upsert({
    where: { email: 'admin@garrincha.local' },
    update: {},
    create: { email: 'admin@garrincha.local', name: 'Platform Admin', nickname: 'garrinchaadmin', role: 'PLATFORM_ADMIN', passwordHash: adminHash },
  })

  const centerAdmin = await prisma.user.upsert({
    where: { email: 'center@garrincha.local' },
    update: {},
    create: { email: 'center@garrincha.local', name: 'Center Manager', nickname: 'centermanager', role: 'CENTER_ADMIN', passwordHash: adminHash, centerId: hub.id },
  })

  await prisma.user.upsert({
    where: { email: 'sponsor@garrincha.local' },
    update: {},
    create: { email: 'sponsor@garrincha.local', name: 'SportsPro Admin', nickname: 'sponsoradmin', role: 'SPONSOR_ADMIN', passwordHash: sponsorHash },
  })

  const demoPlayer = await prisma.user.upsert({
    where: { email: 'player@garrincha.local' },
    update: {},
    create: { email: 'player@garrincha.local', name: 'Demo Player', nickname: 'demoplayer', role: 'PLAYER', passwordHash: playerHash, centerId: hub.id },
  })

  console.log('  ✓ 4 admin users ready')

  // ── SEED PLAYERS ──────────────────────────────────────────────────────────────

  console.log('Creating 30 seed players...')

  const seedPlayerData = [
    { name: 'Carlos Silva',         nickname: 'carlossilva',      email: 'carlos@seed.local',    centerId: hub.id },
    { name: 'Aisha Rahman',         nickname: 'aisharahman',      email: 'aisha@seed.local',     centerId: dome.id },
    { name: 'Pedro Martinez',       nickname: 'pedromartinez',    email: 'pedro@seed.local',     centerId: hub.id },
    { name: 'Fatima Al-Harbi',      nickname: 'fatimaharbi',      email: 'fatima@seed.local',    centerId: academy.id },
    { name: 'Lucas Oliveira',       nickname: 'lucasoliveira',    email: 'lucas@seed.local',     centerId: dome.id },
    { name: 'Zaid Al-Mutairi',      nickname: 'zaidmutairi',      email: 'zaid@seed.local',      centerId: hub.id },
    { name: 'Ana Souza',            nickname: 'anasouza',         email: 'ana@seed.local',       centerId: academy.id },
    { name: 'Omar Al-Rashidi',      nickname: 'omarrashidi',      email: 'omar@seed.local',      centerId: dome.id },
    { name: 'Gabriel Santos',       nickname: 'gabrielsantos',    email: 'gabriel@seed.local',   centerId: hub.id },
    { name: 'Sara Al-Zahrani',      nickname: 'sarazahrani',      email: 'sara@seed.local',      centerId: academy.id },
    { name: 'Rafael Costa',         nickname: 'rafaelcosta',      email: 'rafael@seed.local',    centerId: dome.id },
    { name: 'Khalid Al-Otaibi',     nickname: 'khalidotaibi',     email: 'khalid@seed.local',    centerId: hub.id },
    { name: 'Juliana Lima',         nickname: 'julianalima',      email: 'juliana@seed.local',   centerId: academy.id },
    { name: 'Yusuf Al-Ghamdi',      nickname: 'yusufghamdi',      email: 'yusuf@seed.local',     centerId: dome.id },
    { name: 'Mariana Pereira',      nickname: 'marianapereira',   email: 'mariana@seed.local',   centerId: hub.id },
    { name: 'Hamad Al-Dosari',      nickname: 'hamaddosari',      email: 'hamad@seed.local',     centerId: academy.id },
    { name: 'Diego Fernandez',      nickname: 'diegofernandez',   email: 'diego@seed.local',     centerId: dome.id },
    { name: 'Nora Al-Saud',         nickname: 'norasaud',         email: 'nora@seed.local',      centerId: hub.id },
    { name: 'Thiago Alves',         nickname: 'thiagoalves',      email: 'thiago@seed.local',    centerId: academy.id },
    { name: 'Reem Al-Qahtani',      nickname: 'reemqahtani',      email: 'reem@seed.local',      centerId: dome.id },
    // 10 new players
    { name: 'Mohammed Al-Harbi',    nickname: 'mohammedharbi',    email: 'mohammed@seed.local',  centerId: hub.id },
    { name: 'Layla Al-Shammari',    nickname: 'laylashammari',    email: 'layla@seed.local',     centerId: dome.id },
    { name: 'Ibrahim Al-Dosari',    nickname: 'ibrahimdosari',    email: 'ibrahim@seed.local',   centerId: academy.id },
    { name: 'Hessa Al-Blooshi',     nickname: 'hessablooshi',     email: 'hessa@seed.local',     centerId: hub.id },
    { name: 'Tariq Al-Ghamdi',      nickname: 'tariqghamdi',      email: 'tariq@seed.local',     centerId: dome.id },
    { name: 'Wafa Al-Otaibi',       nickname: 'wafaotaibi',       email: 'wafa@seed.local',      centerId: academy.id },
    { name: 'Bader Al-Mutairi',     nickname: 'badermutairi',     email: 'bader@seed.local',     centerId: hub.id },
    { name: 'Asma Al-Rashidi',      nickname: 'asmarashidi',      email: 'asma@seed.local',      centerId: dome.id },
    { name: 'Faisal Al-Zahrani',    nickname: 'faisalzahrani',    email: 'faisal@seed.local',    centerId: academy.id },
    { name: 'Maha Al-Saud',         nickname: 'mahasaud',         email: 'maha@seed.local',      centerId: hub.id },
  ]

  const seedPlayers: Array<{ id: string; email: string; centerId: string | null }> = []

  for (const p of seedPlayerData) {
    try {
      const user = await prisma.user.upsert({
        where: { email: p.email },
        update: {},
        create: { email: p.email, name: p.name, nickname: p.nickname, role: 'PLAYER', passwordHash: playerHash, centerId: p.centerId },
      })
      seedPlayers.push({ id: user.id, email: user.email, centerId: user.centerId })
    } catch (err) {
      console.error(`  ! Failed to create player ${p.name}:`, err)
    }
  }

  console.log(`  ✓ ${seedPlayers.length} seed players ready`)

  // ── PLAYER PROFILES ───────────────────────────────────────────────────────────

  console.log('Creating player profiles...')

  const allPlayerEmails = [demoPlayer.email, ...seedPlayerData.map(p => p.email)]
  const allPlayerUsers = await prisma.user.findMany({ where: { email: { in: allPlayerEmails }, role: 'PLAYER' } })

  const streakValues = [0, 1, 2, 3, 5, 7, 10, 12, 14, 3, 1, 5, 8, 2, 6, 4, 9, 3, 7, 11, 2, 5, 3, 8, 1, 4, 6, 2, 9, 7, 3]
  let profilesCreated = 0
  for (let i = 0; i < allPlayerUsers.length; i++) {
    const u = allPlayerUsers[i]
    const streak = streakValues[i % streakValues.length]
    try {
      await prisma.playerProfile.upsert({
        where: { userId: u.id },
        update: {},
        create: {
          userId: u.id,
          favoriteSport: i % 3 === 0 ? 'Running' : i % 3 === 1 ? 'Football' : 'Cycling',
          bio: `Sports enthusiast based at Garrincha.`,
          streakDays: streak,
          longestStreak: Math.max(streak, Math.floor(streak * 1.5) + 2),
        },
      })
      profilesCreated++
    } catch (err) {
      console.error(`  ! Failed to create profile for ${u.id}:`, err)
    }
  }

  console.log(`  ✓ ${profilesCreated} player profiles ready`)

  // ── BADGES ────────────────────────────────────────────────────────────────────

  console.log('Creating badges...')

  const badgeData = [
    { key: 'first_activity',      name: 'First Kick',          description: 'Logged your first activity' },
    { key: '5k_runner',           name: '5K Runner',           description: 'Ran 5km total' },
    { key: '10k_runner',          name: '10K Runner',          description: 'Ran 10km total' },
    { key: 'football_starter',    name: 'Football Starter',    description: 'First football training session' },
    { key: 'match_player',        name: 'Match Player',        description: 'Played your first match' },
    { key: 'weekly_streak',       name: 'Weekly Warrior',      description: 'Active 5 days in a week' },
    { key: 'challenge_finisher',  name: 'Challenge Finisher',  description: 'Completed your first challenge' },
    { key: 'center_champion',     name: 'Center Champion',     description: 'Top scorer in your center' },
    { key: 'reward_redeemer',     name: 'Reward Redeemer',     description: 'Redeemed your first reward' },
    { key: 'segment_star',        name: 'Segment Star',        description: 'Completed your first segment' },
    { key: 'personal_record',     name: 'PR Breaker',          description: 'Set a personal record' },
    { key: 'road_warrior',        name: 'Road Warrior',        description: 'Cycled 50km total' },
  ]

  const badges: Record<string, string> = {}

  for (const b of badgeData) {
    try {
      const badge = await prisma.badge.upsert({
        where: { key: b.key },
        update: {},
        create: { key: b.key, name: b.name, description: b.description },
      })
      badges[b.key] = badge.id
    } catch (err) {
      console.error(`  ! Failed to create badge ${b.key}:`, err)
    }
  }

  console.log(`  ✓ ${Object.keys(badges).length} badges ready`)

  // ── REWARDS ───────────────────────────────────────────────────────────────────

  console.log('Creating rewards...')

  const rewardDataList = [
    { title: 'Free Training Session', description: 'Redeem for one free training session at any Garrincha center', pointsCost: 200, category: 'FREE_SESSION' as const, stock: 50 },
    { title: 'SportsPro 20% Discount', description: '20% off your next purchase at SportsPro KSA', pointsCost: 150, category: 'DISCOUNT' as const, stock: -1, sponsorId: sportsPro.id },
    { title: 'Garrincha Jersey', description: 'Official Garrincha Active branded jersey', pointsCost: 500, category: 'MERCHANDISE' as const, stock: 20 },
    { title: 'Hydra Energy Drink Pack', description: 'A pack of 6 Hydra Energy sports drinks', pointsCost: 100, category: 'FOOD_DRINK' as const, stock: 100, sponsorId: hydra.id },
    { title: 'Tournament Entry Fee Waiver', description: 'Waive the entry fee for one Garrincha tournament', pointsCost: 300, category: 'TOURNAMENT_ENTRY' as const, stock: 30 },
    { title: 'VIP Match Day Experience', description: 'VIP seats, lounge access and meet the players', pointsCost: 800, category: 'VIP_ACCESS' as const, stock: 10 },
    { title: 'Sponsor Voucher Pack', description: 'Bundle of exclusive SportsPro KSA vouchers', pointsCost: 250, category: 'SPONSOR_VOUCHER' as const, stock: 40, sponsorId: sportsPro.id },
    { title: 'Center Locker Access', description: 'Unlimited locker access at your home center for one month', pointsCost: 180, category: 'FREE_SESSION' as const, stock: -1 },
  ]

  const rewardIds: string[] = []

  for (const r of rewardDataList) {
    try {
      const existing = await prisma.reward.findFirst({ where: { title: r.title } })
      if (existing) { rewardIds.push(existing.id); continue }
      const reward = await prisma.reward.create({ data: r })
      rewardIds.push(reward.id)
    } catch (err) {
      console.error(`  ! Failed to create reward "${r.title}":`, err)
    }
  }

  console.log(`  ✓ ${rewardIds.length} rewards ready`)

  // ── CHALLENGES ────────────────────────────────────────────────────────────────

  console.log('Creating challenges...')

  const challengeData = [
    { title: 'Run 20km This Month',         description: 'Accumulate 20km of running distance this month',      type: 'DISTANCE' as ChallengeType,                    targetValue: 20,  pointsReward: 300 },
    { title: '5 Football Trainings',         description: 'Attend 5 football training sessions',                  type: 'FOOTBALL_TRAINING_ATTENDANCE' as ChallengeType, targetValue: 5,   pointsReward: 200 },
    { title: '300 Active Minutes',           description: 'Log 300 minutes of activity',                          type: 'ACTIVE_MINUTES' as ChallengeType,               targetValue: 300, pointsReward: 250 },
    { title: 'Center Distance Battle',       description: 'Combined center distance — reach 50km collectively',   type: 'CENTER_VS_CENTER' as ChallengeType,             targetValue: 50,  pointsReward: 500, centerId: hub.id },
    { title: 'Weekend Warrior: 10 Activities', description: 'Log 10 activities over the challenge period',        type: 'ACTIVITY_COUNT' as ChallengeType,               targetValue: 10,  pointsReward: 400 },
    { title: '7-Day Streak',                 description: 'Log an activity every day for 7 consecutive days',     type: 'STREAK' as ChallengeType,                       targetValue: 7,   pointsReward: 350 },
    { title: 'Cycle 50km',                   description: 'Cycle a total of 50km this month',                     type: 'DISTANCE' as ChallengeType,                    targetValue: 50,  pointsReward: 280 },
    { title: 'Segment Explorer',             description: 'Complete 3 different segments',                         type: 'SEGMENT_EFFORTS' as ChallengeType,              targetValue: 3,   pointsReward: 320 },
  ]

  const challengeIds: string[] = []

  for (const c of challengeData) {
    try {
      const existing = await prisma.challenge.findFirst({ where: { title: c.title } })
      if (existing) { challengeIds.push(existing.id); continue }
      const challenge = await prisma.challenge.create({
        data: { ...c, startDate: monthsAgo(1), endDate: monthsFromNow(1) },
      })
      challengeIds.push(challenge.id)
    } catch (err) {
      console.error(`  ! Failed to create challenge "${c.title}":`, err)
    }
  }

  console.log(`  ✓ ${challengeIds.length} challenges ready`)

  // ── EVENTS ────────────────────────────────────────────────────────────────────

  console.log('Creating events...')

  const eventData = [
    { title: '5-a-Side Football Cup',    description: 'Competitive 5-a-side football tournament',          type: 'TOURNAMENT' as EventType,       pointsReward: 100, centerId: hub.id,     isTournament: true,  capacity: 64, startOffset: 5,  endOffset: 6 },
    { title: 'Morning Run Club',          description: 'Weekly morning run open to all fitness levels',     type: 'TRAINING_SESSION' as EventType, pointsReward: 30,  centerId: dome.id,    isTournament: false, capacity: 30, startOffset: 10, endOffset: 10 },
    { title: 'Cycling Century Challenge', description: 'Community cycling event targeting 100km total',     type: 'COMMUNITY_EVENT' as EventType,  pointsReward: 60,  centerId: academy.id, isTournament: false, capacity: 50, startOffset: 14, endOffset: 15 },
    { title: 'Garrincha Summer League',   description: 'Season-long football league across all centers',    type: 'LEAGUE' as EventType,           pointsReward: 80,  centerId: hub.id,     isTournament: false, capacity: 120, startOffset: 7, endOffset: 28 },
    { title: 'Youth Football Camp',       description: 'Intensive 3-day football camp for youth players',   type: 'CAMP' as EventType,             pointsReward: 50,  centerId: dome.id,    isTournament: false, capacity: 40, startOffset: 20, endOffset: 23 },
    { title: 'Triathlon Prep Workshop',   description: 'Multi-sport training workshop covering swim/bike/run', type: 'TRAINING_SESSION' as EventType, pointsReward: 45, centerId: academy.id, isTournament: false, capacity: 25, startOffset: 30, endOffset: 30 },
  ]

  const eventIds: string[] = []

  for (const e of eventData) {
    try {
      const existing = await prisma.event.findFirst({ where: { title: e.title } })
      if (existing) { eventIds.push(existing.id); continue }
      const { startOffset, endOffset, ...rest } = e
      const event = await prisma.event.create({
        data: {
          ...rest,
          status: 'PUBLISHED',
          location: rest.centerId === hub.id ? 'King Fahd Road, Riyadh' : rest.centerId === dome.id ? 'Corniche Road, Jeddah' : 'Dhahran Street, Dammam',
          startDate: daysFromNow(startOffset),
          endDate: daysFromNow(endOffset),
        },
      })
      eventIds.push(event.id)
    } catch (err) {
      console.error(`  ! Failed to create event "${e.title}":`, err)
    }
  }

  console.log(`  ✓ ${eventIds.length} events ready`)

  // ── ACTIVITIES ────────────────────────────────────────────────────────────────

  console.log('Creating 40+ activities...')

  type ActivitySeed = {
    userIndex: number
    title: string
    type: ActivityType
    daysAgoOffset: number
    durationMinutes: number
    distanceKm?: number
    description?: string
    effortLevel?: number
  }

  // User indices: 0=demo, 1..30=seedPlayers[0..29]
  const getUserId = (idx: number): string => {
    if (idx === 0) return demoPlayer.id
    return seedPlayers[idx - 1]?.id ?? demoPlayer.id
  }

  const activitySeeds: ActivitySeed[] = [
    // Demo player
    { userIndex: 0,  title: 'Morning 5K Run',                type: 'RUN',                daysAgoOffset: 2,  durationMinutes: 28, distanceKm: 5.0,  description: 'Quick morning run around the park', effortLevel: 5 },
    { userIndex: 0,  title: 'Evening Run',                   type: 'RUN',                daysAgoOffset: 5,  durationMinutes: 35, distanceKm: 6.2,  description: 'Easy evening run to unwind', effortLevel: 4 },
    { userIndex: 0,  title: 'Cycling to Hub',                type: 'CYCLING',            daysAgoOffset: 3,  durationMinutes: 35, distanceKm: 12.0, description: 'Commute by bike to the center', effortLevel: 3 },
    { userIndex: 0,  title: 'Ball Control Drills',           type: 'FOOTBALL_TRAINING',  daysAgoOffset: 4,  durationMinutes: 60, description: 'Technical ball control session', effortLevel: 6 },
    { userIndex: 0,  title: 'Tactical Passing Session',      type: 'FOOTBALL_TRAINING',  daysAgoOffset: 9,  durationMinutes: 75, description: 'Team passing patterns and pressing', effortLevel: 7 },
    { userIndex: 0,  title: '5-a-Side Match vs. Ballers',   type: 'FOOTBALL_MATCH',     daysAgoOffset: 6,  durationMinutes: 50, description: 'Friendly 5-a-side game', effortLevel: 8 },
    { userIndex: 0,  title: 'Strength Training',             type: 'FITNESS',            daysAgoOffset: 7,  durationMinutes: 50, description: 'Upper body strength session', effortLevel: 6 },
    { userIndex: 0,  title: 'Long Run Sunday',               type: 'RUN',                daysAgoOffset: 12, durationMinutes: 52, distanceKm: 9.5,  description: 'Long slow distance run', effortLevel: 6 },
    { userIndex: 0,  title: 'Morning Walk',                  type: 'WALK',               daysAgoOffset: 1,  durationMinutes: 45, distanceKm: 3.5,  description: 'Relaxed morning walk', effortLevel: 2 },
    // Carlos Silva (1)
    { userIndex: 1,  title: 'Carlos 10K Run',                type: 'RUN',                daysAgoOffset: 3,  durationMinutes: 48, distanceKm: 10.0, description: 'Personal best attempt', effortLevel: 9 },
    { userIndex: 1,  title: 'Carlos Track Session',          type: 'RUN',                daysAgoOffset: 8,  durationMinutes: 35, distanceKm: 6.0,  effortLevel: 7 },
    { userIndex: 1,  title: 'Carlos Strength',               type: 'FITNESS',            daysAgoOffset: 10, durationMinutes: 45, effortLevel: 5 },
    // Aisha Rahman (2)
    { userIndex: 2,  title: 'Aisha Long Run',                type: 'RUN',                daysAgoOffset: 5,  durationMinutes: 52, distanceKm: 9.5,  description: 'Sunday long run', effortLevel: 7 },
    { userIndex: 2,  title: 'Aisha Football Training',       type: 'FOOTBALL_TRAINING',  daysAgoOffset: 7,  durationMinutes: 60, description: 'Goalkeeper training session', effortLevel: 8 },
    { userIndex: 2,  title: 'Aisha Cycling',                 type: 'CYCLING',            daysAgoOffset: 12, durationMinutes: 60, distanceKm: 20.0, effortLevel: 6 },
    // Pedro Martinez (3)
    { userIndex: 3,  title: 'Pedro Sprint Intervals',        type: 'RUN',                daysAgoOffset: 2,  durationMinutes: 40, distanceKm: 7.0,  description: 'High intensity sprint intervals', effortLevel: 9 },
    { userIndex: 3,  title: 'Pedro Match Day',               type: 'FOOTBALL_MATCH',     daysAgoOffset: 10, durationMinutes: 90, description: 'Center league match', effortLevel: 9 },
    { userIndex: 3,  title: 'Pedro Recovery Walk',           type: 'WALK',               daysAgoOffset: 11, durationMinutes: 30, distanceKm: 2.5, effortLevel: 1 },
    // Fatima Al-Harbi (4)
    { userIndex: 4,  title: 'Fatima Park Run',               type: 'RUN',                daysAgoOffset: 4,  durationMinutes: 30, distanceKm: 5.0,  description: 'Community park run', effortLevel: 6 },
    { userIndex: 4,  title: 'Fatima Yoga',                   type: 'FITNESS',            daysAgoOffset: 6,  durationMinutes: 50, description: 'Yoga and flexibility session', effortLevel: 3 },
    // Lucas Oliveira (5)
    { userIndex: 5,  title: 'Lucas Weekend Ride',            type: 'CYCLING',            daysAgoOffset: 3,  durationMinutes: 90, distanceKm: 32.0, description: 'Long weekend cycling route', effortLevel: 7 },
    { userIndex: 5,  title: 'Lucas Evening Run',             type: 'RUN',                daysAgoOffset: 7,  durationMinutes: 25, distanceKm: 4.5,  effortLevel: 5 },
    // Zaid Al-Mutairi (6)
    { userIndex: 6,  title: 'Zaid Training Blitz',           type: 'FOOTBALL_TRAINING',  daysAgoOffset: 2,  durationMinutes: 90, description: 'Intense training session', effortLevel: 9 },
    { userIndex: 6,  title: 'Zaid 5K PB Attempt',            type: 'RUN',                daysAgoOffset: 5,  durationMinutes: 26, distanceKm: 5.0,  description: 'Going for a personal best!', effortLevel: 10 },
    // Ana Souza (7)
    { userIndex: 7,  title: 'Ana Morning Run',               type: 'RUN',                daysAgoOffset: 1,  durationMinutes: 32, distanceKm: 5.8,  effortLevel: 6 },
    { userIndex: 7,  title: 'Ana Shooting Drills',           type: 'FOOTBALL_TRAINING',  daysAgoOffset: 4,  durationMinutes: 70, description: 'Shooting and finishing practice', effortLevel: 7 },
    // Omar Al-Rashidi (8)
    { userIndex: 8,  title: 'Omar Cycling Sprint',           type: 'CYCLING',            daysAgoOffset: 6,  durationMinutes: 50, distanceKm: 18.5, description: 'High intensity cycling', effortLevel: 8 },
    { userIndex: 8,  title: 'Omar HIIT Session',             type: 'FITNESS',            daysAgoOffset: 9,  durationMinutes: 30, description: '30-min HIIT workout', effortLevel: 9 },
    // Gabriel Santos (9)
    { userIndex: 9,  title: 'Gabriel Long Run',              type: 'RUN',                daysAgoOffset: 4,  durationMinutes: 60, distanceKm: 11.0, description: 'Half-marathon prep', effortLevel: 7 },
    { userIndex: 9,  title: 'Gabriel Match',                 type: 'FOOTBALL_MATCH',     daysAgoOffset: 8,  durationMinutes: 90, description: 'Weekend league match', effortLevel: 8 },
    // Sara Al-Zahrani (10)
    { userIndex: 10, title: 'Sara Evening Walk',             type: 'WALK',               daysAgoOffset: 2,  durationMinutes: 60, distanceKm: 4.8, effortLevel: 2 },
    { userIndex: 10, title: 'Sara Gym Session',              type: 'FITNESS',            daysAgoOffset: 5,  durationMinutes: 45, effortLevel: 6 },
    // Rafael Costa (11)
    { userIndex: 11, title: 'Rafael 5K Tempo',               type: 'RUN',                daysAgoOffset: 3,  durationMinutes: 23, distanceKm: 5.0,  description: 'Tempo pace 5K', effortLevel: 8 },
    { userIndex: 11, title: 'Rafael Cycling Commute',        type: 'CYCLING',            daysAgoOffset: 6,  durationMinutes: 30, distanceKm: 10.0, effortLevel: 4 },
    // Khalid Al-Otaibi (12)
    { userIndex: 12, title: 'Khalid Football Match',         type: 'FOOTBALL_MATCH',     daysAgoOffset: 5,  durationMinutes: 90, description: 'Division 2 league match', effortLevel: 9 },
    { userIndex: 12, title: 'Khalid Recovery Run',           type: 'RUN',                daysAgoOffset: 7,  durationMinutes: 35, distanceKm: 6.0,  effortLevel: 4 },
    // Juliana Lima (13)
    { userIndex: 13, title: 'Juliana Morning Run',           type: 'RUN',                daysAgoOffset: 2,  durationMinutes: 40, distanceKm: 7.2,  effortLevel: 6 },
    { userIndex: 13, title: 'Juliana Yoga Flow',             type: 'FITNESS',            daysAgoOffset: 4,  durationMinutes: 55, effortLevel: 3 },
    // Mohammed Al-Harbi (21)
    { userIndex: 21, title: 'Mohammed Club Run',             type: 'RUN',                daysAgoOffset: 3,  durationMinutes: 38, distanceKm: 7.0,  effortLevel: 6 },
    { userIndex: 21, title: 'Mohammed Football Practice',   type: 'FOOTBALL_TRAINING',  daysAgoOffset: 6,  durationMinutes: 75, effortLevel: 7 },
    // Layla Al-Shammari (22)
    { userIndex: 22, title: 'Layla Beach Run',               type: 'RUN',                daysAgoOffset: 2,  durationMinutes: 30, distanceKm: 5.5,  description: 'Corniche beach run', effortLevel: 5 },
    { userIndex: 22, title: 'Layla Cycle Explore',           type: 'CYCLING',            daysAgoOffset: 7,  durationMinutes: 75, distanceKm: 28.0, effortLevel: 7 },
    // Tariq Al-Ghamdi (25)
    { userIndex: 25, title: 'Tariq Early Run',               type: 'RUN',                daysAgoOffset: 1,  durationMinutes: 45, distanceKm: 8.5,  effortLevel: 7 },
    // Bader Al-Mutairi (27)
    { userIndex: 27, title: 'Bader Match Day',               type: 'FOOTBALL_MATCH',     daysAgoOffset: 4,  durationMinutes: 90, effortLevel: 9 },
    { userIndex: 27, title: 'Bader Recovery Ride',           type: 'CYCLING',            daysAgoOffset: 5,  durationMinutes: 40, distanceKm: 14.0, effortLevel: 3 },
  ]

  const createdActivities: Array<{ id: string; userId: string; pointsEarned: number; type: ActivityType; distanceKm?: number; paceMinPerKm?: number }> = []

  for (const a of activitySeeds) {
    try {
      const userId = getUserId(a.userIndex)
      const existing = await prisma.activity.findFirst({ where: { userId, title: a.title } })
      if (existing) {
        createdActivities.push({ id: existing.id, userId: existing.userId, pointsEarned: existing.pointsEarned, type: existing.type, distanceKm: existing.distanceKm ?? undefined, paceMinPerKm: existing.paceMinPerKm ?? undefined })
        continue
      }

      const pts = calcPoints(a.type, a.durationMinutes, a.distanceKm)
      const startedAt = daysAgo(a.daysAgoOffset)
      startedAt.setHours(6 + (a.userIndex % 8), 0, 0, 0)
      const endedAt = new Date(startedAt.getTime() + a.durationMinutes * 60 * 1000)
      const pace = a.distanceKm ? a.durationMinutes / a.distanceKm : undefined
      const speed = a.distanceKm ? (a.distanceKm / (a.durationMinutes / 60)) : undefined

      const activity = await prisma.activity.create({
        data: {
          userId,
          title: a.title,
          type: a.type,
          startedAt,
          endedAt,
          durationMinutes: a.durationMinutes,
          distanceKm: a.distanceKm,
          paceMinPerKm: pace,
          speedKmH: speed,
          caloriesBurned: Math.floor(a.durationMinutes * 6.5),
          elevationGainM: a.distanceKm ? Math.round(a.distanceKm * 8) : undefined,
          effortLevel: a.effortLevel,
          description: a.description,
          visibility: 'PUBLIC',
          status: 'APPROVED',
          pointsEarned: pts,
        },
      })

      createdActivities.push({ id: activity.id, userId, pointsEarned: pts, type: a.type, distanceKm: a.distanceKm, paceMinPerKm: pace })

      // Route points for RUN/WALK activities
      if ((a.type === 'RUN' || a.type === 'WALK') && a.distanceKm) {
        const baseLat = 24.7136
        const baseLng = 46.6753
        const pointCount = 8
        for (let i = 0; i < pointCount; i++) {
          await prisma.activityRoutePoint.create({
            data: {
              activityId: activity.id,
              latitude: baseLat + (i * 0.001),
              longitude: baseLng + (i * 0.0012),
              altitude: 620 + Math.round(Math.random() * 15),
              speed: speed ?? 8,
              timestamp: new Date(startedAt.getTime() + (i * (a.durationMinutes / pointCount) * 60 * 1000)),
              sequence: i,
            },
          })
        }
      }

      // Splits for RUN activities with distance
      if (a.type === 'RUN' && a.distanceKm && pace) {
        const splitsData = generateSplitsData(activity.id, a.distanceKm, pace)
        for (const split of splitsData) {
          try {
            await prisma.activitySplit.create({ data: split })
          } catch (_) {}
        }
      }
    } catch (err) {
      console.error(`  ! Failed to create activity "${a.title}":`, err)
    }
  }

  console.log(`  ✓ ${createdActivities.length} activities ready`)

  // ── SEGMENTS ──────────────────────────────────────────────────────────────────

  console.log('Creating segments...')

  const segmentData = [
    { title: 'King Fahd Sprint',     description: 'Flat 1km sprint along King Fahd Road',           type: 'RUN' as ActivityType,      distanceKm: 1.0,  elevationM: 5,   difficulty: 'EASY',     centerId: hub.id },
    { title: 'Corniche 5K Loop',     description: 'Scenic 5km loop along the Jeddah Corniche',      type: 'RUN' as ActivityType,      distanceKm: 5.0,  elevationM: 20,  difficulty: 'MODERATE', centerId: dome.id },
    { title: 'Riyadh Hills Climb',   description: 'Challenging hill climb route in North Riyadh',    type: 'CYCLING' as ActivityType,  distanceKm: 8.0,  elevationM: 180, difficulty: 'HARD',     centerId: hub.id },
    { title: 'Dammam Coastal Ride',  description: 'Flat coastal cycling route in the East Province', type: 'CYCLING' as ActivityType,  distanceKm: 12.0, elevationM: 30,  difficulty: 'MODERATE', centerId: academy.id },
    { title: 'Park Interval Lane',   description: 'Short flat interval lane inside the city park',   type: 'RUN' as ActivityType,      distanceKm: 0.8,  elevationM: 2,   difficulty: 'EASY',     centerId: hub.id },
    { title: 'Mountain Trail Run',   description: 'Tough trail run through rocky terrain',            type: 'RUN' as ActivityType,      distanceKm: 3.5,  elevationM: 250, difficulty: 'HARD',     centerId: academy.id },
    { title: 'Stadium Sprint',       description: 'Short explosive sprint on stadium track',          type: 'FOOTBALL_TRAINING' as ActivityType, distanceKm: 0.4, elevationM: 0, difficulty: 'EASY', centerId: hub.id },
    { title: 'Jeddah Harbor Loop',   description: 'Long cycling loop around Jeddah harbor',           type: 'CYCLING' as ActivityType,  distanceKm: 15.0, elevationM: 50,  difficulty: 'EXTREME',  centerId: dome.id },
  ]

  const createdSegments: Array<{ id: string; title: string; distanceKm: number }> = []

  for (const s of segmentData) {
    try {
      const existing = await prisma.segment.findFirst({ where: { title: s.title } })
      if (existing) { createdSegments.push({ id: existing.id, title: existing.title, distanceKm: existing.distanceKm }); continue }
      const segment = await prisma.segment.create({
        data: { ...s, createdById: platformAdmin.id, isActive: true },
      })
      createdSegments.push({ id: segment.id, title: segment.title, distanceKm: segment.distanceKm })
    } catch (err) {
      console.error(`  ! Failed to create segment "${s.title}":`, err)
    }
  }

  console.log(`  ✓ ${createdSegments.length} segments ready`)

  // ── SEGMENT EFFORTS ───────────────────────────────────────────────────────────

  console.log('Creating segment efforts...')

  // Map segments to efforts
  const segEffortData: Array<{ segmentTitle: string; userIndex: number; elapsedSecs: number; daysAgoOffset: number }> = [
    // King Fahd Sprint (1km)
    { segmentTitle: 'King Fahd Sprint', userIndex: 0,  elapsedSecs: 285, daysAgoOffset: 2 },
    { segmentTitle: 'King Fahd Sprint', userIndex: 1,  elapsedSecs: 275, daysAgoOffset: 3 },
    { segmentTitle: 'King Fahd Sprint', userIndex: 3,  elapsedSecs: 262, daysAgoOffset: 2 },
    { segmentTitle: 'King Fahd Sprint', userIndex: 6,  elapsedSecs: 258, daysAgoOffset: 5 },
    { segmentTitle: 'King Fahd Sprint', userIndex: 12, elapsedSecs: 295, daysAgoOffset: 7 },
    // Corniche 5K Loop
    { segmentTitle: 'Corniche 5K Loop', userIndex: 2,  elapsedSecs: 1680, daysAgoOffset: 5 },
    { segmentTitle: 'Corniche 5K Loop', userIndex: 7,  elapsedSecs: 1740, daysAgoOffset: 1 },
    { segmentTitle: 'Corniche 5K Loop', userIndex: 22, elapsedSecs: 1620, daysAgoOffset: 2 },
    { segmentTitle: 'Corniche 5K Loop', userIndex: 11, elapsedSecs: 1380, daysAgoOffset: 3 },
    // Riyadh Hills Climb
    { segmentTitle: 'Riyadh Hills Climb', userIndex: 0,  elapsedSecs: 1800, daysAgoOffset: 3 },
    { segmentTitle: 'Riyadh Hills Climb', userIndex: 5,  elapsedSecs: 1650, daysAgoOffset: 3 },
    { segmentTitle: 'Riyadh Hills Climb', userIndex: 8,  elapsedSecs: 1920, daysAgoOffset: 6 },
    // Dammam Coastal Ride
    { segmentTitle: 'Dammam Coastal Ride', userIndex: 4,  elapsedSecs: 2100, daysAgoOffset: 4 },
    { segmentTitle: 'Dammam Coastal Ride', userIndex: 9,  elapsedSecs: 1980, daysAgoOffset: 4 },
    { segmentTitle: 'Dammam Coastal Ride', userIndex: 22, elapsedSecs: 2280, daysAgoOffset: 7 },
    // Park Interval Lane
    { segmentTitle: 'Park Interval Lane', userIndex: 0,  elapsedSecs: 215, daysAgoOffset: 2 },
    { segmentTitle: 'Park Interval Lane', userIndex: 1,  elapsedSecs: 205, daysAgoOffset: 3 },
    { segmentTitle: 'Park Interval Lane', userIndex: 6,  elapsedSecs: 198, daysAgoOffset: 5 },
    { segmentTitle: 'Park Interval Lane', userIndex: 25, elapsedSecs: 225, daysAgoOffset: 1 },
    // Mountain Trail Run
    { segmentTitle: 'Mountain Trail Run', userIndex: 4,  elapsedSecs: 1260, daysAgoOffset: 4 },
    { segmentTitle: 'Mountain Trail Run', userIndex: 10, elapsedSecs: 1380, daysAgoOffset: 2 },
    // Stadium Sprint
    { segmentTitle: 'Stadium Sprint', userIndex: 0,  elapsedSecs: 72,  daysAgoOffset: 4 },
    { segmentTitle: 'Stadium Sprint', userIndex: 3,  elapsedSecs: 68,  daysAgoOffset: 10 },
    { segmentTitle: 'Stadium Sprint', userIndex: 6,  elapsedSecs: 65,  daysAgoOffset: 2 },
    { segmentTitle: 'Stadium Sprint', userIndex: 12, elapsedSecs: 75,  daysAgoOffset: 5 },
    // Jeddah Harbor Loop
    { segmentTitle: 'Jeddah Harbor Loop', userIndex: 5,  elapsedSecs: 3000, daysAgoOffset: 3 },
    { segmentTitle: 'Jeddah Harbor Loop', userIndex: 8,  elapsedSecs: 3240, daysAgoOffset: 6 },
    { segmentTitle: 'Jeddah Harbor Loop', userIndex: 22, elapsedSecs: 2820, daysAgoOffset: 7 },
  ]

  let effortsCreated = 0

  for (const e of segEffortData) {
    try {
      const seg = createdSegments.find(s => s.title === e.segmentTitle)
      if (!seg) continue
      const userId = getUserId(e.userIndex)
      const existing = await prisma.segmentEffort.findFirst({ where: { segmentId: seg.id, userId } })
      if (existing) { effortsCreated++; continue }
      await prisma.segmentEffort.create({
        data: {
          segmentId: seg.id,
          userId,
          elapsedSecs: e.elapsedSecs,
          recordedAt: daysAgo(e.daysAgoOffset),
        },
      })
      effortsCreated++
    } catch (err) {
      console.error(`  ! Failed to create segment effort:`, err)
    }
  }

  // Rank efforts per segment
  for (const seg of createdSegments) {
    try {
      const efforts = await prisma.segmentEffort.findMany({
        where: { segmentId: seg.id },
        orderBy: { elapsedSecs: 'asc' },
      })
      for (let i = 0; i < efforts.length; i++) {
        await prisma.segmentEffort.update({ where: { id: efforts[i].id }, data: { rank: i + 1 } })
      }
    } catch (_) {}
  }

  console.log(`  ✓ ${effortsCreated} segment efforts ready`)

  // ── ROUTES ────────────────────────────────────────────────────────────────────

  console.log('Creating routes and route points...')

  const routeData = [
    {
      title: 'Morning Run Circuit',
      description: 'A perfect 5.2km loop starting from Garrincha FC Hub through the park and back',
      type: 'RUN' as ActivityType, distanceKm: 5.2, elevationM: 45, difficulty: 'EASY', centerId: hub.id, isPublic: true,
      baseLat: 24.7136, baseLng: 46.6753,
    },
    {
      title: 'Coastal Ride Path',
      description: 'Scenic 18.5km cycling path along the Jeddah Corniche with sea views',
      type: 'CYCLING' as ActivityType, distanceKm: 18.5, elevationM: 80, difficulty: 'MODERATE', centerId: dome.id, isPublic: true,
      baseLat: 21.4858, baseLng: 39.1925,
    },
    {
      title: 'Academy Cross-Country',
      description: 'Challenging 7.8km trail route used for cross-country training at the academy',
      type: 'RUN' as ActivityType, distanceKm: 7.8, elevationM: 210, difficulty: 'HARD', centerId: academy.id, isPublic: true,
      baseLat: 26.3927, baseLng: 50.1518,
    },
    {
      title: 'City Loop Ride',
      description: 'Urban cycling loop around Riyadh city center covering 25km',
      type: 'CYCLING' as ActivityType, distanceKm: 25.0, elevationM: 120, difficulty: 'MODERATE', centerId: hub.id, isPublic: true,
      baseLat: 24.6877, baseLng: 46.7219,
    },
  ]

  let routesCreated = 0

  for (const r of routeData) {
    try {
      const existing = await prisma.route.findFirst({ where: { title: r.title } })
      if (existing) { routesCreated++; continue }

      const { baseLat, baseLng, ...routeFields } = r
      const route = await prisma.route.create({
        data: { ...routeFields, createdById: centerAdmin.id },
      })

      // Route points (10-12 per route)
      const pointCount = 10
      for (let i = 0; i < pointCount; i++) {
        const angle = (i / pointCount) * 2 * Math.PI
        await prisma.routePoint.create({
          data: {
            routeId: route.id,
            sequence: i,
            lat: baseLat + Math.sin(angle) * 0.015,
            lng: baseLng + Math.cos(angle) * 0.015,
            elevM: 620 + Math.round(Math.sin(angle * 2) * 30),
          },
        })
      }

      routesCreated++
    } catch (err) {
      console.error(`  ! Failed to create route "${r.title}":`, err)
    }
  }

  console.log(`  ✓ ${routesCreated} routes ready`)

  // ── PERSONAL RECORDS ──────────────────────────────────────────────────────────

  console.log('Creating personal records...')

  const prData: Array<{ userIndex: number; type: string; value: number; daysAgoOffset: number }> = [
    // Demo Player
    { userIndex: 0,  type: 'FASTEST_5KM',        value: 1680, daysAgoOffset: 5 },
    { userIndex: 0,  type: 'LONGEST_RUN',         value: 9.5,  daysAgoOffset: 12 },
    { userIndex: 0,  type: 'MOST_ACTIVITIES_WEEK', value: 5,   daysAgoOffset: 7 },
    // Carlos Silva (1)
    { userIndex: 1,  type: 'FASTEST_1KM',         value: 285,  daysAgoOffset: 3 },
    { userIndex: 1,  type: 'FASTEST_5KM',         value: 1650, daysAgoOffset: 3 },
    { userIndex: 1,  type: 'LONGEST_RUN',         value: 10.0, daysAgoOffset: 3 },
    // Aisha Rahman (2)
    { userIndex: 2,  type: 'LONGEST_RUN',         value: 9.5,  daysAgoOffset: 5 },
    { userIndex: 2,  type: 'FASTEST_10KM',        value: 3600, daysAgoOffset: 5 },
    // Pedro Martinez (3)
    { userIndex: 3,  type: 'FASTEST_5KM',         value: 1560, daysAgoOffset: 2 },
    { userIndex: 3,  type: 'FASTEST_1KM',         value: 262,  daysAgoOffset: 2 },
    // Zaid (6)
    { userIndex: 6,  type: 'FASTEST_5KM',         value: 1560, daysAgoOffset: 5 },
    { userIndex: 6,  type: 'MOST_ACTIVITIES_WEEK', value: 7,   daysAgoOffset: 2 },
    // Gabriel (9)
    { userIndex: 9,  type: 'LONGEST_RUN',         value: 11.0, daysAgoOffset: 4 },
    { userIndex: 9,  type: 'FASTEST_10KM',        value: 3300, daysAgoOffset: 4 },
    // Rafael (11)
    { userIndex: 11, type: 'FASTEST_5KM',         value: 1380, daysAgoOffset: 3 },
    { userIndex: 11, type: 'FASTEST_1KM',         value: 258,  daysAgoOffset: 3 },
    // Lucas (5) - cycling
    { userIndex: 5,  type: 'LONGEST_RIDE',        value: 32.0, daysAgoOffset: 3 },
    // Tariq (25)
    { userIndex: 25, type: 'LONGEST_RUN',         value: 8.5,  daysAgoOffset: 1 },
  ]

  let prsCreated = 0

  for (const pr of prData) {
    try {
      const userId = getUserId(pr.userIndex)
      await prisma.personalRecord.upsert({
        where: { userId_type: { userId, type: pr.type } },
        update: { value: pr.value, recordedAt: daysAgo(pr.daysAgoOffset) },
        create: {
          userId,
          type: pr.type,
          value: pr.value,
          recordedAt: daysAgo(pr.daysAgoOffset),
        },
      })
      prsCreated++
    } catch (err) {
      console.error(`  ! Failed to create PR:`, err)
    }
  }

  console.log(`  ✓ ${prsCreated} personal records ready`)

  // ── FEED POSTS FOR ACTIVITIES ─────────────────────────────────────────────────

  console.log('Creating feed posts...')

  let feedPostsCreated = 0

  for (const act of createdActivities) {
    try {
      const existing = await prisma.feedPost.findFirst({ where: { activityId: act.id } })
      if (existing) { feedPostsCreated++; continue }
      await prisma.feedPost.create({
        data: {
          userId: act.userId,
          type: 'ACTIVITY',
          content: `Just completed an activity and earned ${act.pointsEarned} points!`,
          visibility: 'PUBLIC',
          moderationStatus: 'VISIBLE',
          activityId: act.id,
        },
      })
      feedPostsCreated++
    } catch (err) {
      console.error(`  ! Failed to create feed post:`, err)
    }
  }

  console.log(`  ✓ ${feedPostsCreated} feed posts ready`)

  // ── POINTS LEDGER & PROFILE TOTALS ────────────────────────────────────────────

  console.log('Updating player profiles and points ledger...')

  const activityDetails = await prisma.activity.findMany({
    where: { id: { in: createdActivities.map(a => a.id) } },
    select: { id: true, userId: true, pointsEarned: true, distanceKm: true, durationMinutes: true },
  })

  const userStatsMap: Record<string, { points: number; activities: number; distance: number; minutes: number }> = {}
  for (const a of activityDetails) {
    if (!userStatsMap[a.userId]) userStatsMap[a.userId] = { points: 0, activities: 0, distance: 0, minutes: 0 }
    userStatsMap[a.userId].points += a.pointsEarned
    userStatsMap[a.userId].activities += 1
    userStatsMap[a.userId].distance += a.distanceKm ?? 0
    userStatsMap[a.userId].minutes += a.durationMinutes
  }

  let ledgerCreated = 0

  for (const [userId, stats] of Object.entries(userStatsMap)) {
    try {
      const existingLedger = await prisma.pointsLedger.findFirst({ where: { userId, sourceType: 'ACTIVITY' } })
      if (!existingLedger) {
        await prisma.pointsLedger.create({
          data: { userId, sourceType: 'ACTIVITY', points: stats.points, reason: `Aggregate points from ${stats.activities} seeded activities` },
        })
        ledgerCreated++
      }

      const profile = await prisma.playerProfile.findUnique({ where: { userId } })
      if (profile) {
        const level = levelFromPoints(profile.totalPoints + (existingLedger ? 0 : stats.points))
        await prisma.playerProfile.update({
          where: { userId },
          data: {
            totalPoints: { increment: existingLedger ? 0 : stats.points },
            lifetimePoints: { increment: existingLedger ? 0 : stats.points },
            totalActivities: { increment: existingLedger ? 0 : stats.activities },
            totalDistance: { increment: existingLedger ? 0 : stats.distance },
            totalMinutes: { increment: existingLedger ? 0 : stats.minutes },
            level,
            lastActivityAt: new Date(),
          },
        })
      }
    } catch (err) {
      console.error(`  ! Failed to update profile for ${userId}:`, err)
    }
  }

  console.log(`  ✓ ${ledgerCreated} ledger entries created, profiles updated`)

  // ── CHALLENGE PARTICIPANTS ────────────────────────────────────────────────────

  console.log('Creating challenge participants...')

  let challengeParticipantsCreated = 0
  const challengeJoiners = [demoPlayer, ...allPlayerUsers.slice(0, 15)]

  for (const player of challengeJoiners) {
    for (let ci = 0; ci < Math.min(3, challengeIds.length); ci++) {
      const challengeId = challengeIds[ci]
      if (!challengeId) continue
      try {
        const existing = await prisma.challengeParticipant.findFirst({ where: { challengeId, userId: player.id } })
        if (existing) { challengeParticipantsCreated++; continue }
        const progress = Math.random() * 80
        const isCompleted = progress >= 100
        await prisma.challengeParticipant.create({
          data: {
            challengeId,
            userId: player.id,
            progress,
            isCompleted,
            completedAt: isCompleted ? daysAgo(1) : null,
          },
        })
        challengeParticipantsCreated++
      } catch (_) {}
    }
  }

  console.log(`  ✓ ${challengeParticipantsCreated} challenge participants ready`)

  // ── TEAMS ─────────────────────────────────────────────────────────────────────

  console.log('Creating teams...')

  const riyadhRunners = await prisma.team.upsert({
    where: { name: 'Riyadh Runners' },
    update: {},
    create: { name: 'Riyadh Runners', centerId: hub.id, description: 'The premier running crew of Riyadh' },
  })

  const jeddahBallers = await prisma.team.upsert({
    where: { name: 'Jeddah Ballers' },
    update: {},
    create: { name: 'Jeddah Ballers', centerId: dome.id, description: 'Football squad representing Jeddah Sports Dome' },
  })

  const dammamFC = await prisma.team.upsert({
    where: { name: 'Dammam FC' },
    update: {},
    create: { name: 'Dammam FC', centerId: academy.id, description: 'East Province football club' },
  })

  const teamAssignments: Array<{ teamId: string; userId: string; role: TeamRole }> = [
    { teamId: riyadhRunners.id, userId: demoPlayer.id,      role: 'OWNER' },
    { teamId: riyadhRunners.id, userId: seedPlayers[0]?.id!, role: 'MEMBER' },
    { teamId: riyadhRunners.id, userId: seedPlayers[2]?.id!, role: 'ADMIN' },
    { teamId: riyadhRunners.id, userId: seedPlayers[5]?.id!, role: 'MEMBER' },
    { teamId: riyadhRunners.id, userId: seedPlayers[11]?.id!, role: 'MEMBER' },
    { teamId: riyadhRunners.id, userId: seedPlayers[20]?.id!, role: 'MEMBER' },
    { teamId: riyadhRunners.id, userId: seedPlayers[23]?.id!, role: 'MEMBER' },
    { teamId: jeddahBallers.id, userId: seedPlayers[1]?.id!, role: 'OWNER' },
    { teamId: jeddahBallers.id, userId: seedPlayers[4]?.id!, role: 'MEMBER' },
    { teamId: jeddahBallers.id, userId: seedPlayers[7]?.id!, role: 'MEMBER' },
    { teamId: jeddahBallers.id, userId: seedPlayers[13]?.id!, role: 'MEMBER' },
    { teamId: jeddahBallers.id, userId: seedPlayers[21]?.id!, role: 'MEMBER' },
    { teamId: jeddahBallers.id, userId: seedPlayers[24]?.id!, role: 'MEMBER' },
    { teamId: dammamFC.id,      userId: seedPlayers[3]?.id!, role: 'OWNER' },
    { teamId: dammamFC.id,      userId: seedPlayers[6]?.id!, role: 'MEMBER' },
    { teamId: dammamFC.id,      userId: seedPlayers[9]?.id!, role: 'MEMBER' },
    { teamId: dammamFC.id,      userId: seedPlayers[12]?.id!, role: 'MEMBER' },
    { teamId: dammamFC.id,      userId: seedPlayers[15]?.id!, role: 'MEMBER' },
    { teamId: dammamFC.id,      userId: seedPlayers[22]?.id!, role: 'MEMBER' },
  ]

  let teamMembersCreated = 0
  for (const ta of teamAssignments) {
    if (!ta.userId) continue
    try {
      await prisma.teamMember.upsert({
        where: { teamId_userId: { teamId: ta.teamId, userId: ta.userId } },
        update: {},
        create: ta,
      })
      teamMembersCreated++
    } catch (_) {}
  }

  console.log(`  ✓ 3 teams, ${teamMembersCreated} members`)

  // ── FOLLOW RELATIONSHIPS ──────────────────────────────────────────────────────

  console.log('Creating follow relationships...')

  const followPairs = [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
    [1, 0], [1, 3], [1, 9],
    [2, 0], [2, 7], [2, 11],
    [3, 1], [3, 5],
    [5, 0], [5, 3], [5, 8],
    [9, 1], [9, 6],
    [11, 0], [11, 1],
  ]

  let followsCreated = 0

  for (const [followerIdx, followingIdx] of followPairs) {
    try {
      const followerId = getUserId(followerIdx)
      const followingId = getUserId(followingIdx)
      await prisma.follow.upsert({
        where: { followerId_followingId: { followerId, followingId } },
        update: {},
        create: { followerId, followingId },
      })
      followsCreated++
    } catch (_) {}
  }

  console.log(`  ✓ ${followsCreated} follows ready`)

  // ── USER BADGES ───────────────────────────────────────────────────────────────

  console.log('Awarding badges...')

  const badgeAwards = [
    { userIndex: 0,  key: 'first_activity' },
    { userIndex: 0,  key: '5k_runner' },
    { userIndex: 0,  key: 'football_starter' },
    { userIndex: 0,  key: 'personal_record' },
    { userIndex: 1,  key: 'first_activity' },
    { userIndex: 1,  key: '5k_runner' },
    { userIndex: 1,  key: '10k_runner' },
    { userIndex: 1,  key: 'personal_record' },
    { userIndex: 2,  key: 'first_activity' },
    { userIndex: 2,  key: 'football_starter' },
    { userIndex: 3,  key: 'first_activity' },
    { userIndex: 3,  key: '5k_runner' },
    { userIndex: 3,  key: 'match_player' },
    { userIndex: 5,  key: 'first_activity' },
    { userIndex: 5,  key: 'road_warrior' },
    { userIndex: 6,  key: 'first_activity' },
    { userIndex: 6,  key: 'football_starter' },
    { userIndex: 6,  key: 'weekly_streak' },
    { userIndex: 9,  key: 'first_activity' },
    { userIndex: 9,  key: '10k_runner' },
    { userIndex: 11, key: 'first_activity' },
    { userIndex: 11, key: '5k_runner' },
    { userIndex: 11, key: 'personal_record' },
  ]

  let badgesAwarded = 0

  for (const award of badgeAwards) {
    try {
      const userId = getUserId(award.userIndex)
      const badgeId = badges[award.key]
      if (!badgeId) continue
      await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId, badgeId } },
        update: {},
        create: { userId, badgeId },
      })
      badgesAwarded++
    } catch (_) {}
  }

  console.log(`  ✓ ${badgesAwarded} badges awarded`)

  // ── SAVED ROUTES ──────────────────────────────────────────────────────────────

  console.log('Creating saved routes...')

  const routes = await prisma.route.findMany({ take: 4 })
  let savedRoutesCreated = 0

  const savedRoutePairs = [
    [0, 0], [0, 2],
    [1, 0], [1, 1],
    [5, 1], [5, 3],
    [9, 2],
    [11, 0],
  ]

  for (const [userIdx, routeIdx] of savedRoutePairs) {
    if (!routes[routeIdx]) continue
    try {
      const userId = getUserId(userIdx)
      await prisma.savedRoute.upsert({
        where: { userId_routeId: { userId, routeId: routes[routeIdx].id } },
        update: {},
        create: { userId, routeId: routes[routeIdx].id },
      })
      savedRoutesCreated++
    } catch (_) {}
  }

  console.log(`  ✓ ${savedRoutesCreated} saved routes ready`)

  // ── REWARD AUCTIONS ───────────────────────────────────────────────────────────

  const auctionRewardId = rewardIds[0]
  if (auctionRewardId) {
    const existingAuction = await prisma.rewardAuction.findFirst({ where: { rewardId: auctionRewardId } })
    if (!existingAuction) {
      const auction = await prisma.rewardAuction.create({
        data: {
          rewardId: auctionRewardId,
          startTime: daysAgo(1),
          endTime: daysFromNow(3),
          minBid: 50,
          isSettled: false,
        },
      })
      // Add a few bids
      const bidPlayers = seedPlayers.slice(0, 3)
      const bidAmounts = [75, 90, 120]
      for (let i = 0; i < bidPlayers.length; i++) {
        await prisma.auctionBid.upsert({
          where: { auctionId_userId: { auctionId: auction.id, userId: bidPlayers[i].id } },
          create: { auctionId: auction.id, userId: bidPlayers[i].id, points: bidAmounts[i] },
          update: { points: bidAmounts[i] },
        })
      }
    }
  }

  // ── DIRECT CHALLENGES (1v1) ───────────────────────────────────────────────────

  const dc1 = await prisma.directChallenge.findFirst({ where: { challengerId: seedPlayers[0]?.id } })
  if (!dc1 && seedPlayers.length >= 4) {
    await prisma.directChallenge.createMany({
      data: [
        {
          challengerId: seedPlayers[0].id,
          challengeeId: seedPlayers[1].id,
          type: DirectChallengeType.DISTANCE,
          targetValue: 50,
          endDate: daysFromNow(14),
          status: DirectChallengeStatus.ACTIVE,
          message: "Let's see who runs more this month!",
        },
        {
          challengerId: seedPlayers[2].id,
          challengeeId: seedPlayers[3].id,
          type: DirectChallengeType.ACTIVITY_COUNT,
          targetValue: 10,
          endDate: daysFromNow(7),
          status: DirectChallengeStatus.ACTIVE,
        },
      ],
    })
  }

  // ── SQUAD GOALS ───────────────────────────────────────────────────────────────

  const existingTeams = await prisma.team.findMany({ take: 2 })
  for (const team of existingTeams) {
    const existingGoal = await prisma.squadGoal.findFirst({ where: { teamId: team.id } })
    if (!existingGoal) {
      await prisma.squadGoal.create({
        data: {
          teamId: team.id,
          title: 'Team 100km Challenge',
          type: DirectChallengeType.DISTANCE,
          targetValue: 100,
          currentValue: Math.random() * 60,
          startDate: daysAgo(7),
          endDate: daysFromNow(23),
          isActive: true,
        },
      })
    }
  }

  // ── STREAK SHIELDS + CARBON SAVINGS ──────────────────────────────────────────

  for (let i = 0; i < Math.min(5, seedPlayers.length); i++) {
    await prisma.playerProfile.updateMany({
      where: { userId: seedPlayers[i].id, streakShields: 0 },
      data: { streakShields: Math.floor(Math.random() * 3), carbonSavedKg: parseFloat((Math.random() * 15).toFixed(2)) },
    })
  }

  // ── APP SETTINGS ──────────────────────────────────────────────────────────────

  const settings = [
    { key: 'platform_name', value: 'Garrincha Active' },
    { key: 'max_daily_points', value: '200' },
    { key: 'points_version', value: '1.0' },
  ]

  for (const s of settings) {
    await prisma.appSetting.upsert({ where: { key: s.key }, update: { value: s.value }, create: s })
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────────────

  console.log('\n=== Seed Summary ===')
  console.log(`Centers:              3`)
  console.log(`Sponsors:             2`)
  console.log(`Admin users:          4`)
  console.log(`Seed players:         ${seedPlayers.length}`)
  console.log(`Player profiles:      ${profilesCreated}`)
  console.log(`Badges (types):       ${Object.keys(badges).length}`)
  console.log(`Badges awarded:       ${badgesAwarded}`)
  console.log(`Rewards:              ${rewardIds.length}`)
  console.log(`Challenges:           ${challengeIds.length}`)
  console.log(`Challenge joins:      ${challengeParticipantsCreated}`)
  console.log(`Events:               ${eventIds.length}`)
  console.log(`Activities:           ${createdActivities.length}`)
  console.log(`Feed posts:           ${feedPostsCreated}`)
  console.log(`Segments:             ${createdSegments.length}`)
  console.log(`Segment efforts:      ${effortsCreated}`)
  console.log(`Routes:               ${routesCreated}`)
  console.log(`Saved routes:         ${savedRoutesCreated}`)
  console.log(`Personal records:     ${prsCreated}`)
  console.log(`Teams:                3`)
  console.log(`Team members:         ${teamMembersCreated}`)
  console.log(`Follows:              ${followsCreated}`)
  console.log(`Ledger entries:       ${ledgerCreated}`)
  console.log('\n✅ Seed complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
