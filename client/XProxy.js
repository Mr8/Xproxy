var net = require('net');

exports.XProxy = XProxy;

function XProxy(options) {
	this.options = options || {};
	this.run = Run;
	this.server = null;
	return this;
}

function Run() {
	var port = this.options.localport;
	var remoteHost = this.options.remoteHost;
	var remotePort = this.options.remotePort;
	var beforeForward = this.options.beforeForward || function(buffer){return buffer;};
	var beforeBackward = this.options.beforeBackward || function(buffer){return buffer;};

	var server = net.createServer({allowHalfOpen: false});
	this.server = server;

	server.listen(port, function(e){ console.log('listening...'); });

	// 监听来自客户端
	server.on('connection', function(socket){
		console.log('Accept from client: ' + socket.remoteAddress + ':' + socket.remotePort);

		//socket.setNoDelay();
		//socket.setKeepAlive(true);

		// 连接本地代理
		// 如果能够成功连接上，则开始进行转发
		var proxySocket = net.connect(remotePort, remoteHost);

		proxySocket.on('connect', function(buffer){
			console.log('Connected to remote host');

			//proxySocket.setNoDelay();
			//proxySocket.setKeepAlive(true);
		});

		// A --->>> B
		socket.on('data', function(buffer){
			console.log('Send data to Proxt Server:' + buffer.length);
			beforeForward(buffer);
			proxySocket.write(buffer);
		});

		socket.on('drain', function(){

		});

		socket.on('timeout', function(){

		});

		socket.on('close', function(){

		});

		socket.on('end', function(){
			//console.log('+client close -> proxy close');
			proxySocket.end();
		});

		socket.on('error', function(){

		});

		// A <<<--- B
		proxySocket.on('data', function(buffer){
			console.log('Receive data from remote Proxy Server:' + buffer.length);
			beforeBackward(buffer);
			socket.write(buffer);
		});

		proxySocket.on('drain', function(){

		});

		proxySocket.on('timeout', function(){

		});

		proxySocket.on('close', function(){

		});

		proxySocket.on('end', function(){
			//console.log('*proxy close -> client close');
			socket.end();
		});

		proxySocket.on('error', function(){

		});

	})

	server.on('close', function(){
		console.log('local server closed');
	});

	server.on('error', function(){
		console.log('local server error');
	});
}

