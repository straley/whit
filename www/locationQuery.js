function LocationQuery(whit, outcome) {
  this.outcome = outcome;
  this.whit = whit;
  this.currentLocation = null;
  this.locations = [];
  this.locationsCoded = [];

  var self = this;
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position){
      self.currentLocation = {lat: position.coords.latitude, lon: position.coords.longitude};
      self.processLocation();
    });
  } else {
    this.processLocation();
  }
}

LocationQuery.prototype.processLocation = function() {
  var self = this;
  
  if (this.outcome.entities.location) {
    $.each(this.outcome.entities.location, function(i, location){
      self.locations.push(location.value);
    });
  }

  if (this.locations.length === 0) {
    // get current location
    if (this.currentLocation) {
      this.locationsCoded.push(this.currentLocation);
      this.processInquiry();
    }
  } else {
    // lookup locations
    var messageParameters = {};
    if (this.locations.length>0) messageParameters.location = this.locations[0];
    var msg = self.whit.loadMessage('location_lookup', messageParameters);
    console.log(msg);
    this.fetchNextLocation();
  }
};

LocationQuery.prototype.fetchNextLocation = function() {
  var self = this;
  
  if (this.locations && this.locations.length > 0) {
    var loc = this.locations.pop();
    $.getJSON("//nominatim.openstreetmap.org/search/" + loc.replace(/\s+/, '%20') + "?format=json", function(data){
      // get nearest place
      var nearestPlace = false;
      var nearestDistance = 999999;
      $.each(data, function(i, loc){
        if (loc.class == "place") {
          if (self.currentLocation) {
            var distance = Math.sqrt(Math.pow(parseFloat(loc.lat) - self.currentLocation.lat,2) + Math.pow(parseFloat(loc.lon) - self.currentLocation.lon,2));
            if (distance < nearestDistance) {
              nearestPlace = loc;
              nearestDistance = distance;
            }
          } else {
            if (nearestDistance>0) {
              nearestPlace = loc;
              nearestDistance = -1;
            }
          }
        }
      });
      
      self.locationsCoded.push({lat: nearestPlace.lat, lon: nearestPlace.lon, name: nearestPlace.display_name});
      self.fetchNextLocation();     
    });
  } else {
    var msg = self.whit.loadMessage('got_it', {});
    console.log(msg);
    self.processInquiry();
  }
};

