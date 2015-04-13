# Cool5 - Socks5 Proxy's Proxy

### Intro

Cool5 is an optimized socks5 proxy chain server. It acts like an normal socks5 proxy for clients, but actually forwards (and backwards) all the traffics between clients and backend 'real' proxy servers.

### Features

- **Lower chain latency - suitable for game proxy** 
- Reliable, verified in production environment for thousands of hours
- Good Performance, 10000 concurrent connections is ok
- Developer Friendly, with good tests, clean code and complete documents
- Cross Platform, works on Windows/OSX/Unix/Linux

### Install

Cool5 is based on [node.js](https://nodejs.org/), please install it before you get start. Then you can excute the command below to install cool5.

```
npm install cool5
```

### Usage
Start with command line arguments:
```
node cool5.js -lh <local-host> -lp <local-port> -rh <remote-host> -rp <remote-port>
```
Start with config file (JSON file):
```
node cool5.js -c <config-file>
```

### Config File Format

```javascript
{
  "local": {
    "host": "0.0.0.0",          // IP or Domain Name
    "port": 1080                // Any available port
  },
  "remote": {
    "host": "XXX.XXX.XXX.XXX",  // Ip or Domain Name
    "port": 1080                // Any availabel port
  }
}
```

### Developer Reference
Goto our [wiki](https://github.com/zetsingithub/cool5/wiki) page to get more details.
