const fs = require('fs')
const path = require('path')
const util = require('util')
const promisify = util.promisify || require('./simple-promisify')
const mkdirAsync = promisify(fs.mkdir)
const rimrafAsync = promisify(require('rimraf'))

const expect = require('chai').expect

const getIntersections = require('../intersections')
const testSetup = require('./lib/test-setup')

const tempBase = path.join(__dirname, 'mockDownloads2')
const testDirs = []
const didNotReject = new Error('Failed to be rejected')
const notArray = [ true, 42, 'blue', {}, function(){}, new Date() ]
const notString = [ true, 42, [], {}, function(){}, new Date() ]

function expectFilesExist(intersectResults) {
  const dirListings = testSetup.getListings()

  for (let i = 0; i < intersectResults.length; ++i) {
    const assoc = intersectResults[i]
    const dirIdxs = assoc.dirs
    const commonFiles = assoc.files
    for (let j = 0; j < dirIdxs.length; ++j) {
      const actualFiles = dirListings[dirIdxs[j]]
      for (let f = 0; f < commonFiles.length; ++f) {
        const filename = commonFiles[f]
        expect(filename).to.be.oneOf(actualFiles)
      }
    }
  }
}

function verifyNoneMissed(assoc, tgtDirs) {
  const comboDirs = assoc.dirs.map(idx => tgtDirs[idx])
  const dirListings = testSetup.getListings()

  const lastDirIdx = comboDirs.length - 1
  let common = false
  for (let di1 = 0; di1 < lastDirIdx; ++di1) {
    const filelist = dirListings[di1]
    for (let fi = 0; fi < filelist.length; ++fi) {
      const currFile = filelist[fi]
      // Ignore files that are already recognized as common
      if (assoc.files.includes(currFile)) continue
      for (let di2 = di1 + 1; di2 < dirListings.length; ++di2) {
        const otherFilelist = dirListings[di2]
        if (otherFilelist.includes(currFile)) common = true
        else {
          common = false
          break
        }
      }
      // Found a file common to all dirs, not yet recognized as such?
      if (common) return false
    }
  }
  return true
}

