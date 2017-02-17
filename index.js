const awsIot = require('aws-iot-device-sdk')
const lambda = require('./skill-adapter-lambda.js')
const express = require('express')
const rcswitch = require('rcswitch-gpiomem')
const mqtt = require('mqtt')

const HTTP_PORT = 3000
const MQTT_BROKER = 'mqtt://ha-opi'
rcswitch.enableTransmit(17)

startAwsIoTListener()
startHttpListener()
const mqttClient = startMqttClient(MQTT_BROKER)


function startAwsIoTListener() {
  const device = awsIot.device({
    keyPath: './iot-us-east-1-private.pem.key',
    certPath: './iot-us-east-1-certificate.pem.crt',
    caPath: './ca.pem',
    clientId: lambda.uuid(),
    region: 'us-east-1',
    keepalive: 60
  })

  device
    .on('connect', function() {
      console.log('Connected to AWS IoT')
      device.subscribe(lambda.IOT_TOPIC)
    })

  device
    .on('message', function(topic, payload) {
      const payloadJson = JSON.parse(payload.toString())
      console.log('Message from AWS IoT:', topic, payloadJson)
      handleEvent(payloadJson)
    })
}

function startHttpListener() {
  const app = express()
  const bodyParser = require('body-parser')

  app.get('/switch/:applianceId', (req, res) => res.end())

  app.post('/switch/:applianceId', bodyParser.text({type: '*/*'}), function (req, res) {
    const event = { applianceId: req.params.applianceId, event: req.body.toLowerCase() === 'on' ? 'TurnOnRequest' : 'TurnOffRequest' }
    handleEvent(event)
    res.end()
  })

  app.listen(HTTP_PORT, () => console.log('Listening for HTTP on port ' + HTTP_PORT))
}

function startMqttClient(brokerUrl) {
  const client = mqtt.connect(brokerUrl)
  client.on('connect', () => console.log("Connected to MQTT server"))
  return client
}


function handleEvent(event) {
  switch (event.event) {
    case 'TurnOnRequest':
      switchOn(applianceById(event.applianceId))
      break;
    case 'TurnOffRequest':
      switchOff(applianceById(event.applianceId))
      break;
    default:
      console.log('Unsupported event:', event.event)
  }

  function switchOn(appliance) { switchOnOrOff(appliance, true)}
  function switchOff(appliance) { switchOnOrOff(appliance, false)}
  function switchOnOrOff(appliance, switchOn) {
    const rfConfig = appliance.rfConfig
    if(appliance && rfConfig) {
      if(switchOn)
        rcswitch.switchOn(rfConfig.family, rfConfig.group, rfConfig.device)
      else
        rcswitch.switchOff(rfConfig.family, rfConfig.group, rfConfig.device)
      mqttClient.publish(`/switch/intertechno/${rfConfig.family}/${rfConfig.group}/${rfConfig.device}/state`, switchOn ? 'ON' : 'OFF', { retain: true, qos: 1 })
    } else {
      console.log('No rfConfig for appliance!', appliance)
    }
  }
  function applianceById(applianceId) { return lambda.devices.find(d => d.applianceId === applianceId) }
}
