var awsIot = require('aws-iot-device-sdk')
var lambda = require('./skill-adapter-lambda.js')
var rcswitch = require('rcswitch-gpiomem')

rcswitch.enableTransmit(17)

var device = awsIot.device({
  keyPath: './iot-us-east-1-private.pem.key',
  certPath: './iot-us-east-1-certificate.pem.crt',
  caPath: './ca.pem',
  clientId: lambda.uuid(),
  region: 'us-east-1'
})

device
  .on('connect', function() {
    console.log('connect')
    device.subscribe(lambda.IOT_TOPIC)
  })

device
  .on('message', function(topic, payload) {
    var payloadJson = JSON.parse(payload.toString())
    console.log('message', topic, payloadJson)

    switch (payloadJson.event) {
      case 'TurnOnRequest':
        switchOn(applianceById(payloadJson.applianceId))
        break;
      case 'TurnOffRequest':
        switchOff(applianceById(payloadJson.applianceId))
        break;
      default:
        console.log('Unsupported event:', payloadJson.event)
    }


    function switchOn(appliance) { switchOnOrOff(appliance, true)}
    function switchOff(appliance) { switchOnOrOff(appliance, false)}
    function switchOnOrOff(appliance, switchOn) {
      var rfConfig = appliance.rfConfig
      if(appliance && rfConfig) {
        if(switchOn)
          rcswitch.switchOn(rfConfig.family, rfConfig.group, rfConfig.device)
        else
          rcswitch.switchOff(rfConfig.family, rfConfig.group, rfConfig.device)
      } else {
        console.log('No rfConfig for appliance!', appliance)
      }
    }
    function applianceById(applianceId) { return lambda.devices.find(d => d.applianceId === applianceId) }
  })