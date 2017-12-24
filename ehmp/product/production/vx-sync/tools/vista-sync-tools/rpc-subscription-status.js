'use strict';

require('../../env-setup');
var inspect = require('util').inspect;
var rpcUtil = require(global.VX_UTILS + '/rpc-util');

var argv = require('yargs')
	.usage('Usage: $0 [options...]')
	.demand(['host', 'port'])
	.describe('host', 'IP Address of the VistA host')
	.describe('port', 'Port of the VistA host')
	.describe('accessCode', 'Value to use for accessCode for validation. Defaults to USER  ')
	.describe('verifyCode', 'Value to use for verifyCode for validation. Defaults to PW      ')
	.nargs('accessCode', 1)
	.nargs('verifyCode', 1)
	.describe('context', 'Context to set for running the RPC. Defaults to VPR SYNCHRONIZATION CONTEXT or HMP SYNCHRONIZATION CONTEXT')
	.describe('lastUpdate', 'Value of the lastUpdate received. Defaults to 0')
	.describe('hmpServerId', 'Value for the hmpServerId parameter. Defaults to hmp-development-box')
	.describe('logLevel', 'bunyan log levels, one of: trace, debug, info, warn, error, fatal. Defaults to error.')
	.argv;


var logger = require('bunyan').createLogger({
	name: 'rpc',
	level: argv.logLevel || 'error'
});

var config = {
	host: argv.host,
	port: argv.port,
	accessCode: argv.accessCode || 'USER  ',
	verifyCode: argv.verifyCode || 'PW      ',
	localIP: '127.0.0.1',
	localAddress: 'localhost',
	context: argv.context || 'HMP SYNCHRONIZATION CONTEXT',
	connectTimeout: 3000,
	sendTimeout: 10000
};

var rpc = 'HMP SUBSCRIPTION STATUS';
var params = {
	'"localId"': String(argv.dfn) ,
	'"server"': argv.hmpServerId || 'hmp-development-box'
};


rpcUtil.standardRPCCall(logger, config, rpc, params, null, function(error, response) {
	logger.debug('Completed calling Fetch RPC for dfn: %s; result: %j', argv.dfn, response);
	if (error) {
		console.log('Error calling Fetch');
		console.log(error);
		if (response) {
			console.log(response);
		}
		process.exit(1);
	}

	console.log('Called Fetch');
	console.log('Response:');
	try {
		console.log(inspect(JSON.parse(response), {
			depth: null
		}));
	} catch (err) {
		console.log(response);
	}
	process.exit(0);
});