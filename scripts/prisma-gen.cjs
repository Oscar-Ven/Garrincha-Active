// Runs as the npm postinstall hook.
// Generates the Prisma client then writes the browser re-export barrel so
// the App Router server components can import from '@/generated/prisma'.
const { writeFileSync } = require('fs')
const { execFileSync } = require('child_process')

// Use execFileSync (no shell) — args are passed directly, no injection surface.
// npx is a .cmd on Windows, a plain binary on POSIX.
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
execFileSync(npx, ['prisma', 'generate'], { stdio: 'inherit' })
writeFileSync('src/generated/prisma/index.ts', "export * from './browser'\n")
