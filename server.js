/**
 * Created by chrissu on 12/12/15.
 */
var preferencesCommunities = require('./lib/preferencesCommunities');
var directionsCommunities = require('./lib/directionsCommunities');
var validator = require('validator');
var express = require('express');
var addressValidator = require('address-validator');

var app = express();

app.use(express.static('public'));

function validOp(op) {
  return op === '<' || op === '>';
}

function validNum(num) {
  return validator.isInt(num) && num > 0 && num < 6;
}

function validParam(allPreferences, param) {
  return typeof allPreferences[param] !== 'undefined';
}

function validatePreferencesParams(opsAndNums) {
  var allPreferences = {
    violentCrime: true,
    nonViolentCrime: true,
    nightlife: true,
    price: true,
    crowded: true
  };
  for (var opAndNum in opsAndNums) {
    if (opsAndNums.hasOwnProperty(opAndNum) &&
          (!validParam(allPreferences, opAndNum) ||
          !validOp(opsAndNums[opAndNum].op) ||
          !validNum(opsAndNums[opAndNum].num))) {
      return false;
    }
  }
  return true;
}

function validateAddress(address, callback) {
  if (!address) {
    callback(false);
  }
  addressValidator.validate(address, addressValidator.match.streetAddress,
                            function(err, exact, inexact) {
    if (err) {
      callback(false);
    } else {
      var addressType = (exact.length > 0) ? exact : inexact;
      var location;
      if (addressType.length > 0) {
        location = addressType[0].location;
      }
      callback(addressType.length > 0, location);
    }
  });
}

function validateDirectionsParams(req, callback) {
  validateAddress(req.query.destination, function(valid, address) {
    callback(valid, address);
  });
}

// jscs:disable
// http://localhost:8080/preferences?violentCrime[op]=%3C&nonViolentCrime[op]=%3C&nightlife[op]=%3E&price[op]=%3C&crowded[op]=%3C&violentCrime[num]=4&nonViolentCrime[num]=3&nightlife[num]=4&price[num]=4&crowded[num]=2
// jscs:enable
app.get('/preferences', function(req, res) {
  // console.log(req.query);
  console.log('GET /preferences');
  var start = new Date();
  if (validatePreferencesParams(req.query)) {
    var params = {
      violentCrimePctOfAvg: {op: req.query.violentCrime.op,
                              num: parseInt(req.query.violentCrime.num)},
      nonViolentCrimePctOfAvg: {op: req.query.nonViolentCrime.op,
                                num: parseInt(req.query.nonViolentCrime.num)},
      nightlifePctOfAvg: {op: req.query.nightlife.op,
                          num: parseInt(req.query.nightlife.num)},
      pricePctOfAvg: {op: req.query.price.op,
                      num: parseInt(req.query.price.num)},
      crowdedPctOfAvg: {op: req.query.crowded.op,
                        num: parseInt(req.query.crowded.num)}
    };
    preferencesCommunities.communitiesByPreferences(params,
                                                    function(err, result) {
      if (err) {
        res.send('<p>Error with request</p>');
      } else {
        var end = new Date();
        console.log('Time elapsed:', (end - start) / 1000, 's');
        res.send(result);
      }
    });
  } else {
    res.send('<p>Preferences are not valid</p>');
  }
});

// jscs:disable
// http://localhost:8080/directions?destination=201%20S%20Wacker%20Dr,%20Chicago,%20IL
// jscs:enable
app.get('/directions', function(req, res) {
  // console.log(req.query);
  console.log('GET /directions');
  var start = new Date();
  validateDirectionsParams(req, function(valid, coordinates) {
    if (valid) {
      var latLng = {
        lat: coordinates.lat,
        lng: coordinates.lon
      };
      directionsCommunities.getClosestLatLng(latLng, function(err, result) {
        if (err) {
          res.send(err);
        } else {
          var end = new Date();
          console.log('Time elapsed:', (end - start) / 1000, 's');
          res.send(result);
        }
      });
    } else {
      res.send('<p>Address is not valid</p>');
    }
  });
});

app.listen(8080, function() {
  console.log('listening to port localhost:8080');
});
