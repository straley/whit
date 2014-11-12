var speech = new webkitSpeechRecognition();
var final_transcript = "";

speech.continuous = true;
speech.maxAlternatives = 5;
speech.interimResults = true;
speech.lang = ["United States", "en-us", "English", "en-us"];
speech.start();

speech.onerror = function(e) {
};

speech.onresult = function(e) {
  var interim_transcript = '';
  if (typeof(e.results) == 'undefined') {
    reset();
    return;
  }
  for (var i = e.resultIndex; i < e.results.length; ++i) {
    var val = e.results[i][0].transcript;
    if (e.results[i].isFinal) {
      final_transcript += val + " ";
      
      $.getJSON( "/api/intent/" + final_transcript.replace(/\s+/, '%20', function( data ) {
        console.log(data);
      } );
       
      console.log(final_transcript);
      final_transcript = "";
    } else {
      interim_transcript += " " + val;
    }
  }
};
