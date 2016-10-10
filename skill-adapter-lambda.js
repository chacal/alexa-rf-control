/**
 * This is an Alexa Smart Home skill adapter for alexa-rf-control project.
 * The adapter needs to be deployed as AWS Lambda function and Alexa skill configured to use it.
 */
var AWS = require("aws-sdk")

var devices = [
  {
    applianceId: 'upper-livingroom',
    name: 'Upper Livingroom Light'
  },
  {
    applianceId: 'lower-livingroom',
    name: 'Lower Livingroom Light'
  },
  {
    applianceId: 'livingroom-table',
    name: 'Livingroom Table Lights'
  },
  {
    applianceId: 'bar-table',
    name: 'Bar Table Light'
  },
  {
    applianceId: 'worktop',
    name: 'Worktop Light'
  },
  {
    applianceId: 'kitchen',
    name: 'Kitchen Light'
  }
]

/**
 * Main entry point.
 * Incoming events from Alexa Lighting APIs are processed via this method.
 */
exports.handler = function(event, context) {

  log('Input', event)

  switch (event.header.namespace) {

    case 'Alexa.ConnectedHome.Discovery':
      handleDiscovery(event, context)
      break;

    case 'Alexa.ConnectedHome.Control':
      handleControl(event, context)
      break;

    default:
      log('Err', 'No supported namespace: ' + event.header.namespace)
      context.fail('Something went wrong')
      break;
  }
}

function handleDiscovery(accessToken, context) {
  var discoveryResponse = {
    "header": {
      "messageId": uuid(),
      "name": "DiscoverAppliancesResponse",
      "namespace": "Alexa.ConnectedHome.Discovery",
      "payloadVersion": "2"
    },
    "payload": {
      "discoveredAppliances": devices.map(d => createApplianceJson(d.applianceId, d.name))
    }
  }

  log('Discovery', discoveryResponse)
  context.succeed(discoveryResponse)

  function createApplianceJson(applianceId, applianceName) {
    return {
      "actions": [
        "turnOn",
        "turnOff"
      ],
      "applianceId": applianceId,
      "friendlyDescription": applianceName,
      "friendlyName": applianceName,
      "isReachable": true,
      "manufacturerName": "Intertechno",
      "modelName": "Wireless Switch",
      "version": "v1.0"
    }
  }
}

/**
 * Control events are processed here.
 * This is called when Alexa requests an action (IE turn off appliance).
 */
function handleControl(event, context) {
  var iotdata = new AWS.IotData({endpoint: 'https://a3a3dfq53g738j.iot.us-east-1.amazonaws.com'})
  var params = {
    topic: 'topic_1',
    payload: 'Test data from Lambda!',
    qos: 0
  }
  iotdata.publish(params, function(err, data) {
    if (err) console.log(err, err.stack) // an error occurred
    else{
      console.log("message sent")           // successful response
      var headers = {
        namespace: 'Control',
        name: 'SwitchOnOffResponse',
        payloadVersion: '1'
      }
      var payloads = {
        success: true
      }
      var result = {
        header: headers,
        payload: payloads
      }
      log('Done with result', result)
      context.succeed(result)
    }
  })
}

/**
 * Utility functions.
 */
function log(title, msg) {
  console.log('*************** ' + title + ' *************')
  console.log(msg)
  console.log('*************** ' + title + ' End*************')
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8)
    return v.toString(16)
  })
}