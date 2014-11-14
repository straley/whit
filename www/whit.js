function Whit(inputText, sendButton, outputPane) {
  var self = this;
  
  this.inputText = inputText;
  this.sendButton = sendButton;
  this.outputPane = outputPane;
  
  this.speech = new webkitSpeechRecognition();
  this.final_transcript = "";

  this.listen = function() {
    this.speech.continuous = true;
    this.speech.maxAlternatives = 5;
    this.speech.interimResults = true;
    this.speech.lang = ["United States", "en-us", "English", "en-us"];
    this.speech.start();
  };
  
  this.sendButton.click(function(){
    $.getJSON("/api/intent/" + self.inputText.val().replace(/\s+/, '%20'), self.responseHandler);
    self.inputText.val("");
  });
  
  this.inputText.keyup(function(event){
    if(event.keyCode == 13){
      self.sendButton.click();
    }
  });

  this.speech.onerror = function(e) {
    console.log("error", e);
  };

  this.speech.onresult = function(e) {
    var interim_transcript = '';
    if (typeof(e.results) == 'undefined') {
      console.log('no result');
      return;
    }
    for (var i = e.resultIndex; i < e.results.length; ++i) {
      var val = e.results[i][0].transcript;
      if (e.results[i].isFinal) {
        this.final_transcript += val;
        self.inputText.val(this.final_transcript);
        self.sendButton.click();
        this.final_transcript = "";
      } else {
        interim_transcript += val + " ";
      }
    }
  };

  this.responseHandler = function(response) {
    var selectedOutcome;
    var maxConfidence = 0;
    $.each(response.outcomes, function(i, outcome){
      if (outcome.confidence > maxConfidence) {
        selectedOutcome = outcome;
      }
    });
    
    switch(selectedOutcome.intent) {
      case "location_query":
        new LocationQuery(self, selectedOutcome)
        break;
      default:
        // unable to match intent
        // console.log('intent not found: ' + JSON.stringify(intent));
        break;
    }
  };
  
  this.loadMessage = function(id, parameters) {
    if (__messages[id]) {
      var keys = Object.keys(parameters);
      var p = keys.sort().join("+");
      if (__messages[id][p]) {
        var options = __messages[id][p];
        var i = Math.floor(Math.random() * options.length);
        var message = options[i];
        
        for (var k=0; k<keys.length; k++) {
          var re = new RegExp("%" + keys[k] + "%", 'g');
          message = message.replace(re, parameters[keys[k]]);
        }
        
        return message;
      }
    } else {
      return "I'm at a loss for words.";
    }
  };
}

Whit.prototype.naturalDateRange = function(dateFrom, dateTo){
  
  var hours = ['very early %day% morning', 'very early %day% morning', 'very early %day% morning', 'early %day% morning', 
               'early %day% morning', 'early %day% morning', '%day% morning', '%day% morning', 
               '%day% morning', '%day% morning', 'late %day% morning', 'late %day% morning', 
               'early %day% afternoon', 'early %day% afternoon', '%day% afternoon', '%day% afternoon',
               'late %day% afternoon', 'early %day% evening', 'early %day% evening', '%day% evening',
               '%day% evening', 'late %day% evening', 'late %day% evening', 'late %day% evening'
              ];

  var from = moment(dateFrom).calendar();
  var to = dateTo?moment(dateTo).calendar():false;

  var fromParts = from.split(/\s*at\s*/);
  var toParts = to?to.split(/\s*at\s*/):false;

  var timeFrom = Date.parse("1/1/1970 " + fromParts[1] + " Z");
  var timeTo = toParts?Date.parse("1/1/1970 " + toParts[1] +" Z"):0;

  if (timeFrom === 0 && timeTo === 0 && (Date.parse(dateFrom)-Date.parse(dateTo)) == -86400000) {
      return fromParts[0].toLowerCase().replace(/^\s+/,'').replace(/\s+$/,'');
  } else {
    var shortDayFrom = fromParts[0].toLowerCase().replace(/^\s+/,'').replace(/\s+$/,'');
    if (shortDayFrom != "today" && shortDayFrom != "tomorrow" && shortDayFrom != "yesterday") shortDayFrom = "in the";

    var shortDayTo = toParts?toParts[0].toLowerCase().replace(/^\s+/,'').replace(/\s+$/,''):'';
    if (shortDayTo != "today" && shortDayTo != "tomorrow" && shortDayTo != "yesterday") shortDayTo = "in the";

    var fromShort = !isNaN(timeFrom)?hours[Math.floor(timeFrom/3600000)].replace(/%day%/g, shortDayFrom):'';
    var toShort = toParts&&!isNaN(timeTo)?hours[Math.floor(timeTo/3600000)].replace(/%day%/g, shortDayTo):'';

    var finalFrom = "";
    var finalTo = "";
    var final = "";
    if (shortDayFrom == 'in the') {
      finalFrom = fromShort + " on " + fromParts[0];
    } else {
      finalFrom = fromShort;
    }

    if (toParts) {
      if (shortDayTo == 'in the') {
        finalTo = toShort + " on " + toParts[0];
      } else {
        finalTo = toShort;
      }
      final = finalFrom + " to " + finalTo; 
    } else {
      final = finalFrom;
    }

    return final;  
  }  
};

Whit.prototype.naturalDate = function(date){
};


var whit = new Whit($("#request"), $("#send"), $("#results"));
// whit.listen();
