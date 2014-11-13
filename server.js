var connectRoute = require('connect-route');
var connect = require('connect');
var serveStatic = require('serve-static');
var wit = require('node-wit');
var cheerio = require('cheerio');
var request = require('request');

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
.use(connectRoute(function (router) {
  router.get('/api/weather/forecast/:lat/:lon/:begin/:end', function (req, res, next) {
    request('http://graphical.weather.gov/xml/sample_products/browser_interface/ndfdXMLclient.php?lat=' + req.params.lat + '&lon=' + req.params.lon + '&product=time-series&begin=' + req.params.begin + '&end=' + req.params.end, function(err, resp, xml){
      var $ = cheerio.load(xml);
      
      //build time ranges
      var timeRanges = {};
      $('data time-layout').each(function(){
        var key = $(this).find('layout-key').text();
        var times = [];
        var startTime = false;
        var endTime = false;
        var name = false;
        $(this).children().each(function(){
          if ($(this).get(0).tagName == 'start-valid-time' && startTime) {
            times.push({startTime: startTime, endTime:endTime, name:name});
            startTime = false;
            endTime = false;
            name = false;
          } 
          
          if ($(this).get(0).tagName == 'start-valid-time') {
            startTime = $(this).text();
            if ($(this).attr('period-name')) name = $(this).attr('period-name');
          } else if ($(this).get(0).tagName == 'end-valid-time') {
            endTime = $(this).text();
          }
        });
        times.push({startTime: startTime, endTime:endTime, name:name});
        timeRanges[key] = times;
      });
      
      
      //build parameters
      var parameters = {};
      $('data parameters').children().each(function(){
        switch($(this).get(0).tagName) {
          case 'temperature':
          case 'precipitation':
          case 'wind-speed':
          case 'direction':
          case 'cloud-amount':
          case 'probability-of-precipitation':
          case 'fire-weather':
          case 'wind-speed':
          case 'humidity':
            var tag = $(this).get(0).tagName;
            var type = $(this).attr('type');
            var units = $(this).attr('units');
            var timeLayout = $(this).attr('time-layout');
            var name = $(this).find('name').text();
            var values = [];
            $(this).find('value').each(function(){
              values.push($(this).text());
            });
            var dataName = name.toLowerCase().replace(/\,/g, "").replace(/\s+/g, "-");
            parameters[dataName] = {
              section: tag,
              name: name,
              units: units,
              timeLayout: timeLayout,
              values: values
            };
            break;
          case 'weather':
            var tag = $(this).get(0).tagName;
            var timeLayout = $(this).attr('time-layout');
            var name = $(this).find('name').text();
            var values = [];
            $(this).find('weather-conditions').each(function(){
              var value = $(this).find('value').first();
              values.push({
                coverage: value.attr('coverage'),
                intensity: value.attr('intensity'),
                weatherType: value.attr('weather-type'),
                qualifier: value.attr('qualifier')
              });
            });
            var dataName = name.toLowerCase().replace(/\,/g, "").replace(/\s+/g, "-");
            parameters[dataName] = {
              section: tag,
              name: name,
              timeLayout: timeLayout,
              values: values
            };
            break;
          case 'convective-hazard':
            //to-do
            break;
          case 'climate-anomaly':
            //to-do
            break;
          case 'hazards':
            var tag = $(this).get(0).tagName;
            var timeLayout = $(this).attr('time-layout');
            var name = $(this).find('name').text();
            var values = [];
            $(this).find('hazard-conditions').each(function(){
              console.log($(this).html());
              var value = $(this).find('hazard');
              values.push({
                hazardCode: value.attr('hazardcode'),
                phenomena: value.attr('phenomena'),
                significance: value.attr('significance'),
                hazardType: value.attr('hazardtype'),
                hazardTextURL: value.find('hazardTextURL').text()
              });
            });
            var dataName = name.toLowerCase().replace(/\,/g, "").replace(/\s+/g, "-");
            parameters[dataName] = {
              section: tag,
              name: name,
              timeLayout: timeLayout,
              values: values
            };
            break;
          default:
            break;
        }
      });
      
      // assemble product
      var weather = {
        timeRanges: timeRanges,
        parameters: parameters
      };
      
      res.end(JSON.stringify(weather));
    });
  })
}))
.use(serveStatic(__dirname + "/www")).listen(3000);

