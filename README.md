# Cool5 - Socks5 Proxy's Proxy

### Intro

Cool5 is an optimized socks5 proxy chain server. It acts like an normal socks5 proxy for clients but actually forwards all the traffics to next 'real' proxy server. 

### Killer Feature

**Lower chain latency - suitable for game proxy.** 

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
