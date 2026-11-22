import { execFileSync, spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  rmdirSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { isDeepStrictEqual } from 'node:util'

const manifests = ['package.json', 'package-lock.json']
const mainRef = 'refs/heads/main'
const lockDirectory = '.git/togello-release.lock'
const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/

function output(command, ...args) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trimEnd()
}

function run(command, ...args) {
  execFileSync(command, args, { stdio: 'inherit' })
}

function requireCondition(condition, message) {
  if (!condition) throw new Error(message)
}

function compareVersions(left, right) {
  const leftParts = left.split('.').map(BigInt)
  const rightParts = right.split('.').map(BigInt)
  const index = leftParts.findIndex((part, i) => part !== rightParts[i])
  if (index === -1) return 0
  return leftParts[index] > rightParts[index] ? 1 : -1
}

function nextPatch(version) {
  const [major, minor, patch] = version.split('.')
  return `${major}.${minor}.${BigInt(patch) + 1n}`
}

function remoteMain(origin) {
  checkOrigin(origin)
  const matches = output('git', 'ls-remote', '--exit-code', 'origin', mainRef)
    .split('\n')
    .map((line) => line.split('\t'))
    .filter(([, ref]) => ref === mainRef)
  requireCondition(
    matches.length === 1,
    'Could not identify origin/main exactly.',
  )
  return matches[0][0]
}

function checkOrigin(expected) {
  const fetchUrl = output('git', 'remote', 'get-url', 'origin')
  const pushUrls = output(
    'git',
    'remote',
    'get-url',
    '--push',
    '--all',
    'origin',
  )
  requireCondition(
    fetchUrl && pushUrls === fetchUrl,
    'origin must have one push URL matching its fetch URL.',
  )
  requireCondition(
    expected === undefined || expected === fetchUrl,
    'The origin URL changed during the release.',
  )
  return fetchUrl
}

function readManifests(revision) {
  const [manifest, lockfile] = manifests.map((file) =>
    JSON.parse(
      revision
        ? output('git', 'show', `${revision}:${file}`)
        : readFileSync(file, 'utf8'),
    ),
  )
  const { version } = manifest
  requireCondition(
    stableVersion.test(version) &&
      version === lockfile.version &&
      version === lockfile.packages?.['']?.version,
    'The package and lockfile must agree on a stable version.',
  )
  manifest.version = undefined
  lockfile.version = undefined
  lockfile.packages[''].version = undefined
  return { version, metadata: [manifest, lockfile] }
}

function checkWorkingTree(committed) {
  const indexed = output('git', 'ls-files', '-v', '-z')
    .split('\0')
    .filter(Boolean)
  requireCondition(
    indexed.every((entry) => entry.startsWith('H ')),
    'Release requires tracked files without skip-worktree or assume-unchanged flags.',
  )
  const changes = output(
    'git',
    'status',
    '--porcelain=v1',
    '-z',
    '--untracked-files=all',
  )
    .split('\0')
    .filter(Boolean)
  requireCondition(
    changes.every((entry) => manifests.some((file) => entry === ` M ${file}`)),
    'Keep only unstaged version changes in the manifests before releasing.',
  )
  const local = readManifests()
  requireCondition(
    isDeepStrictEqual(local.metadata, committed.metadata),
    'The manifests contain changes other than the release version.',
  )
  return { ...local, clean: changes.length === 0 }
}

function publishCommit(commit, receipt) {
  const snapshot = mkdtempSync(join(tmpdir(), 'togello-publish-'))
  try {
    run(
      'git',
      'clone',
      '--quiet',
      '--shared',
      '--no-checkout',
      '--',
      '.',
      snapshot,
    )
    run(
      'git',
      '-C',
      snapshot,
      '-c',
      'core.hooksPath=/dev/null',
      'checkout',
      '--quiet',
      '--detach',
      commit,
    )
    run('npm', 'publish', snapshot, '--access', 'public', '--ignore-scripts')
    writeFileSync(receipt, '')
  } finally {
    rmSync(snapshot, { recursive: true, force: true })
  }
}

function checkReleaseCommit(parent, commit, previous, current) {
  const changed = output('git', 'diff', '--name-only', '-z', parent, commit)
    .split('\0')
    .filter(Boolean)
  requireCondition(
    output('git', 'show', '-s', '--format=%P%n%s', commit) ===
      `${parent}\nRelease ${current.version}` &&
      changed.length === manifests.length &&
      changed.every((file) => manifests.includes(file)) &&
      isDeepStrictEqual(previous.metadata, current.metadata) &&
      compareVersions(previous.version, current.version) < 0,
    'Local main must match origin/main or have exactly one version-only release commit on top of it.',
  )
}

function publishedCommitIsVisible(spec, version, commit) {
  const result = spawnSync(
    'npm',
    ['view', spec, 'version', 'gitHead', '--json', '--prefer-online'],
    {
      encoding: 'utf8',
      timeout: 15_000,
    },
  )
  if (result.error) throw result.error
  const published = result.stdout.trim() ? JSON.parse(result.stdout) : null
  if (result.status !== 0 && published?.error?.code === 'E404') return false
  requireCondition(
    result.status === 0,
    `npm could not check ${spec}${published?.error?.code ? ` (${published.error.code})` : ''}.`,
  )
  requireCondition(
    published?.version === version && published.gitHead === commit,
    `npm ${spec} does not identify release commit ${commit}.`,
  )
  return true
}

async function verifyPublishedCommit(name, version, commit) {
  const spec = `${name}@${version}`
  if (publishedCommitIsVisible(spec, version, commit)) return

  console.log(`Waiting for npm to make ${spec} visible.`)
  const retryDelays = [
    1000, 2000, 4000, 8000, 15000, 30000, 30000, 30000, 30000, 30000,
  ]
  for (const delay of retryDelays) {
    await setTimeout(delay)
    if (publishedCommitIsVisible(spec, version, commit)) return
  }
  throw new Error(
    `npm ${spec} is still not visible. Keep release commit ${commit} and rerun mise run release ${version}.`,
  )
}

