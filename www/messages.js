//to-do: make DB

var __messages = {
  location_lookup: {
    '': ['one second', 'let me get your location', 'let me find where you are', 'give me a second'],
    'location': ['one second', 'let me get that location', 'let me find that place', 'let me look that up for you', 'give me a second']  
  },
  got_it: {
    '': ['got it', 'found it', 'great', 'ok']
  },
  forecast_lookup: {
    '': ['let me find that forecast.', 'let me look that up for you.', 'let me see what I can find.', 'just a moment.', 'I\'m checking that for you.'],
    'location': ['let me find the forecast for %location%.', 'let me find the weather for %location%.', 'let me look up %location%.', 'let me check %location%.'],
    'date+location': ['let me find the forecast for %location% for %date%.', 'let me find the weather for %location% for %date%.', 'let me look up %location% for %date%.',  'let me check %location% for %date%.'],
    'date': ['let me find the forecast for %date%.', 'let me find the weather for %date%.', 'let me look up %date%.', 'let me check %date%.']
  }
};