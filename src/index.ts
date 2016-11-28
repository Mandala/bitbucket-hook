/**
 * BitBucket webhook handler middleware for Express
 * Please see README.md for middleware usage
 * Copyright (c) 2016 Fadhli Dzil Ikram
 */

'use strict'

import { RequestHandler } from 'express'

// This is IP regex from BitBucket webhook wiki page
const BitBucketIP = /^104\.192\.143\.(1?[0-9]{1,2}|2[0-4][0-9]|25[0-5])$/

// JSON bitbucket data skeleton
export interface BitbucketData {
  repository: {
    scm: string
    full_name: string
  }
  push: {
    changes: [
      {
        new: {
          name: string
        }
      }
    ]
  } | undefined
}

/**
 * Bitbucket parser main function.
 */
export default function BitbucketHook (name: string, branch: string,
noIpCheck?: boolean): RequestHandler {
  return function Middleware (req, res, next) {
    let body: BitbucketData = req.body
    // Check if body data was not parsed with JSON parser
    if (!(body instanceof Object)) {
      res.status(500).end('500 JSON Parser Error')
      return next(new Error('Please use JSON parser'))
    }
    // Check for bitbucket IP
    if (noIpCheck !== true && !BitBucketIP.test(req.ip)) {
      return next('route')
    }
    // Check if the repository name is match
    if (!body.push || body.repository.scm !== 'git'
    || body.repository.full_name !== name) {
      return next('route')
    }
    // Search for branch match
    for (let change of body.push.changes) {
      if (change.new.name === branch) {
        // Target branch found, send OK message to server
        res.end('200 OK')
        return next()
      }
    }
    // Inform server that repo match but no branch match
    res.end('200 Repository Match')
  }
}