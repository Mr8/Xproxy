var net = require('net');
var XProxy = require('./XProxy.js').XProxy;

var localOptions = {
    localport: 8080,
    remoteHost: 'x.x.x.x',       // your server IP here
    remotePort: 8888,
    beforeForward: enc_xor,
    beforeBackword: dec_xor
}


var proxy = new XProxy(localOptions);
proxy.run();


function enc(buffer) {
    if (buffer) {
        for (var i = 0; i < buffer.length; i++) {
            buffer[i] = (~buffer[i]) & 0xFF;
        }
    };
    return buffer;
}

function dec(buffer) {
    // 加密解密是对称的
    return enc(buffer);
}


function enc_xor(buffer) {
    var key = 0xf1;
    if (buffer) {
        for (var i = 0; i < buffer.length; i++) {
            buffer[i] = buffer[i] ^ key;
        }
    };
    return buffer;
}

function dec_xor(buffer) {
    return enc_xor(buffer);  
}
