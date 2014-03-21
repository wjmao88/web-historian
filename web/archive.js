/* global require, exports */
var _ = require('underscore');
var path = require('path');
var http = require('http');
var https = require('https');
var mysql = require('mysql');
var connection = mysql.createConnection({
  host: 'localhost',
  user: 'wh2',
  password: ''
});

connection.connect();
//=========================================================
var nodeCryptojs = require('node-cryptojs-aes');
var passPhrase = '4j9h8trhg84tj9034uhf78h34fhg7'.toString("base64");
var CryptoJS = nodeCryptojs.CryptoJS;
var JsonFormatter = nodeCryptojs.JsonFormatter;

var encrypt = function(message){
  var encrypted = CryptoJS.AES.encrypt(message, passPhrase, { format: JsonFormatter });
  return encrypted.toString();
};

var decrypt = function(message){
  var decrypted = CryptoJS.AES.decrypt(message, passPhrase, { format: JsonFormatter });
  return CryptoJS.enc.Utf8.stringify(decrypted);
};
//=========================================================
exports.urlList = function(callback){
  var query = 'SELECT url from web_historian.websites';
  connection.query(query, function(err, rows) {
    callback(_.pluck(rows, 'url'));
  });
};

var readFile = function(url, callback){
  var query = 'SELECT * from web_historian.websites where url="'+url+'"';
  connection.query(query, function(err, rows) {
    if (err){
      throw err;
    } else if (rows.length === 0) {
      //not found
      callback();
    } else if (!rows[0].ct) {
      //not found
      callback('text/html', rows);
    } else {
      var obj = {};
      obj.ct = rows[0].ct.toString();
      obj.iv = rows[0].iv.toString();
      obj.s = rows[0].s.toString();
      callback(decrypt(JSON.stringify(obj)));
    }
  });
};

var updateHtml = function(url, html){
  var encrypted = JSON.parse(encrypt(html));
  var query = 'UPDATE web_historian.websites SET ';
  query += 'ct="' + encrypted['ct'] + '",';
  query += 'iv="' + encrypted['iv'] + '",';
  query += 's="' + encrypted['s'] + '" ';
  query += 'where url="'+url+'"';
  connection.query(query, function(err) {
    if (err) {
      throw err;
    }
  });
};

var addUrl = function(url){
  //update exports.loadFile to use this
  connection.query('INSERT INTO web_historian.websites (url) values("' + url +'")', function(err, rows) {
    if (err) {
      throw err;
    }
  });
};

//=========================================================
exports.scrapeData = function(url, callback, secure){
  console.log('start scraping', url, typeof url);

  var newUrl = secure ? 'http://'+url : 'https://'+url;
  var module = secure ? http : https;
  var req = module.get(newUrl, function(res) {
    var message = '';
    res.on('data', function (chunk) {
      message += chunk;
    });
    res.on('end', function(){
      updateHtml(url, message);
    });
  });

  req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
    if(!secure){
      exports.scrapeData(url, callback, true);
    }
  });
};

exports.loadFile = function(url, callback){
  readFile(url, function(data){
    if (!data) {
      console.log('non-existing file', url);
      addUrl(url);
      callback();
    } else {
      console.log('existing file', url);
      callback('text/html', data);
    }
  });
};
