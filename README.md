# The Smart Puck Configuration UI
The Smart Puck is an IoT sports memorabilia device that automatically tracks hockey player and team stats.
It is based on the Particle P1 module which supports WiFi configuration via SoftAP. This repo contains
the source for that configuration process.

## How it Works
The code in this repo can be executed locally in a web browser or hosted online. It instructs the 
user to connect to the SoftAP created by a Particle device that is in [listening mode](https://docs.particle.io/guide/getting-started/modes/photon/#listening-mode). 
It is capable of scanning for Wi-Fi networks and adding credentials to the Particle device that allows it 
to connect to a local network. It does NOT require any custom SoftAP configuration on the Particle device.

## Credits
The Smart Puck setup flow is based on the work of [mebrunet](https://github.com/mebrunet) which can be found at 
https://github.com/mebrunet/softap-setup-page