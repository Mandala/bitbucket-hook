BitBucket WebHook Middleware
=============================

This middleware allows you to hook push event from BitBucket and execute some
actions such as `git-pull`.

## Getting Started

This middleware requires express and body-parser package to function properly.

```sh
npm install --save express body-parser bitbucket-hook
```

## Usage

Create simple web server using express with POST route containing the BitBucket
webhook middleware.

Middleware call guide:

```javascript
bitbucket('<repo user>/<repo name>', '<branch name>')
```

Example usage with express:

```javascript
// Include libraries
const express = require('express')
const bodyParser = require('body-parser')
const bitbucket = require('bitbucket-hook')
const exec = require('child_process').execFile

var app = express()
// Set this to enable X-Forwarded-For behind reverse proxy
app.set('trust proxy', 'loopback')
// Assign JSON body parser
app.use(bodyParser.json())

// Create web hook
app.post('/test', bitbucket('test/test', 'master'), function () {
  // Call shell script
  exec('doThings.sh', { stdio: 'inherit' }, function () {
    // Inform user that the script has done
    console.log('Done executing script')
  })
})

// Start web server
app.listen(3000, function () {
  console.log('BitBucket hook started at port 3000')
})
```

Please do not run synchronous process inside handler function as the web
server will completely stop working and will not handle any requests.
