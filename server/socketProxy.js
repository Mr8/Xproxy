var net = require('net');

var local_port = 1888;
var request_count = 0 ;

net.createServer({allowHalfOpen: false}, function(client){
    var buffer = new Buffer(0);

    client.on('data', function(data) {
        buffer = bufferAppend(buffer, data);

        if(posHttpRequestBody(buffer) == -1) {
            return;
        }

        var request = parseBuffer(buffer);

        //必须收到完整的HTTP头部 请求才会创建到远程服务器的代理连接
        if(request === false){
             return;
        }

        client.removeAllListeners('data');
        
        proxyServer(request);

    });

    function proxyServer(req){
        request_count += 1;
        console.log('===From start time, proxy request:' + request_count + ' ===\n');
        var remote = net.createConnection(req.port, req.host);

        //非 CONNCET 方式的连接请求，也就是正常的连接请求
        if(req.method != 'CONNECT'){
            console.log('New Request:\n' + req.method + ' ' + req.host + ':' + req.port + ' ' + req.path + '\n');
            var _body_pos = posHttpRequestBody(buffer);

            if(_body_pos < 0) _body_pos = buffer.length;

            var header = buffer.slice(0, _body_pos).toString('utf8');

            header = header.replace(/(proxy\-)?connection\:.+\r\n/ig, '')

            .replace(/Keep\-Alive\:.+\r\n/i, '')
            
            .replace("\r\n", '\r\nConnection: close\r\n');

            if(req.httpVersion == '1.1'){
                var url = req.path.replace(/http\:\/\/[^\/]+/, '');
                if(url.path != url){
                    //将头部的地址换做目标的绝对URL地址
                    header = header.replace(req.path, url);
                }
            }

            //将buffer 拼接，HTTP头部和Body部分
            buffer = bufferAppend(new Buffer(header, 'utf8'), buffer.slice(_body_pos));
        }

        console.log("创建到远程服务器连接成功");
        //注册一系列的事件处理回调函数在这里
        //以后有数据就直接转发
        client.on('data', function(data) {
            remote.write(data);
        });

        remote.on('data', function(data) {
            client.write(data);
        });

        client.on('end', function(){
            remote.end();
        });

        remote.on('end', function(){
            client.end();
        });

        //我想关闭 CONNECT 方法！！
        if(req.method == 'CONNECT'){
            console.log('New Request:\n' + req.method + ' ' + req.host + ':' + req.port + '\n');
            client.write(new Buffer("HTTP/1.1 200 Connection established\r\nConnection: close\r\n\r\n"));
        }else{
            //将此次调用 proxyServer函数的请求也转发，就一次，以后的数据交换由 client.on('data', function(data)) 处理
            remote.write(buffer);
        }
    }
}).listen(local_port);



console.log('Proxy server running at localhost:' + local_port);

process.on('uncaughtException', function(err){
    console.log(err);
});

function parseBuffer(buffer){

    var s = buffer.toString('utf8');

    var method = s.split('\n')[0] ;
    if( method ){
        method = method.match(/^([A-Z]+)\s/)[1];
    }

    if(method == 'CONNECT'){

        var arr = s.match(/^([A-Z]+)\s([^\:\s]+)\:(\d+)\sHTTP\/(\d\.\d)/);

        if(arr && arr[1] && arr[2] && arr[3] && arr[4]){
            return {
                method:      arr[1],
                host:        arr[2],
                port:        arr[3],
                httpVersion: arr[4]
            };
        }

    }else{
        var arr = s.match(/^([A-Z]+)\s([^\s]+)\sHTTP\/(\d\.\d)/);

        if(arr && arr[1] && arr[2] && arr[3]){

            var host = s.match(/Host\:\s+([^\n\s\r]+)/)[1];

            if(host){
                var _p = host.split(':', 2);
                return {
                    method:      arr[1],
                    host:        _p[0],
                    port:        _p[1] || 80,
                    path:        arr[2],
                    httpVersion: arr[3]
                };
            }
        }
    }
    return false;
}


//拼接两个buffer
function bufferAppend(buf1, buf2){
    var reBuf = null ;

    switch(buf1.length + buf2.length){

        case 0:reBuf = new Buffer(0);
            break;

        case 1:rebuf = buf1 || buf2 ;
            break;

        default:
            reBuf = new Buffer(buf1.length + buf2.length);
            buf1.copy(reBuf);
            buf2.copy(reBuf, buf1.length);
            break;
    }
    return reBuf;
}


function posHttpRequestBody(buffer){
    if(buffer.length < 3){
        return -1;
    }
    for(var i = 0; i < buffer.length - 3; i++){
        // find CLRF  '\r\n\r\n'
        if(buffer[i] == 0x0d && buffer[i+1] == 0x0a && buffer[i+2] == 0x0d && buffer[i+3] == 0x0a){
            return i + 4;
        }
    }
    return -1;
}

