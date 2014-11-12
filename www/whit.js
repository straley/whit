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
    
    console.log(selectedOutcome);
    console.log(selectedOutcome.intent);
    
    switch(selectedOutcome.intent) {
      case "location_query":
        new LocationQuery(self, selectedOutcome)
        break;
      default:
        // unable to match intent
        console.log('intent not found: ' + JSON.stringify(intent));
        break;
    }
  };
}

var whit = new Whit($("#request"), $("#send"), $("#results"));
// whit.listen();
