#!/usr/bin/env node
const https = require('http');
const fs = require('fs');
const util = require('util');
const ReportTypes = { "enter" : 1, "exit": 2 };
const InitResults = { OK : 0, ERROR: 2, NO_MORE_INITS: 3  }
const configPath = "~/.iamconfig.json";

function addZeros(s) { if (s.toString().length == 1) s = '0' + s; return s;  }
var date = new Date();
var year = date.getFullYear().toString();
year = year[2] + '' + year[3];
var hourText = addZeros(date.getHours()) + ':' + addZeros(date.getMinutes());
var dateText = addZeros(date.getDate()) + "/" + addZeros((date.getMonth() + 1)) + "/" + year;

let config;

function saveConfig(saveconfig) {
    console.log("Saveing config " + JSON.stringify(saveconfig));
    config = saveconfig;
    fs.writeFileSync(configPath, JSON.stringify(saveconfig));
}

function report(config, type) {
    if (type) {
        https.get(`http://62.219.213.37:8000/ATRAN?${config.company}?${config.user}?${ReportTypes[type]}?' + ${dateText} + '?' + ${hourText} + '?0`, (resp) => {
          let data = '';

          // A chunk of data has been recieved.
          resp.on('data', (chunk) => {
            data += chunk;
          });
        
          // The whole response has been received. Print out the result.
          resp.on('end', () => {
            console.log(data);
          });
        
        }).on("error", (err) => {
          console.log("Error: " + err.message);
        });
    }
}

function init(phone) {
  console.log(`getting ${phone}'s login details..`);
  https.get(`http://62.219.213.37:8000/INITTEL/A${phone}.txt`, (resp) => {
    let data = '';
    // A chunk of data has been recieved.
    resp.on('data', (chunk) => {
      data += chunk;
    });
  
    // The whole response has been received. Print out the result.
    resp.on('end', () => {
      let analyzed = analyzeInit(data);
      if (analyzed.code != InitResults.ERROR) {
        saveConfig(analyzed);
        console.log(`Saved your phone number config please run again`);
        process.exit(-1);
      } 
      else console.log(`We were unable to retreive your phone data. ERR CODE: ${analyzed.code} `);
    });
  
  }).on("error", (err) => {
    console.log("Error: " + err.message);
    process.exit(-1);
  });
}

function analyzeInit(initData) {
  let lines = initData.split('\n').map(function (line) { return line.trim(); });
  if (lines.length < 3) return -1;

    let object = {};
    object.code = lines[0];

    if (object.code == InitResults.OK || object.code == InitResults.NO_MORE_INITS) {
      object.company = lines[1];
      object.user = lines[2];
    }
    return object;
}

try {
  config = JSON.parse(fs.readFileSync(configPath));
} 
catch(e) {
  console.log("Please input your phone for a one time login:");
  process.stdin.on('data', function (text) {
    let phone = text.toString().trim();
    init(phone);
  });
}
finally {
    if (config) {
        if (process.argv.length <= 2) {
          console.log("Usage : report enter");
          console.log("        report exit")
          process.exit(-1);
        } else {
          report(config, process.argv[2]);
        }
  }
}
