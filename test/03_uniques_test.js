const fs = require('fs')
const path = require('path')
const util = require('util')
const promisify = util.promisify || require('./simple-promisify')
const mkdirAsync = promisify(fs.mkdir)
const rimrafAsync = promisify(require('rimraf'))

const expect = require('chai').expect

const getUniques = require('../uniques')
const testSetup = require('./lib/test-setup')

const tempBase = path.join(__dirname, 'mockDownloads3')
const dirNames = [ 'DIR1', 'DIR2', 'DIR3' ]
const testDirs = []
const didNotReject = new Error('Failed to be rejected')
const notArray = [ true, 42, 'blue', {}, function(){}, new Date() ]
const notString = [ true, 42, [], {}, function(){}, new Date() ]

function expectFilesExist(results) {
  const dirListings = testSetup.getListings()

  for (let i = 0; i < results.length; ++i) {
    const uniqueFiles = results[i]
    const actualFiles = dirListings[i]
    for (let f = 0; f < uniqueFiles.length; ++f) {
      expect(uniqueFiles[f]).to.be.oneOf(actualFiles)
    }
  }
}

function verifyNoneMissed(uniquesLists, tgtDirIdxs) {
  const dirListings = testSetup.getListings()

  for (let di1 = 0; di1 < tgtDirIdxs.length; ++di1) {
    const srcList1 = dirListings[tgtDirIdxs[di1]]
    const uList = uniquesLists[di1]
    for (let f = 0; f < srcList1.length; ++f) {
      const currFile = srcList1[f]
      let unique = !!uList && uList.includes(currFile)
      let common = false
      // 2 cases to check:
      // * If currFile is claimed as unique to uList, it must not appear in any srcList2.
      // * If currFile is not in uList, then it must appear in some srcList2.
      for (let di2 = 0; di2 < tgtDirIdxs.length; ++di2) {
        if (di2 == di1) continue
        const srcList2 = dirListings[tgtDirIdxs[di2]]
        if (srcList2.includes(currFile)) {
          if (unique) return false
          else common = true
        }
      }
      if (!unique && !common) return false
    }
  }

  return true
}

describe('getUniques function', function() {
  before('create mock download-tracker directories with varying contents', function(done) {
    for (let i = 0; i < dirNames.length; ++i)
      testDirs.push(path.join(tempBase, dirNames[i]))

    rimrafAsync(tempBase)
    .then(() => mkdirAsync(tempBase))
    .then(() => done())
    .catch(err => done(err))
  })
  after('tear down temporary directory', function(done) {
    rimrafAsync(tempBase)
    .then(() => done())
    .catch(err => done(err))
  })

  describe('misuse', function() {
    it('should reject if given no argument, null, or undefined', function(done) {
      getUniques().then(() => { throw didNotReject })
      .catch(err => expect(err).to.be.an.instanceof(SyntaxError))
      .then(() => getUniques(undefined))
      .then(() => { throw didNotReject })
      .catch(err => expect(err).to.be.an.instanceof(SyntaxError))
      .then(() => getUniques(null))
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

        return getUniques(notArray[i]).then(() => { throw didNotReject })
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
        return getUniques(arg).then(() => { throw didNotReject })
        .catch(err => expect(err).to.be.an.instanceof(TypeError))
        .then(() => iterateBadArrayElements(i+1))
      }

      iterateBadArrayElements(0)
      .then(() => done())
      .catch(err => done(err))
    })

    it('should reject if given array has less than two elements', function(done) {
      getUniques([]).then(() => { throw didNotReject })
      .catch(err => expect(err).to.be.an.instanceof(SyntaxError))
      .then(() => getUniques(['this/is/ok']))
      .then(() => { throw didNotReject })
      .catch(err => expect(err).to.be.an.instanceof(SyntaxError))
      .then(() => done())
      .catch(err => done(err))
    })
  })

  describe('correct use, passed 2 directories with some files not in common', function() {
    const dirSet = []
    let currResults

    before('set up directories with file list overlap', function(done) {
      testSetup.initOverlapping(testDirs)
      .then(() => done())
      .catch(err => done(err))
    })

    it('should resolve to an array of two non-empty arrays of strings', function(done) {
      dirSet.push(testDirs[0], testDirs[1])
      getUniques(dirSet)
      .then(results => {
        currResults = results
        for (let i = 0; i < results.length; ++i) {
          const files = results[i]
          expect(files).to.be.an('array').that.is.not.empty
          for (let j = 0; j < files.length; ++j)
            expect(files[j]).to.be.a('string').that.is.not.empty
        }
        done()
      })
      .catch(err => done(err))
    })

    it('should include in each array all tarballs unique to the dir of the same index, and only those', function(done) {
      expectFilesExist(currResults, dirSet)
      expect(verifyNoneMissed(currResults, [0, 1])).to.be.true
      done()
    })

  })

  describe('correct use, passed 3 directories with some files not in common', function() {
    const dirSet = []
    let currResults

    it('should resolve to an array of non-empty arrays of strings', function(done) {
      dirSet.push(testDirs[0], testDirs[1], testDirs[2])
      getUniques(dirSet)
      .then(results => {
        currResults = results
        for (let i = 0; i < results.length; ++i) {
          const files = results[i]
          expect(files).to.be.an('array').that.is.not.empty
          for (let j = 0; j < files.length; ++j)
            expect(files[j]).to.be.a('string').that.is.not.empty
        }
        done()
      })
      .catch(err => done(err))
    })

    it('should include in each array all tarballs unique to the dir of the same index, and only those', function(done) {
      expectFilesExist(currResults, dirSet)
      expect(verifyNoneMissed(currResults, [0, 1, 2])).to.be.true
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

    it('should resolve to an array of arrays with same contents as the corresponding input dirs', function(done) {
      const dirListings = testSetup.getListings()
      getUniques([testDirs[0], testDirs[1], testDirs[2]])
      .then(results => {
        for (let i = 0; i < results.length; ++i) {
          const files = results[i]
          expect(files).to.be.an('array').that.has.all.members(dirListings[i])
        }
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

    it('should resolve to an empty array', function(done) {
      const dirListings = testSetup.getListings()
      getUniques([testDirs[0], testDirs[1], testDirs[2]])
      .then(results => {
        expect(results).to.be.an('array').that.is.empty
        done()
      })
      .catch(err => done(err))
    })
  })
})
