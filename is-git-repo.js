const path = require('path')
const util = require('util')
const promisify = util.promisify || require('./simple-promisify')
const lstatAsync = promisify(require('fs').lstat)

// Is the given path a git repo?
// This is an over-simplified way of addressing the question.
// It does not go to the lengths needed to answer it conclusively,
// but it suffices for the purposes in the parent module.
module.exports = function isGitRepo(pathSpec) {
  const dotGitDir = path.join(pathSpec, '.git')
  return lstatAsync(dotGitDir)
  .then(stats => stats.isDirectory())
  .catch(err => {
    if (err.code == 'ENOTDIR' || err.code == 'ENOENT')
      return false
    // Else we can't answer
    throw err
  })
}
