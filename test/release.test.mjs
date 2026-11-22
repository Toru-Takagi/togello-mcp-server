import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const releaseScript = fileURLToPath(
  new URL('../scripts/release.mjs', import.meta.url),
)

function mockNpm() {
  const [command, subject, ...args] = process.argv.slice(2)
  const stateFile = process.env.MOCK_NPM_STATE
  const state = JSON.parse(readFileSync(stateFile, 'utf8'))
  state.calls.push(command)
  writeFileSync(stateFile, JSON.stringify(state))

  if (command === 'view') {
    if (args.includes('versions')) {
      if (state.viewListError) {
        console.log(JSON.stringify({ error: { code: state.viewListError } }))
        process.exit(1)
      }
      console.log(JSON.stringify(Object.keys(state.published)))
    } else {
      const version = subject.split('@').at(-1)
      if (state.verifyError || state.visibilityMisses > 0) {
        const code = state.verifyError ?? 'E404'
        if (!state.verifyError) {
          state.visibilityMisses--
          writeFileSync(stateFile, JSON.stringify(state))
        }
        console.log(JSON.stringify({ error: { code } }))
        process.exit(1)
      }
      console.log(
        JSON.stringify({ version, gitHead: state.published[version] }),
      )
    }
  } else if (
    command === 'config' &&
    subject === 'get' &&
    args[0] === 'dry-run'
  ) {
    console.log(state.dryRun ? 'true' : 'false')
  } else if (command === 'version') {
    for (const path of ['package.json', 'package-lock.json']) {
      const data = JSON.parse(readFileSync(path, 'utf8'))
      data.version = subject
      if (data.packages) data.packages[''].version = subject
      writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
    }
  } else if (command === 'publish') {
    if (state.failPublish) process.exit(1)
    if (state.editDuringPublish) writeFileSync('README.md', 'late local edit\n')
    const { version } = JSON.parse(
      readFileSync(`${subject}/package.json`, 'utf8'),
    )
    state.snapshotReadme = readFileSync(`${subject}/README.md`, 'utf8')
    state.snapshotHasLocalLicense = existsSync(`${subject}/LICENSE.private`)
    state.published[version] = execFileSync(
      'git',
      ['-C', subject, 'rev-parse', 'HEAD'],
      {
        encoding: 'utf8',
      },
    ).trim()
    writeFileSync(stateFile, JSON.stringify(state))
  } else if (!['ci', 'test', 'whoami'].includes(command)) {
    process.exit(1)
  }
}

