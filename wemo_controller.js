'use strict';
let wemoClient = [];
let discovered = [];
let switchPowerState = [];
let sendComponentUpdate;
let content = '';
let options = '';
let req;
const Wemo = require('wemo-client');
const wemo = new Wemo();
const http = require('http');

// hard-coded event keys to work around componentupdate problem
let eventKeys = [];
eventKeys['08863BC9E7DC'] = '6294464749132316672:WEMOSWITCH_SENSOR'; // BEDROOM LAMP
eventKeys['08863BC9E5E4'] = '6295286454025191424:WEMOSWITCH_SENSOR'; // FAIRY LIGHTS
const neeoIp = '192.168.2.39';

function sendComponentUpdateNotification ( uniqueDeviceId, component, value) {
  console.log('content is.....',value);
  content = {
    type: eventKeys[uniqueDeviceId],
    data: (value === '1') ? true : false  
  };
  options = {
    hostname: neeoIp,
    port: 3000,
    path: '/v1/notifications',
    method: 'POST',
    headers: {'Content-Type': 'application/json'}
  };
  req = http.request(options, (res) => {
    res.setEncoding('utf8');
    res.on('data', function (body) {
        let reply = JSON.parse(body)
        console.log('JSON response %j', body);
        if (reply.success === true){
            console.log ('[NOTIFICATIONS]\tSuccesfully sent notification with value ' + content.data + ' to eventkey ' + content.type + ' @' + options.hostname);
        }
    });
  });
  req.on('error', function(e) {
    console.log ('[NOTIFICATIONS]\tProblem with request: ' + e.message);
  });
  req.write(JSON.stringify(content));
  req.end();
};

module.exports.switchSet = function(deviceid, value) {
  console.log('[CONTROLLER] switch set ', deviceid, value);
  switchPowerState[deviceid] = (value=== 'true') ? 1 : 0;
  wemoClient[deviceid].setBinaryState(switchPowerState[deviceid]);
};

module.exports.switchGet = function(deviceid) {
  let findmac = discoveredDbFindByMac(deviceid);
  if (findmac.length !== 0 ) {
    wemoClient[deviceid].getBinaryState(function(err, value) {
      switchPowerState[deviceid] = value;
      let transValue = switchPowerState[deviceid] === '1' ? true : false;
      console.log('[CONTROLLER] return switch get ', deviceid, switchPowerState[deviceid],transValue);
      return transValue;
    });
  }
  else
  {
    console.log('re-discovering');
    wemo.discover(foundDevice);
  }
};

function xUnusedDueToBugSsendComponentUpdateNotification ( uniqueDeviceId, component, value) {
  let transValue = (value === '1') ? 'true' : 'false';
  let updatePayLoad = { uniqueDeviceId, component, transValue };
  if (!sendComponentUpdate) {
    console.log('update function not registered');
    return;
    }
  console.log('updating switch value: %j', updatePayLoad);
  sendComponentUpdate(updatePayLoad)
  .catch((error) => {
    console.log('failed to send ' , error.message);
    });
}

module.exports.registerStateUpdateCallback = function(updateFunction) {
  console.log('[CONTROLLER] register update state');
  sendComponentUpdate = updateFunction;
};

module.exports.onButtonPressed = function(name, deviceid) {
  console.log(`[CONTROLLER] ${name} button pressed on ${deviceid}`);
  console.log('it was wemo ---- %s', deviceid);
  const findmac = discoveredDbFindByMac(deviceid);
  if (findmac.length !== 0 ) {
    console.log('switch it');
    switch (name) {     
    case "POWER ON":
      switchPowerState[deviceid] = 'true';
      wemoClient[deviceid].setBinaryState(1);
      break;
    case "POWER OFF":
      switchPowerState[deviceid] = 'false';
      wemoClient[deviceid].setBinaryState(0);
      break;
    case "POWER TOGGLE":
      switchPowerState[deviceid] = (switchPowerState[deviceid] === '1') ? '0' : '1';
       wemoClient[deviceid].setBinaryState(switchPowerState[deviceid]);
      break;
    }
  } else {
    wemo.discover(foundDevice);
  }
};

function discoveredDB() {
  return discovered;
}

function discoveredDbFindByMac(mac) {
  return discoveredDB().filter((db) => db.mac === mac);
};

//function discoveredDbFindByName(name) { 
//return discoveredDB().filter((db) => db.name === name);
//};

function discoverAdd(name, mac, device) {
  let findmac = discoveredDbFindByMac(mac);
  if (findmac.length === 0 ) {
    console.log("[WEMO] Found Wemo: " + name + " (" + mac + ")");
    discovered.push({mac: mac, name: name});
    console.log('trying to connect %s',discoveredDbFindByMac(mac).name);
    wemoClient[mac] = wemo.client(device);
    wemoClient[mac].on('error', function(err){ 
    console.log("Error: " + err.messge);
    });
    wemoClient[mac].on('binaryState', function(value) {
      console.log('received wemo from xx setting of xxx', mac, value, (value === '1') ? 'true' : 'false');
      switchPowerState[mac] = value;
      sendComponentUpdateNotification(mac, 'wemoSwitch', switchPowerState[mac]);
    });
  }
}

module.exports.discoverWemo = function() {
  console.log('[CONTROLLER] Wemo discover call');
  return discoveredDB().map((wem) => ({
  id: wem.mac,
  name: wem.name,
  reachable: true,
  }));
  wemo.discover(foundDevice);
};

function deviceName(device) {
  if (device.lenth === 1) {
    return device[0].name;
  } else {
    return '';
  }
}

function deviceMac(device) {
  if (device.length === 1) {
    return device[0].mac;
  } else {
    return '';
  }
}

function foundDevice(err, device) {
  if (device.deviceType === Wemo.DEVICE_TYPE.Switch) {
    console.log('Wemo Switch found: %s', device.friendlyName);
    discoverAdd(device.friendlyName, device.macAddress, device);
  }
};

wemo.discover(foundDevice);



