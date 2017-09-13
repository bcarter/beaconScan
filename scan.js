var bleacon = require('bleacon');
var request = require('request');
var scannerID = process.env.SCANNER_ID;
var ordsUri = process.env.ORDS_URI;

//get the alerts for this scanner
var alerts = [];

request.get({
  url: ordsUri + 'alert/' + scannerID,
  json: true
}, function(err, res, body) {
  if (err) {
    console.log(err);
  }
  alerts = body;
  bleacon.startScanning(process.env.BEACON_UUID);
  /*replace with the UUID, Major, Minor of the beacons you want to track or remove it to track all ble signals*/
  console.log('Scanning:', alerts);
});

bleacon.on('discover', function(bleacon) {
  var uuid = bleacon.uuid,
    major = bleacon.major,
    minor = bleacon.minor,
    rssi = bleacon.rssi,
    accuracy = bleacon.accuracy.toFixed(2),
    distance = 0,
    proximity = bleacon.proximity;

  beaconId = uuid + ":" + major + ":" + minor;

  distance = calculateDistance(bleacon.major, bleacon.rssi).toFixed(2);

  //post beacon distance to the database
  request.post({
      url: ordsUri + 'scan',
      method: 'POST',
      json: {
        "scannerId": scannerID,
        "beaconId": beaconId,
        "distance": distance
      }
    },
    function(err, res, body) {
      console.log(body);
    });

  //Process the alerts
  //  alerts with a value of null will not be checked
  for (var i = 0; i < alerts.length; i++) {
    var alert = true;

    //Beacon is less than 'ltd' meters from scanner
    if (alerts[i].hasOwnProperty('ltd') && alerts[i].ltd !== null) {
      alert = alert && (distance < alerts[i].ltd);
    }

    //This alert is only active for 'hours' after 'startHour' (UTC)
    if (alerts[i].hasOwnProperty('startHour') && alerts[i].startHour !== null) {
      var currentHour = (new Date()).getHours();
      var hours = alerts[i].hours || 8;
      alert = alert && (currentHour >= alerts[i].startHour && currentHour < alerts[i].startHour + hours);
    }

    //Process the alert action
    if (alert) {
      console.log('major:', major,
        'minor:', minor,
        'rssi:', rssi,
        'accuracy:', accuracy,
        'distance', distance,
        'proximity:', proximity);

      var actions = alerts[i].actions;
      for (var j = 0; j < actions.length; j++) {
        if (actions[j].action === "ifttt") {
          iftttNotify(alerts[i].name, scannerID, beaconId, distance);
        }

        if (actions[j].action === "deadBolt") {
          deadBolt(actions[j].value);
        }

        if (actions[j].action === "sonosTts") {
          sonosTts(actions[j].value);
        }
      }
    }
  }
});

//Send a notification through IFTTT
//  You will need to have registered for a key and be using the phone app
//    to receive notifications
var notificationDates = {};
var IftttKey = process.env.IFTTT_KEY;
var iftttNotify = function(name, v1, v2, v3, delay) {
  console.log('ifttt called');

  //Only fire the event once every 60 seconds unless a different delay is passed in
  if (typeof(delay) === 'undefined') {
    delay = 60;
  }

  if (notificationDates.hasOwnProperty(name) === false || (new Date()) - notificationDates[name] > delay * 1000) {
    notificationDates[name] = new Date();
    request.post({
        url: 'https://maker.ifttt.com/trigger/' + name + '/with/key/' + IftttKey,
        method: 'POST',
        json: {
          "value1": v1,
          "value2": v2,
          "value3": v3
        }
      },
      function(err, res, body) {
        console.log(body);
      });
  }
};

var deadboltUri = process.env.DEADBOLT_URI;
var deadBolt = function(state, delay) {
  console.log('deadBolt called with', state);

  //Only fire the event once every 60 seconds unless a different delay is passed in
  if (typeof(delay) === 'undefined') {
    delay = 60;
  }

  if (notificationDates.hasOwnProperty('deadBolt') === false || (new Date()) - notificationDates.deadBolt > delay * 1000) {
    notificationDates.deadBolt = new Date();
    request.post({
        url: deadboltUri + state,
        method: 'POST',
        json: {
          "entity_id": "lock.schlage_be469nxcen_touchscreen_deadbolt_locked"
        }
      },
      function(err, res, body) {
        console.log(body);
      });
  }
};

var sonosTtsUri = process.env.SONOS_TTS_URI;
var sonosVolUri = process.env.SONOS_VOL_URI;
var sonosTts = function(message, delay) {
  console.log('Sonos called with', message);

  //Only fire the event once every 60 seconds unless a different delay is passed in
  if (typeof(delay) === 'undefined') {
    delay = 60;
  }

  if (notificationDates.hasOwnProperty('sonosTts') === false || (new Date()) - notificationDates.sonosTts > delay * 1000) {
    notificationDates.sonosTts = new Date();
    //Set the volume to max
    request.post({
        url: sonosVolUri,
        method: 'POST',
        json: {
          "entity_id": "media_player.danielles_sonos",
          "volume_level": "1"
        }
      },
      function(err, res, body) {
        console.log(body);
      });

      //speak the message
      request.post({
          url: sonosTtsUri,
          method: 'POST',
          json: {
            "entity_id": "media_player.danielles_sonos",
            "message": message
          }
        },
        function(err, res, body) {
          console.log(body);
        });
  }
};

var distanceQueues = {};

function calculateDistance(major, rssi) {
  var txPower = -59; //hard coded power value. Usually ranges between -59 to -65
  var distance;

  if (rssi === 0) {
    return -1.0;
  }

  var ratio = rssi * 1.0 / txPower;
  if (ratio < 1.0) {
    distance = Math.pow(ratio, 10);
  } else {
    distance = (0.89976) * Math.pow(ratio, 7.7095) + 0.111;
  }

  //Keep the last 5 scanned distances
  if (distanceQueues.hasOwnProperty(major) === false) {
    distanceQueues[major] = (Array.apply(null, Array(5))).map(function() {
      return distance;
    });
  } else {
    distanceQueues[major].push(distance);
    distanceQueues[major].shift();
  }

  //Calculate a rolling weighted average for the distance
  //  to smooth out the spikes.
  var sum = 0;
  var weight = 0;

  for (var i = 0; i < distanceQueues[major].length; i++) {
    sum += (i + 1) * distanceQueues[major][i];
    weight += i + 1;
  }

  var avg = sum / weight;

  return avg;
}
