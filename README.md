# Honeypot tcpdump logger

## Requirements

 - nodejs 8+
 
 - tcpdump
 
 - mysql
 
## Installation
 
 - clone git repository
 
 - npm i
 
 - rename config_example.js to config.js, and edit mysql connection preferences
 
 - create mysql schema by importing db.sql
 
 - install pm2 manager: npm i -g pm2
 
## Execution 
 
 - pm2 start logger.js
 
## Ready to use results
 
You can watch results aggregated from many honeypots on: https://honeypot.pro/
