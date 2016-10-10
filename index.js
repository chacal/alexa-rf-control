var awsIot = require('aws-iot-device-sdk')
var lambda = require('./skill-adapter-lambda.js')

var device = awsIot.device({
  keyPath: './iot-us-east-1-private.pem.key',
  certPath: './iot-us-east-1-certificate.pem.crt',
  caPath: './ca.pem',
  clientId: 'test-client',
  region: 'us-east-1'
})

device
  .on('connect', function() {
    console.log('connect')
    device.subscribe(lambda.IOT_TOPIC)
    //setInterval(function() { device.publish('topic_1', JSON.stringify({test_data: 1})) }, 3000)
  })

device
  .on('message', function(topic, payload) {
    console.log('message', topic, JSON.parse(payload.toString()))
  })