async function release(requested) {
  const origin = checkOrigin()
  const remote = remoteMain(origin)
  let commit = output('git', 'rev-parse', 'HEAD')
  let committed = readManifests(commit)
  const local = checkWorkingTree(committed)
  const name = committed.metadata[0].name
  const pending = commit !== remote

  if (pending) {
    requireCondition(
      local.clean &&
        output('git', 'show', '-s', '--format=%P', commit) === remote,
      'Local main must match origin/main or have one pending release commit on top of it and a clean working tree.',
    )
    checkReleaseCommit(remote, commit, readManifests(remote), committed)
    requireCondition(
      requested === 'patch' || requested === committed.version,
      `Resume the pending release with mise run release ${committed.version}.`,
    )
  }

  let receipt = `.git/togello-published-${commit}`
  const accepted =
    (pending || requested === committed.version) && existsSync(receipt)
  const versions = accepted
    ? []
    : [
        JSON.parse(
          output('npm', 'view', name, 'versions', '--json', '--prefer-online'),
        ),
      ].flat()
  const highest = versions
    .filter((version) => stableVersion.test(version))
    .sort(compareVersions)
    .at(-1)
  let target = pending ? committed.version : requested
  if (target === 'patch') {
    const floor =
      highest && compareVersions(highest, committed.version) > 0
        ? highest
        : committed.version
    target =
      !local.clean && compareVersions(local.version, floor) > 0
        ? local.version
        : nextPatch(floor)
  }

  requireCondition(
    compareVersions(target, committed.version) >= 0,
    `Release ${target} would lower the version on main.`,
  )
  requireCondition(
    local.clean || compareVersions(target, local.version) >= 0,
    `The working tree already contains version ${local.version}.`,
  )
  console.log(
    `Release version: ${target}. If interrupted, rerun mise run release ${target}.`,
  )

  if (accepted || versions.includes(target)) {
    requireCondition(
      local.clean && committed.version === target,
      `npm version ${target} is already published. Choose a newer version.`,
    )
  } else {
    requireCondition(
      !highest || compareVersions(target, highest) > 0,
      `npm already has a newer version (${highest}).`,
    )
    requireCondition(
      output('npm', 'config', 'get', 'dry-run') === 'false',
      'Disable npm dry-run before releasing.',
    )
    run('npm', 'ci', '--include=dev')
    run('npm', 'test')
    requireCondition(
      isDeepStrictEqual(checkWorkingTree(committed), local),
      'The working tree changed during the release checks.',
    )

    if (spawnSync('npm', ['whoami'], { stdio: 'ignore' }).status !== 0) {
      run('npm', 'login')
      output('npm', 'whoami')
    }

    requireCondition(
      remoteMain(origin) === remote &&
        output('git', 'rev-parse', 'HEAD') === commit,
      'Local or remote main changed during release preparation.',
    )
    requireCondition(
      isDeepStrictEqual(checkWorkingTree(committed), local),
      'The working tree changed during release preparation.',
    )

    if (target !== committed.version) {
      run(
        'npm',
        'version',
        target,
        '--no-git-tag-version',
        '--allow-same-version',
      )
      requireCondition(
        checkWorkingTree(committed).version === target,
        `Could not prepare version ${target}.`,
      )
      run(
        'git',
        'commit',
        '--only',
        '-m',
        `Release ${target}`,
        '--',
        ...manifests,
      )
      commit = output('git', 'rev-parse', 'HEAD')
      const releaseManifests = readManifests(commit)
      checkReleaseCommit(remote, commit, committed, releaseManifests)
      committed = releaseManifests
    }

    requireCondition(
      checkWorkingTree(committed).clean && committed.version === target,
      'The release commit and working tree must match before publication.',
    )
    requireCondition(
      remoteMain(origin) === remote &&
        output('git', 'rev-parse', 'HEAD') === commit,
      'Local or remote main moved before npm publication.',
    )
    checkOrigin(origin)
    receipt = `.git/togello-published-${commit}`
    publishCommit(commit, receipt)
  }
  await verifyPublishedCommit(name, target, commit)

  const currentRemote = remoteMain(origin)
  if (currentRemote !== commit) {
    requireCondition(
      currentRemote === remote,
      `npm version ${target} is published, but origin/main moved. Keep release commit ${commit} for reconciliation.`,
    )
    checkOrigin(origin)
    run('git', 'push', '--no-follow-tags', 'origin', `${commit}:${mainRef}`)
  }
  requireCondition(
    remoteMain(origin) === commit,
    `Could not confirm release commit ${commit} on origin/main.`,
  )
  rmSync(receipt, { force: true })
  console.log(`Released ${name}@${target} from ${commit} on origin/main.`)
}

try {
  const requested = process.argv[2]
  requireCondition(
    requested === 'patch' || stableVersion.test(requested),
    'Specify patch or a stable version such as 1.0.51.',
  )
  requireCondition(
    existsSync('.git/HEAD') &&
      output('git', 'symbolic-ref', 'HEAD') === mainRef,
    'Release from the main branch of a regular Git checkout.',
  )
  try {
    mkdirSync(lockDirectory)
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
    throw new Error(
      `Release lock exists at ${lockDirectory}. Check for an active release in this checkout.`,
    )
  }
  try {
    await release(requested)
  } finally {
    rmdirSync(lockDirectory)
  }
} catch (error) {
  console.error(`Release stopped: ${error.message}`)
  process.exitCode = 1
}
