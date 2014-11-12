var connectRoute = require('connect-route');
var connect = require('connect');
var serveStatic = require('serve-static');
var wit = require('node-wit');

var ACCESS_TOKEN = "Z27S2JSXZROULMR7EH55MSU66ILMOSKY";

connect() 
.use(connectRoute(function (router) {
  router.get('/api/intent/:q', function (req, res, next) {
    wit.captureTextIntent(ACCESS_TOKEN, req.params.q, function (wit_err, wit_res) {
      if (wit_err) console.log("Error: ", wit_err);
      res.end(JSON.stringify(wit_res));
    });
  })
}))
.use(serveStatic(__dirname + "/www")).listen(3000);

/*
connect().use(connectRoute(function (router) {
  router.get('/', function (req, res, next) {
    serveStatic(__dirname + "/www").listen(3000);
  })
}));
*/