describe('getIntersections function', function() {
  after('tear down temporary directory', function(done) {
    rimrafAsync(tempBase)
    .then(() => done())
    .catch(err => done(err))
  })

  describe('misuse', function() {
    it('should reject if given no argument, null, or undefined', function(done) {
      getIntersections().then(() => { throw didNotReject })
      .catch(err => expect(err).to.be.an.instanceof(SyntaxError))
      .then(() => getIntersections(undefined))
      .then(() => { throw didNotReject })
      .catch(err => expect(err).to.be.an.instanceof(SyntaxError))
      .then(() => getIntersections(null))
      .then(() => { throw didNotReject })
      .catch(err => {
        expect(err).to.be.an.instanceof(SyntaxError)
        done()
      })
      .catch(err => done(err))
    })

    it('should reject if given anything but an array', function(done) {
      function iterateBadArgs(i) {
        if (i >= notArray.length) return Promise.resolve(null)

        return getIntersections(notArray[i]).then(() => { throw didNotReject })
        .catch(err => expect(err).to.be.an.instanceof(TypeError))
        .then(() => iterateBadArgs(i+1))
      }

      iterateBadArgs(0)
      .then(() => done())
      .catch(err => done(err))
    })

    it('should reject if given an array containing anything other than strings', function(done) {
      function iterateBadArrayElements(i) {
        if (i >= notString.length) return Promise.resolve(null)

        const arg = [ notString[i], 'but-this-is-ok' ]
        return getIntersections(arg).then(() => { throw didNotReject })
        .catch(err => expect(err).to.be.an.instanceof(TypeError))
        .then(() => iterateBadArrayElements(i+1))
      }

      iterateBadArrayElements(0)
      .then(() => done())
      .catch(err => done(err))
    })

    it('should reject if given array has less than two elements', function(done) {
      getIntersections([]).then(() => { throw didNotReject })
      .catch(err => expect(err).to.be.an.instanceof(SyntaxError))
      .then(() => getIntersections(['this/is/ok']))
      .then(() => { throw didNotReject })
      .catch(err => expect(err).to.be.an.instanceof(SyntaxError))
      .then(() => done())
      .catch(err => done(err))
    })
  })

  describe('correct use, passed 2 directories with some files in common', function() {
    const dirSet = []
    let currResults

    before('create mock download-tracker directories with varying contents', function(done) {
      const dirNames = [ 'DIR1', 'DIR2', 'DIR3' ]
      for (let i = 0; i < dirNames.length; ++i)
        testDirs.push(path.join(tempBase, dirNames[i]))

      rimrafAsync(tempBase)
      .then(() => mkdirAsync(tempBase))
      .then(() => testSetup.initOverlapping(testDirs))
      .then(() => done())
      .catch(err => done(err))
    })

    it('should resolve to an array of objects with non-empty array-valued properties "dirs" and "files"', function(done) {
      dirSet.push(testDirs[0], testDirs[1])
      getIntersections(dirSet)
      .then(results => {
        currResults = results
        for (let i = 0; i < results.length; ++i) {
          const assoc = results[i]
          expect(assoc).to.have.property('dirs').that.is.an('array').that.is.not.empty
          expect(assoc).to.have.property('files').that.is.an('array').that.is.not.empty
        }
        done()
      })
      .catch(err => done(err))
    })

    it('should result in "dirs" array of [0, 1], and "files" array of at least one string', function() {
      for (let i = 0; i < currResults.length; ++i) {
        const dirs = currResults[i].dirs
        const files = currResults[i].files
        expect(dirs).to.have.all.members([0,1])
        for (let i = 0; i < files.length; ++i) {
          const name = files[i]
          expect(name).to.be.a('string').that.is.not.empty
        }
      }
    })

    it('should include in "files" only tarballs common to the indexed "dirs"', function(done) {
      expectFilesExist(currResults, dirSet)
      expect(verifyNoneMissed(currResults[0], dirSet)).to.be.true
      done()
    })
  })

  describe('correct use, passed 3 directories with some files in common', function() {
    const dirSet = []
    let currResults

    it('should resolve to an array of objects with array-valued properties "dirs" and "files"', function(done) {
      dirSet.push(testDirs[0], testDirs[1], testDirs[2])
      getIntersections(dirSet)
      .then(results => {
        currResults = results
        for (let i = 0; i < results.length; ++i) {
          const assoc = results[i]
          expect(assoc).to.have.property('dirs').that.is.an('array')
          expect(assoc).to.have.property('files').that.is.an('array')
        }
        done()
      })
      .catch(err => done(err))
    })

    it('should comprise objects with "dirs" array lengths >= 2, and "files" array of at least one string', function() {
      for (let i = 0; i < currResults.length; ++i) {
        const dirs = currResults[i].dirs
        const files = currResults[i].files
        expect(dirs.length).to.be.at.least(2)
        expect([0,1,2]).to.include.members(dirs)
        expect(files.length).to.be.at.least(1)
        for (let i = 0; i < files.length; ++i) {
          const name = files[i]
          expect(name).to.be.a('string').that.is.not.empty
        }
      }
    })

// TODO: The wording here should be improved
    it('should include in "files" only tarballs common to the indexed "dirs"', function(done) {
      expectFilesExist(currResults, dirSet)
      for (let i = 0; i < currResults.length; ++i)
        expect(verifyNoneMissed(currResults[i], dirSet)).to.be.true
      done()
    })
  })

  describe('correct use, passed directories with no tarballs in common', function() {
    before('create mock download-tracker directories with disjoint contents', function(done) {
      const dirNames = [ 'DIR4', 'DIR5', 'DIR6' ]
      testDirs.splice(0)
      for (let i = 0; i < dirNames.length; ++i)
        testDirs.push(path.join(tempBase, dirNames[i]))

      testSetup.initDisjoint(testDirs)
      .then(() => done())
      .catch(err => done(err))
    })

    it('should resolve to an empty array, given 2 disjoint directories', function(done) {
      getIntersections([testDirs[0], testDirs[1]])
      .then(results => {
        expect(results).to.be.an('array').that.is.empty
        done()
      })
      .catch(err => done(err))
    })

    it('should resolve to an empty array, given 3 disjoint directories', function(done) {
      getIntersections([testDirs[0], testDirs[1], testDirs[2]])
      .then(results => {
        expect(results).to.be.an('array').that.is.empty
        done()
      })
      .catch(err => done(err))
    })
  })

  describe('correct use, passed directories with everything in common', function() {
    before('create mock download-tracker directories with same contents', function(done) {
      const dirNames = [ 'DIR7', 'DIR8', 'DIR9' ]
      testDirs.splice(0)
      for (let i = 0; i < dirNames.length; ++i)
        testDirs.push(path.join(tempBase, dirNames[i]))

      testSetup.initIdentical(testDirs)
      .then(() => done())
      .catch(err => done(err))
    })

    it('should resolve to an array of only one object with a "files" array identical to the package listing of the given directories', function(done) {
      const dirListings = testSetup.getListings()
      getIntersections([testDirs[0], testDirs[1], testDirs[2]])
      .then(results => {
        expect(results).to.be.an('array').that.has.lengthOf(1)
        const assoc = results[0]
        const files = assoc.files
        expect(assoc.dirs).to.be.an('array').that.has.all.members([0,1,2])
        expect(files).to.be.an('array').that.has.all.members(dirListings[0])
        expect(files).to.have.all.members(dirListings[1])
        expect(files).to.have.all.members(dirListings[2])
        done()
      })
      .catch(err => done(err))
    })

  })

})
