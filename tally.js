const fs = require('fs')
const path = require('path')
const util = require('util')
const promisify = util.promisify || require('./simple-promisify')
const readdirAsync = promisify(fs.readdir)
const lstatAsync = promisify(fs.lstat)

const npf = require('@offliner/npm-package-filename')

const isGitRepo = require('./is-git-repo')

const MAPFILENAME = 'dltracker.json'
const GIT_REPOS_DIR = '_git-remotes'

module.exports = function tallyDirContents(dir, idx, map) {
  function tallyItem(item) {
    if (!map[item]) map[item] = []
    map[item].push(idx)
  }

  return readdirAsync(dir).then(dirContents => {
    function nextItem(i) {
      if (i >= dirContents.length) return Promise.resolve(null)
      const item = dirContents[i]
      if (item == GIT_REPOS_DIR) {
        const gitDirPath = path.join(dir, GIT_REPOS_DIR)
        return readdirAsync(gitDirPath)
        .then(list => {
          function nextGitRemoteEntry(i) {
            if (i >= list.length) return Promise.resolve(null)
            const pathSpec = path.join(gitDirPath, list[i])
            return isGitRepo(pathSpec)
            .then(yes => yes && tallyItem(list[i]))
            .then(() => nextGitRemoteEntry(i+1))
          }

          return nextGitRemoteEntry(0)
        })
        .catch(err => {
          // ENOTDIR means a false GIT_REPOS_DIR, which is ignorable here
          if (err.code != 'ENOTDIR')
            throw err // rethrow other errors
        })
        .then(() => nextItem(i+1))
      }
      if (npf.parse(item)) tallyItem(item)
      return nextItem(i+1)
    }

    return nextItem(0)
  })
}
