#!/usr/bin/nodejs

'use strict';

const net = require('net');
const spawn = require('child_process').spawn;
const mysql = require('mysql2');

const config = require('./config');

const connection = mysql.createConnection(config.mysql);

const udpdump = spawn('tcpdump', ['-n', 'inbound', 'and', 'udp']);
const tcpdump = spawn('tcpdump', ['-n', 'tcp[tcpflags] & (tcp-syn) != 0']);

const excludePorts = [];
const excludeAddrs = [
  '172.104.235.64',
  '192.168.142.232',
  '127.0.0.1',
  'localhost',
  '172.104.241.157',
  '192.168.135.144',
  '185.121.243.10'
];

let lastTcpLine = '';
let lastUdpLine = '';

function parseIP(ipStr) {
  let addrParts = ipStr.split('.');
  let port = addrParts[ addrParts.length - 1 ];
  let ipOctets = [];

  for(let i=0; i<=(addrParts.length-2); i++)
    ipOctets.push(addrParts[ i ]);
  
  let addr = ipOctets.join('.');

  if( !net.isIP(addr) )
    addr = null;

  return {
    addr: addr,
    port: parseInt(port)
  };
}

function parseLine(line, proto) {
  let parts = line.split(' ');
  let dstAddrParts = parseIP(parts[ 4 ]);
  let srcAddrParts = parseIP(parts[ 2 ]);

  return {
    addr: srcAddrParts.addr,
    port: dstAddrParts.port,
    proto: proto,
    req_time: parseInt(new Date() / 1000),
  };
}

function saveLog(info) {
  if( excludePorts.indexOf(info.port) > -1 )
    return;
    
  if( excludeAddrs.indexOf(info.addr) > -1 )
    return;

  for(let key in info)
    if( !info[ key ] ) {
      console.log('Bad info:', info);
      return;
    }

  let fields = [];
  for(let key in info)
    fields.push('`' + key + '`');

  let values = [];
  for(let key in info) {
    if( typeof(info[ key ]) == 'number' )
      values.push(info[ key ]);
    else
      values.push(`'` + info[ key ] + `'`);
  }

  let query = 'INSERT INTO access_logs (' + fields.join(',') + ') VALUES(' + values.join(',') + ')';
  connection.query(query);
}

udpdump.stdout.on('data', (data) => {
  let lines = `${data}`.split('\n');
  let lastUdpLineNum = lines.length - 1;
  let toNum = lines.length - 1;

  lines[ 0 ] = lines[ 0 ] + lastUdpLine;

  if( lines[ lastUdpLineNum ].indexOf('\n') == -1 ) {
    lastUdpLine = lines[ lastUdpLineNum ];
    toNum --;
  } else
    lastUdpLine = '';

  for(let i=0; i<=toNum; i++) {
    saveLog( parseLine(lines[ i ], 'udp') );
  } 
});

tcpdump.stdout.on('data', (data) => {
  let lines = `${data}`.split('\n');
  let lastTcpLineNum = lines.length - 1;
  let toNum = lines.length - 1;

  lines[ 0 ] = lines[ 0 ] + lastTcpLine;

  if( lines[ lastTcpLineNum ].indexOf('\n') == -1 ) {
    lastTcpLine = lines[ lastTcpLineNum ];
    toNum --;
  } else
    lastTcpLine = '';

  for(let i=0; i<=toNum; i++) {
    saveLog( parseLine(lines[ i ], 'tcp') );
  } 
});

udpdump.stderr.on('data', (data) => {
  console.log(`stderr: ${data}`);
});

tcpdump.stderr.on('data', (data) => {
  console.log(`stderr: ${data}`);
});

udpdump.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});

tcpdump.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});
