'use strict';
const neeoapi = require('neeo-sdk');
//Wemo
 const wemo_controller = require('./wemo_controller');

console.log('NEEO SDK');
console.log('--------');


const wemoTCP = neeoapi.buildDevice('Wemo TCP')
  .setManufacturer('Belkin')
  .addAdditionalSearchToken('Wemo')
  .setType('LIGHT')
  .enableDiscovery({headerText: 'discovering', description: 'discovering'}, wemo_controller.discoverWemo)
  .addButton({ name: 'POWER ON', label: 'POWER ON' })
  .addButton({ name: 'POWER OFF', label: 'POWER OFF' })
  .addButton({ name: 'POWER TOGGLE', label: 'POWER TOGGLE' })
  .addSwitch({ name: 'wemoSwitch', label: 'Power' },
  { setter: wemo_controller.switchSet, getter: wemo_controller.switchGet } )
  .addButtonHander(wemo_controller.onButtonPressed)
  .registerSubscriptionFunction(wemo_controller.registerStateUpdateCallback);

function startSdkExample(brain) {
  console.log('- Start server');
  neeoapi.startServer({
    brain,
    port: 6336,
    name: 'simple-adapter-one',
    devices: [wemoTCP, denonAVRTCP, skyQTCP]
  })
  .then(() => {
    console.log('# READY! use the NEEO app to search for "Wemo TCP".');
  })
  .catch((error) => {
    //if there was any error, print message out to console
    console.error('ERROR!', error.message);
    process.exit(1);
  });
}

const brainIp = process.env.BRAINIP;
if (brainIp) {
  console.log('- use NEEO Brain IP from env variable', brainIp);
  startSdkExample(brainIp);
} else {
  console.log('- discover one NEEO Brain...');
  neeoapi.discoverOneBrain()
    .then((brain) => {
      console.log('- Brain discovered:', brain.name);
      startSdkExample(brain);
    });
}
