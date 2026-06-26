import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function resolveDepsRoot() {
  if (process.env.NG_DEPS_ROOT) return process.env.NG_DEPS_ROOT

  const candidates = [
    projectRoot,
    'D:/ng-deps/nickname-game55777',
    'C:/Users/Hp/ng-deps/nickname-game55777',
  ]

  for (const root of candidates) {
    if (fs.existsSync(path.join(root, 'node_modules/vite/bin/vite.js'))) return root
  }

  console.error(
    '\nلم يتم العثور على node_modules.\n' +
    'على Windows شغّل مرة واحدة:\n' +
    '  npm run setup-deps\n' +
    'على Vercel/Linux تأكد من تشغيل npm install قبل البناء.\n',
  )
  process.exit(1)
}

const depsRoot = resolveDepsRoot()
const useLocalDeps = path.resolve(depsRoot) === path.resolve(projectRoot)
const viteConfig = useLocalDeps
  ? path.join(projectRoot, 'vite.config.js')
  : path.join(depsRoot, 'vite.config.proxy.mjs')
const viteBin = path.join(depsRoot, 'node_modules/vite/bin/vite.js')
const viteArgs = ['--config', viteConfig, ...process.argv.slice(2)]

const child = spawn(
  process.execPath,
  [viteBin, ...viteArgs],
  {
    cwd: projectRoot,
    env: {
      ...process.env,
      NG_PROJECT_ROOT: projectRoot,
      NG_DEPS_ROOT: depsRoot,
    },
    stdio: 'inherit',
    shell: false,
  },
)

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 0)
})
