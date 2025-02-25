'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const fs = require('fs')
const path = require('path')
const Fastify = require('../..')

let fastify
try {
  fastify = Fastify({
    https: {
      key: fs.readFileSync(path.join(__dirname, 'fastify.key')),
      cert: fs.readFileSync(path.join(__dirname, 'fastify.cert'))
    }
  })
  t.pass('Key/cert successfully loaded')
} catch (e) {
  t.fail('Key/cert loading failed', e)
}

test('https get', t => {
  t.plan(1)
  try {
    fastify.get('/', function (req, reply) {
      reply.code(200).send({ hello: 'world' })
    })
    fastify.get('/proto', function (req, reply) {
      reply.code(200).send({ proto: req.protocol })
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

fastify.listen(0, err => {
  t.error(err)
  fastify.server.unref()

  test('https get request', t => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'https://localhost:' + fastify.server.address().port,
      rejectUnauthorized: false
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })
  })

  test('https get request without trust proxy - protocol', t => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'https://localhost:' + fastify.server.address().port + '/proto',
      rejectUnauthorized: false
    }, (err, response, body) => {
      t.error(err)
      t.same(JSON.parse(body), { proto: 'https' })
    })
    sget({
      method: 'GET',
      url: 'https://localhost:' + fastify.server.address().port + '/proto',
      rejectUnauthorized: false,
      headers: {
        'x-forwarded-proto': 'lorem'
      }
    }, (err, response, body) => {
      t.error(err)
      t.same(JSON.parse(body), { proto: 'https' })
    })
  })
})
