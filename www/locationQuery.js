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
          if (dateTime) messageParameters.date = moment(dateTime.from).calendar();
          if (dateTime.to) messageParameters.date += " until " + moment(dateTime.to).calendar();
          if (shortName) messageParameters.location = shortName;
          var msg = self.whit.loadMessage('forecast_lookup', messageParameters);
          console.log(self.outcome.entities);
          console.log(msg);
          
          //to-do put elsewhere
          var weatherRanks = {
            coverage: ['slight chance', 'chance', 'likely', 'definitely']
          };
          
          
          $.getJSON("/api/weather/forecast/" + self.locationsCoded[0].lat + "/" + self.locationsCoded[0].lon + "/" + dateTime.from + "/" + dateTime.to, function(data){
            switch(self.outcome.entities.inquiry_event[0].value) {
              case 'snow':
                $.each(data.parameters['weather-type-coverage-and-intensity'].values, function(i,v){
                  console.log(v);  
                });
                
                
                break;
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
