# Cool5 - Build Your Socks5 Proxy Chain Easily

### Killer Feature
**Lower chain latency than general product cause the usage of preconnection pool.**

### Platform
Cool5 is based on node.js (and 100% compatible with io.js), so you can run it under Windows/MacOS/Unix/Linux.

### Install
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