LocationQuery.prototype.processInquiry = function() {
  var self = this;
  console.log(self.outcome.entities);
  if (this.outcome.entities.inquiry_mode) {

    $.each(this.outcome.entities.inquiry_mode, function(i, inquiry_mode){
      switch(inquiry_mode.value) {
        case "weather":
          var shortName = self.locationsCoded[0] && self.locationsCoded[0].name?self.locationsCoded[0].name.replace(/\s*\,.*$/, ''):false;
          
          var dateTime = self.outcome.entities.datetime?self.outcome.entities.datetime[0].value:false;
          if (!dateTime) {
            dateTime = {
              from: (new Date()).toJSON(),
              to: (new Date(Date.now() + 1000*60*60*24)).toJSON()
            };
          }
          
          var messageParameters = {};
          messageParameters.date = self.whit.naturalDateRange(dateTime.from, dateTime.to);
          
          //if (dateTime) messageParameters.date = moment(dateTime.from).calendar();
          //if (dateTime.to) messageParameters.date += " until " + moment(dateTime.to).calendar();
          if (shortName) messageParameters.location = shortName;
          var msg = self.whit.loadMessage('forecast_lookup', messageParameters);
          console.log(msg);
          
          //to-do put elsewhere
          var weatherRanks = {
            coverage: ['isolated', 'slight chance', 'scattered', 'patchy', 'periods of', 'chance', 'likely', 'numerous', 'occasional', 'areas', 'intermittent', 'definitely', 'widespread', 'frequent'],
            coverageBefore: [' a chance of an isolated', ' a slight chance of', ' scattered', ' patchy', ' periods of', ' a chance of', '', ' numerous', ' occasional', ' areas of', ' intermittent', '', ' widespread', ' frequent'],
            coverageAfter: ['', '', '', '', '', '', ' likely', '', '', '', '', ' definitely', '', ''],
            intensity: ['very light', 'light', 'moderate', 'heavy']
          };
          
          
          $.getJSON("/api/weather/forecast/" + self.locationsCoded[0].lat + "/" + self.locationsCoded[0].lon + "/" + dateTime.from + "/" + dateTime.to, function(data){
            if (data.parameters) {
              switch(self.outcome.entities.inquiry_event[0].value) {
                case 'snow':
                case 'rain':
                case 'drizzle':
                case 'sleet':
                case 'ice pellets':
                  
                  
                  var timeLayout = data.parameters['weather-type-coverage-and-intensity'].timeLayout;
                  var lookup = self.outcome.entities.inquiry_event[0].value;
                  if (lookup == "sleet") lookup = "ice pellets";
                  
                  var maxCoverage = -1;
                  var maxCoverageIntensity = -1;
                  var maxCoverageType = "";
                  var maxIntensity = -1;
                  var maxIntensityCoverage = -1;
                  var maxIntensityType = "";
                  var totalTimes = 0;
                  var matchTimes = 0;
                  var descriptor = "";
                  $.each(data.parameters['weather-type-coverage-and-intensity'].values, function(i,v){
                    var time = data.timeRanges[timeLayout][i];
                    totalTimes++;
                    if (v.weatherType && v.weatherType.indexOf(lookup)>-1) {
                      matchTimes++;
                      if (weatherRanks.coverage.indexOf(v.coverage) >= maxCoverage) {
                        maxCoverage = weatherRanks.coverage.indexOf(v.coverage);
                        maxCoverageType = v.weatherType;
                        if (weatherRanks.intensity.indexOf(v.intensity) >= maxCoverageIntensity) maxCoverageIntensity = weatherRanks.intensity.indexOf(v.intensity);
                      }

                      if (weatherRanks.intensity.indexOf(v.intensity) >= maxIntensity) {
                        maxIntensity = weatherRanks.intensity.indexOf(v.intensity);
                        if (weatherRanks.coverage.indexOf(v.coverage) >= maxIntensityCoverage) maxIntensityCoverage = weatherRanks.coverage.indexOf(v.coverage);
                        maxIntensityType = v.weatherType;
                      }

                      /*
                      console.log(time.startTime, moment(time.startTime).calendar(), v.coverage, weatherRanks.coverage.indexOf(v.coverage), weatherRanks.intensity.indexOf(v.intensity), v.intensity, v.weatherType, v.qualifier);  
                      */
                    }

                  });
                  if (matchTimes>0) {
                    var percentage = Math.floor((matchTimes*100)/totalTimes);

                    var percentageDescriptor = "";
                    if (percentage > 75) percentageDescriptor = "most of the time there will be";
                    else if (percentage > 50) percentageDescriptor = "more than half of the time there will be";
                    else if (percentage > 25) percentageDescriptor = "some of the time there will be";
                    else percentageDescriptor = "for a small portion of the time there will be";

                    if (maxCoverageIntensity == maxIntensity) {
                      descriptor = percentageDescriptor + weatherRanks.coverageBefore[maxIntensityCoverage] + " " + weatherRanks.intensity[maxIntensity] + " " + maxCoverageType + weatherRanks.coverageAfter[maxIntensityCoverage];
                    } else {
                      descriptor = percentageDescriptor + weatherRanks.coverageBefore[maxCoverage] + " " + weatherRanks.intensity[maxCoverageIntensity] + " " + maxCoverageType + weatherRanks.coverageAfter[maxCoverage] + " with some" + weatherRanks.coverageBefore[maxIntensityCoverage] + " " + weatherRanks.intensity[maxIntensity] + " " + maxIntensityType + weatherRanks.coverageAfter[maxIntensityCoverage] ;
                    }
                  } else {
                    descriptor = "the forecast doesn't call for any " + self.outcome.entities.inquiry_event[0].value + " in " + self.outcome.entities.location[0].value;
                  }
                  
                  console.log(descriptor);



                  break;
              }   
            } else {
              console.log('no forecast available');
            }
          });
          
          break;
        default:
          // i'm not sure error
          // console.log('inquiry_mode not found: ' + JSON.stringify(inquiry_mode.value));
          break;
      }
    });
  } else {
    // no mode found -- error
    // console.log('no inquiry_mode found');
  }
};
