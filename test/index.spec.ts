/**
 * Sample test file for TypeScript project
 * You should always use .spec.ts as the extension of the test file
 * and "import mocha = require('mocha')" to fix compile error on Windows
 * Copyright (c) 2016 Fadhli Dzil Ikram
 */

'use strict'

import mocha = require('mocha')
import chai = require('chai')
import chaiAsPromised = require('chai-as-promised')
import chaiHttp = require('chai-http')
import { expect } from 'chai'
chai.use(chaiAsPromised)
chai.use(chaiHttp)

import * as express from 'express'
import { Server } from 'http'
import { Express, ErrorRequestHandler, RequestHandler } from 'express'
import * as bodyParser from 'body-parser'
import { exec, ChildProcess } from 'child_process'
import middleware from '../src'

const TestPort = 18018
const Payload = {
  "repository": {
    "scm": "git",
    "full_name": "test/test"
  },
  "push": {
    "changes": [
      {
        "new": {
          "name": "master"
        }
      }
    ]
  }
}
const hgPayload = {
  "repository": {
    "scm": "hg",
    "full_name": "test/test"
  },
  "push": {
    "changes": [
      {
        "new": {
          "name": "master"
        }
      }
    ]
  }
}
const otherPayload = {
  "repository": {
    "scm": "git",
    "full_name": "test/test"
  }
}

describe('basic test', function () {
  it('expect middleware to return function', function () {
    expect(middleware('', '')).to.be.a('function')
  })
})

describe('functional test', function () {
  // Setup express server
  let app: Express
  let server: Server

  beforeEach(function (done) {
    app = express()
    app.set('trust proxy', 'loopback')
    server = app.listen(TestPort, done)
  })

  afterEach(function () {
    server.close()
  })

  it('expect error on no JSON parser', function() {
    let client = chai.request(server).post('/')
    return expect(
      worker(app, client, '/', middleware('', '', true))
    ).to.eventually.rejectedWith('JSON')
  })

  it('expect error on ip mismatch', function () {
    app.use(bodyParser.json())
    let client = chai.request(server).post('/').send(Payload)
    return expect(
      worker(app, client, '/', middleware('test/test', 'master'))
    ).to.eventually.rejectedWith('NotFound')
  })

  it('expect OK on ip bypass', function () {
    app.use(bodyParser.json())
    let client = chai.request(server).post('/').send(Payload)
    return expect(
      worker(app, client, '/', middleware('test/test', 'master', true))
    ).to.eventually.contain('OK')
  })

  it('expect OK on ip match', function () {
    app.use(bodyParser.json())
    let client = chai.request(server).post('/')
    .set('X-Forwarded-For', '104.192.143.1').send(Payload)
    return expect(
      worker(app, client, '/', middleware('test/test', 'master'))
    ).to.eventually.contain('OK')
  })

  it('expect error on event mismatch', function () {
    app.use(bodyParser.json())
    let client = chai.request(server).post('/').send(otherPayload)
    return expect(
      worker(app, client, '/', middleware('test/test', 'master', true))
    ).to.eventually.rejectedWith('NotFound')
  })

  it('expect error on scm mismatch', function () {
    app.use(bodyParser.json())
    let client = chai.request(server).post('/').send(hgPayload)
    return expect(
      worker(app, client, '/', middleware('test/test', 'master', true))
    ).to.eventually.rejectedWith('NotFound')
  })

  it('expect error on repository name mismatch', function () {
    app.use(bodyParser.json())
    let client = chai.request(server).post('/').send(Payload)
    return expect(
      worker(app, client, '/', middleware('test/other', 'master', true))
    ).to.eventually.rejectedWith('NotFound')
  })

  it('expect repo match on branch not found', function () {
    app.use(bodyParser.json())
    let client = chai.request(server).post('/').send(Payload)
    return expect(
      worker(app, client, '/', middleware('test/test', 'dev', true))
    ).to.eventually.contain('Repository Match')
  })

  describe('async process creation', function () {
    let child: ChildProcess

    // Clean up sleeping process
    after(function () {
      if (child) {
        child.kill()
      }
    })

    it('expect no blocking on script execution', function () {
      app.use(bodyParser.json())
      let client = chai.request(server).post('/').send(Payload)
      return expect(
        worker(app, client, '/', middleware('test/test', 'master', true),
          () => { child = exec('sleep 10') }
        )
      ).to.eventually.contain('OK')
    })
  })
})

function worker (app: Express, client: any, path: string, md: RequestHandler,
nextfn?: RequestHandler) {
  return new Promise((resolve, reject) => {
    nextfn = nextfn || function() {}
    let notFound: RequestHandler = (req, res, next) => {
      reject(new Error('NotFound'))
    }
    let serverError: ErrorRequestHandler = (err, req, res, next) => {
      reject(err)
    }
    app.post(path, md, nextfn)
    app.use(notFound)
    app.use(serverError)

    client.end((err: any, val: any) => {
      if (err) {
        reject(err)
      } else {
        resolve(val.text)
      }
    })
  })
}
