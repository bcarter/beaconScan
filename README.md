# beaconScan

beaconScan was created for the [ODTUG 2017 GeekAThon](http://competition.odtug.com/pls/apex/f?p=16557:1)

## Problem to solve
My son attends a school where the students have some ‘bonus features’, or as the school puts it: “Educating Exceptional People".  There are some students at his school who try to wander away.  

There are commercial systems available that can notify the administration and/or lock doors when the beacon they are wearing is detected in a hazardous zone, such as leaving the school.  The problem is, those systems can be expensive.

A little open source software on some Raspberry Pis would be a lot more affordable.

## Installation
1. Install Raspbian Linux on a Raspberry Pi with bluetooth.
2. sudo apt-get update
3. sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev
4. reboot
5. cd ~/
6. git clone
7. cd beaconScan
8. sudo npm install
9. Connect to your DB as sys
10. @beacon_master_install.sql
11. create environment variables
  1. SCANNER_ID – The ID for this scanner.
  2. IFTTT_KEY – your account key for IFTTT
  3. ORDS_URI – Example: http://192.168.0.123:8080/ords/beacon/beacon/alert/
  4. BEACON_UUID – UUID of the beacon you’re tracking.
  5. DEADBOLT_URI – URI for the REST API to unlock the deadbolt.
12. Run the application using sudo for access to bluetooth:
sudo -E node scanBleacon.js

## Database
I designed the system to use a database in order to simplify running as many Raspberry Pi as may be needed and to track each time a beacon is detected by a scanner.  The alerts and actions for each Raspberry Pi are stored in the database so it can be re-purposed when needed without having to modify the on-board software.

Each Raspberry Pi can trigger multiple alerts each with one or more actions.  For example, I may want one alert to always trigger but a second alert only triggers during a certain time of the day.

### Table Diagram

![TableDiagram](https://raw.githubusercontent.com/bcarter/beaconScan/master/TableDiagram.png)

### Column Comments
* ALERTS: Trigger alert when the following conditions are met.
  * LTD:  'Less Than Distance in Meters'
  * STARTHOUR:   'Alert is active after this hour (UTC)'
  * HOURS: 'If STARTHOUR is populated, alert will stay active for this many hours'
* ACTIONS
  * ACTION:  'Function to run'
  * VALUE:  'Value passed to function'

The application can be altered to run without a database by:
* Removing the request.get near the beginning of the application and manually defining the alerts array in each scanner.  For example:
```javascript
[{"name":"Outside",
     "description":null,
     "ltd":1,
     "startHour":null,
     "hours":null,
     "actions":[{"action":"ifttt",
            "value":null},
           {"action":"deadBolt",
            "value":"unlock"}
           {"action":"sonosTts",
            "value":"Unlocking the front door"}]
 }]
```
* Removing the request.post call after the comment “//post beacon distance to the database”.

### Enable Beacon Position Tracking
This will require placing multiple Raspberry Pi in known locations and using [Trilateration](https://en.wikipedia.org/wiki/Trilateration) to determine the beacons location relative to the sensors.

The application is already collecting this data.  My setup is using an Oracle Database so this won't be difficult if I use the Oracle Spatial features.
