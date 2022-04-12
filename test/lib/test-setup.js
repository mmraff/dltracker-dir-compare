const fs = require('fs')
const path = require('path')
const util = require('util')
const promisify = util.promisify || require('./simple-promisify')
const mkdirAsync = promisify(fs.mkdir)
const readdirAsync = promisify(fs.readdir)
const writeFileAsync = promisify(fs.writeFile)
const npf = require('@offliner/npm-package-filename')

const MAPFILENAME = 'dltracker.json'
const GIT_REPOS_DIR = '_git-remotes'
const mockRepos = [
  'git-bitbucket-org-bbuser-bbrepo-90abcdef',
  'git-github-com-ghuser-ghrepo-git-12345678',
  'git-gitlab-com-gluser-glrepo-a1b2c3d4'
]
const repoPicks = [[1,1,0], [1,0,1], [0,1,1]]
const dirListings = []
let initialized = false

module.exports = {
  initOverlapping,
  initDisjoint,
  initIdentical,
  getListings
}

function getListings() {
  if (!initialized)
    throw new Error("First call one of the init functions with a list of paths")
  return dirListings
}

function initDisjoint(dirs) {
  const N = dirs.length
  let startNum = 0

  function nextDir(idx) {
    if (idx >= N) return Promise.resolve(null)
    const dirPath = dirs[idx]
    const fileQuantity = 5
    return mockTrackerDir(dirPath, fileQuantity, startNum, null)
    .then(() => {
      startNum += fileQuantity
      return nextDir(idx+1)
    })
  }

  return nextDir(0)
  .then(() => collectTestDirListings(dirs))
  .then(() => initialized = true)
}

function initIdentical(dirs) {
  const N = dirs.length

  function nextDir(idx) {
    if (idx >= N) return Promise.resolve(null)
    const dirPath = dirs[idx]
    const fileQuantity = 5
    return mockTrackerDir(dirPath, fileQuantity, 0, [1,1,1])
    .then(() => nextDir(idx+1))
  }

  return nextDir(0)
  .then(() => collectTestDirListings(dirs))
  .then(() => initialized = true)
}

function initOverlapping(dirs) {
  const N = dirs.length
  let startNum = 0

  function nextDir(idx, prevQuantity) {
    if (idx >= N) return Promise.resolve(null)
    const dirPath = dirs[idx]
    const fileQuantity = randomishSize()
    if (idx > 0)
      startNum += getOverlapIndex(prevQuantity, fileQuantity)
    return mockTrackerDir(
      dirPath, fileQuantity, startNum, repoPicks[idx % repoPicks.length]
    )
    .then(() => nextDir(idx+1, fileQuantity))
  }

  return nextDir(0)
  .then(() => collectTestDirListings(dirs))
  .then(() => initialized = true)
}

function randomishSize() {
  return Math.floor(Math.random() * 60) + 15
}

// Compute an offset into an array of size size1 that results in partial overlap
// with an array of size size2 that has its head aligned with the offset
function getOverlapIndex(size1, size2) {
  const bigger = Math.max(size1, size2)
  const smaller = Math.min(size1, size2)
  return bigger - Math.floor(smaller/3) // arbitrarily chosen fraction
}

let junkFileNum = 1

function makeJunkFiles(dir, start) {
  const quantity = Math.ceil(Math.random() * 3)
  function nextFile(i) {
    if (i >= quantity) return Promise.resolve(quantity)
    const filename = `JUNK-${i+start}.zip`
    return writeFileAsync(path.join(dir, filename), '')
    .then(() => nextFile(i+1))
  }
  return nextFile(0)
}

function mockRepoDirs(where, which) {
  function nextRepo(i) {
    if (i >= mockRepos.length) return Promise.resolve(null)
    if (!which[i]) return nextRepo(i+1)
    const repoPath = path.join(where, mockRepos[i])
    return mkdirAsync(repoPath)
    .then(() => mkdirAsync(path.join(repoPath, '.git')))
    .then(() => nextRepo(i+1))
  }
  return nextRepo(0)
}

function mockTrackerDir(dir, quantity, startIndex, whichRepos) {
  return mkdirAsync(dir)
  .then(() => {
    let idx = startIndex
    function nextFile(count) {
      if (count >= quantity) return Promise.resolve(null)
      const filename = `dummy${idx}-1.0.1.tgz`
      ++idx
      return writeFileAsync(path.join(dir, filename), '')
      .then(() => nextFile(count+1))
    }

    return nextFile(0)
    .then(() => {
      return makeJunkFiles(dir, junkFileNum)
      .then(junkFilesMade => junkFileNum += junkFilesMade)
    })
    .then(() => {
      if (!whichRepos) return null
      const reposBaseDir = path.join(dir, GIT_REPOS_DIR)
      return mkdirAsync(reposBaseDir)
      .then(() => mockRepoDirs(reposBaseDir, whichRepos))
    })
    .then(() => writeFileAsync(path.join(dir, MAPFILENAME), ''))
  })
}

function collectTestDirListings(dirs) {
  function iterateDirs(i) {
    if (i >= dirs.length) return Promise.resolve(null)
    return readdirAsync(dirs[i])
    .then(files => {
      const cullJunk = name => (npf.parse(name) || name == GIT_REPOS_DIR)
      dirListings.push(files.filter(cullJunk))
    })
    .then(() => iterateDirs(i+1))
  }

  function iterateGitBaseDirs(i) {
    if (i >= dirs.length) return Promise.resolve(null)
    const gitReposDirIdx = dirListings[i].indexOf(GIT_REPOS_DIR)
    if (gitReposDirIdx < 0) return iterateGitBaseDirs(i+1)
    return readdirAsync(path.join(dirs[i], GIT_REPOS_DIR))
    .then(files => {
      // Could go the extra step of checking that each is a directory that
      // contains a .git directory, but we already know that test-setup doesn't
      // put anything else in the GIT_REPOS_DIR.
      // (If that ever changes, we'll have to elaborate this code accordingly.)
      const list = dirListings[i]
      list.splice(gitReposDirIdx, 1, ...files)
    })
    .then(() => iterateGitBaseDirs(i+1))
  }

  // Clean up leftovers from other test suite use in the same run
  if (dirListings.length) dirListings.splice(0)
  initialized = false

  return iterateDirs(0).then(() => iterateGitBaseDirs(0))
}
