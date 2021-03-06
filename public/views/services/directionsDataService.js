/**
 * Created by chrissu on 2/15/16.
 */
app.service('directionsDataService', function($resource, $http) {
    var timeDistance = {
        communityTimes : [],
        maxTime : 10
    };

    var useCommute = false;

    var setUseCommute = function(val){
        useCommute = val;
    };

    var getUseCommute = function() {
        return useCommute;
    };

    var setTimeLimit = function(timeLimit){
        timeDistance.maxTime = timeLimit;
    };

    var setWorkplace = function (params) {
        return $.get('/directions', params, function (result) {
            timeDistance.communityTimes = result;
        })
          .fail(function() {
            // Indicate on client side that there is an error
            console.log('Something went wrong');
          });
    };

    var getCommunityTime = function(){
        return timeDistance.communityTimes;
    };



    var getTimeLimit = function() {
        return timeDistance.maxTime;
    };

    return {
        setWorkplace        :   setWorkplace,
        getCommunityTime    :   getCommunityTime,
        setTimeLimit        :   setTimeLimit,
        getTimeLimit        :   getTimeLimit,
        setUseCommute       :   setUseCommute,
        getUseCommute       :   getUseCommute
    };
});