function setup(t) {
  const root = mkdtempSync(join(tmpdir(), 'togello-release-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const cwd = join(root, 'checkout')
  const remote = join(root, 'remote.git')
  const bin = join(root, 'bin')
  const stateFile = join(root, 'npm.json')
  mkdirSync(cwd)
  mkdirSync(bin)
  const env = {
    ...process.env,
    PATH: `${bin}${delimiter}${process.env.PATH}`,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    MOCK_NPM_STATE: stateFile,
  }
  const git = (...args) =>
    execFileSync('git', args, {
      cwd,
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  const setState = (state) => writeFileSync(stateFile, JSON.stringify(state))
  const state = () => JSON.parse(readFileSync(stateFile, 'utf8'))

  const imports =
    "import { execFileSync } from 'node:child_process'\nimport { existsSync, readFileSync, writeFileSync } from 'node:fs'"
  writeFileSync(
    join(bin, 'npm'),
    `#!${process.execPath}\n${imports}\n(${mockNpm})()\n`,
    { mode: 0o755 },
  )
  git('init', '--bare', '--initial-branch=main', remote)
  git('init', '--initial-branch=main')
  git('config', 'user.name', 'Release Tests')
  git('config', 'user.email', 'release@example.test')
  git('remote', 'add', 'origin', remote)
  writeFileSync(
    join(cwd, 'package.json'),
    '{"name":"togello-mcp-server","version":"1.0.49"}\n',
  )
  writeFileSync(
    join(cwd, 'package-lock.json'),
    '{"version":"1.0.49","packages":{"":{"version":"1.0.49"}}}\n',
  )
  writeFileSync(join(cwd, 'README.md'), 'tracked documentation\n')
  git('add', '--', 'package.json', 'package-lock.json', 'README.md')
  git('commit', '-m', 'Initial commit')
  git('push', 'origin', 'main')
  setState({ calls: [], published: { '1.0.50': git('rev-parse', 'HEAD') } })

  return {
    cwd,
    git,
    remote,
    setState,
    state,
    setVersion: (version) =>
      execFileSync('npm', ['version', version], { cwd, env }),
    release: (version = 'patch') =>
      spawnSync(process.execPath, [releaseScript, version], {
        cwd,
        env,
        encoding: 'utf8',
      }),
  }
}

test('a patch uses the registry floor and resumes the same commit after a rejected push', (t) => {
  const { git, remote, setState, setVersion, state, release } = setup(t)
  git('push', 'origin', 'HEAD:refs/heads/a/refs/heads/main')
  setVersion('1.0.50')
  const hook = join(remote, 'hooks', 'pre-receive')
  writeFileSync(hook, '#!/bin/sh\nexit 1\n', { mode: 0o755 })

  const first = release()
  assert.equal(first.status, 1, first.stderr)
  assert.match(first.stderr, /remote rejected/)
  const commit = git('rev-parse', 'HEAD')
  assert.equal(git('log', '-1', '--format=%s'), 'Release 1.0.51')
  assert.equal(state().published['1.0.51'], commit)
  assert.notEqual(git('rev-parse', 'origin/main'), commit)

  rmSync(hook)
  setState({
    ...state(),
    published: { ...state().published, '1.0.52': 'a-different-release' },
  })
  const retry = release()
  assert.equal(retry.status, 0, retry.stderr)
  assert.equal(git('rev-parse', 'HEAD'), commit)
  assert.equal(git('rev-parse', 'origin/main'), commit)
  assert.equal(state().calls.filter((call) => call === 'publish').length, 1)
  assert.equal(git('status', '--porcelain'), '')

  const confirmation = release('1.0.51')
  assert.equal(confirmation.status, 0, confirmation.stderr)
  assert.equal(git('rev-parse', 'HEAD'), commit)
  assert.equal(state().calls.filter((call) => call === 'publish').length, 1)
})

test('a failed npm publication leaves an unpublished version ready for an exact retry', (t) => {
  const { git, setState, state, release, setVersion } = setup(t)
  setVersion('1.0.53')
  setState({ ...state(), failPublish: true })
  assert.equal(release().status, 1)
  const commit = git('rev-parse', 'HEAD')
  assert.equal(git('log', '-1', '--format=%s'), 'Release 1.0.53')
  assert.notEqual(git('rev-parse', 'origin/main'), commit)

  setState({ ...state(), failPublish: false })
  const retry = release('1.0.53')
  assert.equal(retry.status, 0, retry.stderr)
  assert.equal(git('rev-parse', 'origin/main'), commit)
  assert.equal(state().published['1.0.53'], commit)
})

test('a successful npm publish waits for a temporarily missing version before pushing', (t) => {
  const { git, state, setState, release } = setup(t)
  setState({ ...state(), visibilityMisses: 1 })

  const result = release()
  assert.equal(result.status, 0, result.stderr)
  assert.match(
    result.stdout,
    /Waiting for npm to make togello-mcp-server@1\.0\.51 visible/,
  )
  assert.equal(state().calls.filter((call) => call === 'publish').length, 1)
  assert.equal(git('rev-parse', 'origin/main'), state().published['1.0.51'])
})

test('an accepted publish is not repeated when the registry version list still lags on retry', (t) => {
  const { cwd, git, state, setState, release } = setup(t)
  setState({ ...state(), verifyError: 'E503' })
  const first = release()
  assert.equal(first.status, 1)
  assert.match(first.stderr, /E503/)
  assert.doesNotMatch(first.stdout, /Waiting for npm/)
  const commit = git('rev-parse', 'HEAD')
  const receipt = join(cwd, '.git', `togello-published-${commit}`)
  assert.ok(existsSync(receipt))
  assert.notEqual(git('rev-parse', 'origin/main'), commit)

  setState({
    ...state(),
    verifyError: undefined,
    viewListError: 'E404',
    visibilityMisses: 1,
  })
  const retry = release('1.0.51')
  assert.equal(retry.status, 0, retry.stderr)
  assert.equal(state().calls.filter((call) => call === 'publish').length, 1)
  assert.equal(git('rev-parse', 'origin/main'), commit)
  assert.ok(!existsSync(receipt))
})

test('npm dry-run stops before committing or recording a publication', (t) => {
  const { git, state, setState, release } = setup(t)
  setState({ ...state(), dryRun: true })

  const result = release()
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Disable npm dry-run before releasing/)
  assert.equal(git('rev-parse', 'HEAD'), git('rev-parse', 'origin/main'))
  assert.equal(state().calls.includes('publish'), false)
})

test('a published version with a different gitHead cannot push a pending release', (t) => {
  const { git, setState, state, release } = setup(t)
  const base = git('rev-parse', 'HEAD')
  setState({ ...state(), failPublish: true })
  assert.equal(release().status, 1)
  setState({ ...state(), published: { ...state().published, '1.0.51': base } })

  const result = release()
  assert.equal(result.status, 1)
  assert.match(result.stderr, /does not identify release commit/)
  assert.equal(git('rev-parse', 'origin/main'), base)
})

test('unrelated changes in a manifest stop the release before npm runs', (t) => {
  const { cwd, git, state, release } = setup(t)
  writeFileSync(
    join(cwd, 'package.json'),
    '{"name":"other-package","version":"1.0.49"}\n',
  )

  const result = release()
  assert.equal(result.status, 1)
  assert.match(result.stderr, /changes other than the release version/)
  assert.deepEqual(state().calls, [])
  assert.equal(git('rev-parse', 'HEAD'), git('rev-parse', 'origin/main'))
})

test('an existing release lock stops another invocation before npm runs', (t) => {
  const { cwd, git, state, release } = setup(t)
  mkdirSync(join(cwd, '.git', 'togello-release.lock'))

  const result = release()
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Release lock exists/)
  assert.deepEqual(state().calls, [])
  assert.equal(git('rev-parse', 'HEAD'), git('rev-parse', 'origin/main'))
})

test('a different origin push URL stops the release before npm runs', (t) => {
  const { cwd, git, state, release } = setup(t)
  git('remote', 'set-url', '--push', 'origin', join(cwd, 'different-remote'))

  const result = release()
  assert.equal(result.status, 1)
  assert.match(result.stderr, /one push URL matching its fetch URL/)
  assert.deepEqual(state().calls, [])
  assert.equal(git('rev-parse', 'HEAD'), git('rev-parse', 'origin/main'))
})

test('npm publishes the commit snapshot without ignored files or late edits', (t) => {
  const { cwd, git, setState, state, release } = setup(t)
  writeFileSync(join(cwd, '.git', 'info', 'exclude'), 'LICENSE.private\n')
  writeFileSync(join(cwd, 'LICENSE.private'), 'local test fixture\n')
  setState({ ...state(), editDuringPublish: true })

  const result = release()
  assert.equal(result.status, 0, result.stderr)
  assert.equal(state().snapshotHasLocalLicense, false)
  assert.equal(state().snapshotReadme, 'tracked documentation\n')
  assert.equal(
    readFileSync(join(cwd, 'README.md'), 'utf8'),
    'late local edit\n',
  )
  assert.equal(git('rev-parse', 'HEAD'), git('rev-parse', 'origin/main'))
})
