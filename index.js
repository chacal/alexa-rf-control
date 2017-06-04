const awsIot = require('aws-iot-device-sdk')
const lambda = require('./skill-adapter-lambda.js')
const rcswitch = require('rcswitch-gpiomem')
const mqtt = require('mqtt')

const MQTT_BROKER = 'mqtt://mqtt-home.chacal.fi'
rcswitch.enableTransmit(17)

startAwsIoTListener()
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

function startMqttClient(brokerUrl) {
  const client = mqtt.connect(brokerUrl, { queueQoSZero : false })

  client.on('connect', () => {
    console.log("Connected to MQTT server")
    client.subscribe('/switch/intertechno/+/+/+/command')
  })
  client.on('offline', () => console.log('Disconnected from MQTT server'))
  client.on('error', () => console.log('MQTT client error', e))

  client.on('message', (topic, message) => {
    console.log("Message from MQTT:", topic, message.toString())
    const [, , , family, group, device] = topic.split('/')
    switchDevice(family, group, device, message.toString().toLowerCase() === 'on')
  })

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
      switchDevice(rfConfig.family, rfConfig.group, rfConfig.device, switchOn)
    } else {
      console.log('No rfConfig for appliance!', appliance)
    }
  }
  function applianceById(applianceId) { return lambda.devices.find(d => d.applianceId === applianceId) }
}

function switchDevice(family, group, device, switchOn) {
  console.log("Switching device:", family, group, device, switchOn)
  if(switchOn)
    rcswitch.switchOn(family, parseInt(group), parseInt(device))
  else
    rcswitch.switchOff(family, parseInt(group), parseInt(device))
  mqttClient.publish(`/switch/intertechno/${family}/${group}/${device}/state`, switchOn ? 'ON' : 'OFF', { retain: true })
}
