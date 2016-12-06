/**
 * This is an Alexa Smart Home skill adapter for alexa-rf-control project.
 * The adapter needs to be deployed as AWS Lambda function and Alexa skill configured to use it.
 */
var AWS = require("aws-sdk")
var iotdata = new AWS.IotData({endpoint: 'https://a3a3dfq53g738j.iot.us-east-1.amazonaws.com'})
var IOT_TOPIC = 'rf-control'

var devices = [
  {
    applianceId: 'upper-livingroom',
    name: 'Olohuone ylempi',
    rfConfig: {
      family: 'a',
      group: 1,
      device: 1
    }
  },
  {
    applianceId: 'lower-livingroom',
    name: 'Olohuone alempi',
    rfConfig: {
      family: 'a',
      group: 1,
      device: 2
    }
  },
  {
    applianceId: 'livingroom-table',
    name: 'Olohuone pöytä',
    rfConfig: {
      family: 'a',
      group: 1,
      device: 3
    }
  },
  {
    applianceId: 'bar-table',
    name: 'Työtaso vasen',
    rfConfig: {
      family: 'b',
      group: 1,
      device: 2
    }
  },
  {
    applianceId: 'worktop',
    name: 'Työtaso oikea',
    rfConfig: {
      family: 'b',
      group: 1,
      device: 3
    }
  },
  {
    applianceId: 'kitchen',
    name: 'Keittiö',
    rfConfig: {
      family: 'b',
      group: 1,
      device: 1
    }
  },
  {
    applianceId: 'bedroom',
    name: 'Makuuhuone',
    rfConfig: {
      family: 'b',
      group: 1,
      device: 4
    }
  },
  {
    applianceId: 'childroom',
    name: 'Lastenhuoneen pöytävalo',
    rfConfig: {
      family: 'c',
      group: 1,
      device: 1
    }
  },
  {
    applianceId: 'christmas',
    name: 'Olohuoneen jouluvalo',
    rfConfig: {
      family: 'c',
      group: 1,
      device: 2
    }
  }
]

/**
 * Main entry point.
 * Incoming events from Alexa Lighting APIs are processed via this method.
 */
exports.handler = function(event, context) {
  console.log('Input', event)

  switch (event.header.namespace) {
    case 'Alexa.ConnectedHome.Discovery':
      handleDiscovery(event, context)
      break;
    case 'Alexa.ConnectedHome.Control':
      handleControl(event, context)
      break;
    default:
      console.log('Err', 'No supported namespace: ' + event.header.namespace)
      context.fail('No supported namespace: ' + event.header.namespace)
      break;
  }
}


function handleDiscovery(event, context) {
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

  console.log('Discovery', discoveryResponse)
  context.succeed(discoveryResponse)

  function createApplianceJson(applianceId, applianceName) {
    return {
      "actions": [
        "turnOn",
        "turnOff"
      ],
      "applianceId": applianceId,
      "friendlyDescription": 'Description',
      "friendlyName": applianceName,
      "isReachable": true,
      "manufacturerName": "Intertechno",
      "modelName": "Wireless Switch",
      "version": "v1.0"
    }
  }
}


function handleControl(event, context) {
  if(event.header.name === 'TurnOnRequest' || event.header.name === 'TurnOffRequest') {
    iotdata.publish(iotEventFor(event), function(err, data) {
      if (err) {
        console.log(err, err.stack)
        context.fail('Failed to publish IoT event!')
      } else {
        context.succeed(confirmationFor(event))
      }
    })
  } else {
    console.log('Err', 'Unsupported control request:', event.header.name)
    context.fail('Unsupported control request!')
  }

  function iotEventFor(event) {
    return {
      topic: IOT_TOPIC,
      payload: JSON.stringify({
        event: event.header.name,
        applianceId: event.payload.appliance.applianceId
      }),
      qos: 0
    }
  }

  function confirmationFor(event) {
    return {
      header: {
        messageId: uuid(),
        name: event.header.name === 'TurnOnRequest' ? 'TurnOnConfirmation' : 'TurnOffConfirmation',
        namespace: "Alexa.ConnectedHome.Control",
        payloadVersion: "2"
      },
      payload: {}
    }
  }
}

/**
 * Utility functions.
 */
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8)
    return v.toString(16)
  })
}

module.exports.IOT_TOPIC = IOT_TOPIC
module.exports.devices = devices
module.exports.uuid = uuid