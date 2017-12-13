/*
This file is part of the Nervatura Framework
http://www.nervatura.com
Copyright © 2011-2017, Csaba Kappel
License: LGPLv3
https://raw.githubusercontent.com/nervatura/nervatura/master/LICENSE
*/

var readFileSync = require('fs').readFileSync;
var path = require('path');
var ejs = require('ejs')
var _cors = require('cors')();

var Lang = require('nervatura').lang;
var Conf = require('nervatura').conf;
var basicStore = require('nervatura').storage.basicStore;
var Nervastore = require('nervatura').nervastore;
var out = require('nervatura').tools.DataOutput()

function render(file, data, dir){
  dir = dir || "template"
  var template = path.join(out.getValidPath(),"..","views",dir,file)
  return ejs.compile(readFileSync(template, 'utf8'), {
    filename: template})(data); }

function sendResult(res, params){
  switch (params.type) {
    case "error":
      res.set('Content-Type', 'text/json');
      res.send({"id":params.id || -1, "jsonrpc": "2.0", 
        "error": {"code": params.ekey, "message": params.err_msg, "data": params.data}});
      break;
    
    case "csv":
      res.set('Content-Type', 'text/csv');
      res.set('Content-Disposition', 'attachment;filename='+params.filename+'.csv');
      res.send(params.data);
      break;
    
    case "html":
      res.set('Content-Type', 'text/html');
      res.send(render(params.tempfile, params.data, params.dir));
      break;
    
    case "xml":
      res.set('Content-Type', 'text/xml');
      res.send(render(params.tempfile, params.data));
      break;
    
    case "json":
      res.set('Content-Type', 'text/json');
      res.send({"id": params.id, "jsonrpc": "2.0", "result": params.data});
      break;

    default:
      res.send(params);
      break; }}

var version = require('./package.json').version+'-NJS/GCLOUD';
var app_settings = require('./lib/settings.json');
var conf = Conf(app_settings); var lang = Lang[conf.lang]

var databases = require('./lib/databases.json');
var storage = basicStore({ data_store: conf.data_store, databases: databases,
  conf: conf, lang: lang, data_dir: conf.data_dir, host_type: conf.host_type});
var nstore = Nervastore({ 
  conf: conf, data_dir: conf.data_dir, report_dir: conf.report_dir,
  host_ip: "", host_settings: conf.def_settings, storage: storage,
  lang: lang });

exports.ndi = function(req, res) {
  var Ndi = require('nervatura').ndi;
  _cors(req, res, function() {
    if(req.path === "/getVernum"){
      sendResult(res, version);}
    else {
      var params = null;
      switch (String(req.path).substring(1)) {
        case "jsonrpc":
        case "jsonrpc2":
          if(req.method === "POST")
            params = req.body;
          break;
        case "updateData":
        case "deleteData":
        case "getData":
          if(req.method === "GET"){
            params = req.query;
            params.method = String(req.path).substring(1); }
          break;
        default:
          break; }
      Ndi(lang).getApi(nstore, params, function(result){
        sendResult(res, result); });}});}

exports.npi = function(req, res) {
  var Npi = require('nervatura').npi;
  _cors(req, res, function() {
    if(req.path === "/getVernum"){
      sendResult(res, version);}
    else {
      if(req.method === "POST"){
        Npi(lang).getApi(nstore, req.body, function(result){
          sendResult(res, result); });}
      else {
        sendResult(res, {type:"error", id:-1, ekey:"invalid", err_msg: lang.unknown_method, data: ""}); }}});}

exports.nas = function(req, res) {
  var Nas = require('nervatura').nas;
  _cors(req, res, function() {
    var _params = (req.method === "POST") ? req.body : req.query;
    _params.method = String(req.path).substring(1);
    Nas().getApi(nstore, _params, function(result){
      sendResult(res, result); });});}

exports.docs = function Docs (req, res) {
  _cors(req, res, function() {
    switch (String(req.path).substring(1)) {
      case "nas":
      case "ndi":
      case "nom":
      case "npi":
      case "report":
        sendResult(res, {type: "html", dir: "docs", tempfile: String(req.path).substring(1)+".html", data: {}});
        break;
      default:
        sendResult(res, {type:"error", ekey:"invalid", err_msg: lang.unknown_method, data: ""});
        break; }});}