var geolib = require('geolib');
var RateLimiter = require('limiter').RateLimiter;
var async = require('async');
var fs = require('fs');

var db = require('./db');
var makeRequest = require('./makeRequest');
var commPctOfAvg = require('./communitiesPctOfAvg');

var city = 'CHICAGO';
var chicagoCommunitiesWithAirports = [56, 62, 64, 65, 76];

function getNoise(city, callback) {
  db.getAllCommunitiesInfo(city, function(err, rows) {
    var returnArray = [];
    if (err) {
      console.error(err);
    } else {
      var start = new Date();
      var allValidPoints = [];
      var limiter = new RateLimiter(10, 'second');
      async.each(rows, function(community, cb) {
        var communityID = community.communityID;
        // manually set communities with airports
        if (chicagoCommunitiesWithAirports.indexOf(communityID) !== -1) {
          returnArray.push({ communityID: communityID,
                             data: 60 });
          cb();
        } else {
          var outline = JSON.parse(community.outline);
          var validPoints = generateRandomPointsInOutline(outline);
          allValidPoints.push.apply(allValidPoints, validPoints);
          limiter.removeTokens(1, function() {
            callNoiseAPI(validPoints, function(err, scores) {
              if (err) {
                return cb(err);
              } else {
                var sum = 0;
                for (var i = 0; i < scores.length; ++i) {
                  sum += scores[i];
                }
                var averageScore = sum / scores.length;
                returnArray.push({ communityID: communityID,
                                   data: averageScore });
                cb();
              }
            });
          });
        }
      }, function(err) {
        if (err) {
          callback(err);
        } else {
          var end = new Date();
          console.log('Time elapsed:', (end - start) / 1000, 's');
          fs.writeFileSync('./randomCoords.json',
                           JSON.stringify(allValidPoints));
          callback(null, returnArray);
        }
      });
    }
  });
}

function communitiesNoisePctOfAvg(cb) {
  getNoise(city, function(err, communityNoise) {
    if (err) {
      cb(err);
    } else {
      var avg = commPctOfAvg.getAvgData(communityNoise);
      var pctOfAvg = commPctOfAvg.getPctOfAvg(communityNoise, avg);
      cb(null, pctOfAvg);
    }
  });
}

function generateRandomPointsInOutline(outline) {
  // classic fencepost approach because lat/lng could be negative
  var minLat = outline[0].lat;
  var minLng = outline[0].lng;
  var maxLat = outline[0].lat;
  var maxLng = outline[0].lng;
  for (var i = 1; i < outline.length; ++i) {
    if (outline[i].lat < minLat) { minLat = outline[i].lat; }
    if (outline[i].lat > maxLat) { maxLat = outline[i].lat; }
    if (outline[i].lng < minLng) { minLng = outline[i].lng; }
    if (outline[i].lng > maxLng) { maxLng = outline[i].lng; }
  }
  var returnArray = [];
  const NUM_RANDOM_POINTS = 10;
  var invalidPoints = 0;
  var validPoints = 0;
  while (validPoints < NUM_RANDOM_POINTS) {
    var randomLat = Math.random() * (maxLat - minLat) + minLat;
    var randomLng = Math.random() * (maxLng - minLng) + minLng;
    var pointObj = {
      lat: randomLat,
      lng: randomLng
    };
    if (geolib.isPointInside(pointObj, outline)) {
      ++validPoints;
      returnArray.push(pointObj);
    } else {
      ++invalidPoints;
    }
  }
  var pointPct = (validPoints / (validPoints + invalidPoints)) * 100;
  console.log('Point generation efficiency: ' + pointPct + '%');
  return returnArray;
}

function callNoiseAPI(pointArray, callback) {
  var limiter = new RateLimiter(10, 'second');
  const URL = 'http://elb1.howloud.com/score';
  var returnArray = [];
  async.each(pointArray, function(pointObj, cb) {
    limiter.removeTokens(1, function() {
      var params = {
        key: 'GbXjeNeezekqlAFK',
        latitude: pointObj.lat,
        longitude: pointObj.lng
      };
      makeRequest(URL, params, function(err, response) {
        if (err) {
          return cb(err);
        } else {
          returnArray.push(response.result[0].score);
          cb();
        }
      });
    });
  }, function(err) {
    if (err) {
      return callback(err);
    } else {
      callback(null, returnArray);
    }
  });
}

module.exports = {
  communitiesNoisePctOfAvg: communitiesNoisePctOfAvg
};