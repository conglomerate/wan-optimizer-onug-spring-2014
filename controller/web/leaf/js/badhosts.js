mapleControllers.controller('BadHostsCtrl', function ($scope, $http, $timeout) {

    $scope.alerts = [];

    $scope.addAlert = function(txt) {
	$scope.alerts.push({msg: txt});
    };

    $scope.closeAlert = function(index) {
	$scope.alerts.splice(index, 1);
    };

    $scope.getBadHosts = function() {
	var req = { component: "BadHosts", method: "read_set", value:{} };
        $http.post("/db", req).success(function(data) {
	    $scope.badHosts = data.map(function(x) {return { value:x, hexString:prettyPrintMac(x)}; });
        });
    };
    $scope.getBadHosts();

    $scope.deleteHost = function(host) {
	var req = { component: "BadHosts", method: "delete_set", value:host.value };
	$http.post("/db", req).success(function () {
	    $scope.getBadHosts();
	});
    };

    $scope.addBadHostFromForm = function () {
	var host = parseMACHex($scope.inputMacAddress);
	
	var req = { component: "BadHosts", method: "insert_set", value:host };
	$http.post('/db', req).
	    success(function(data) {
		$scope.getBadHosts();

	    }).
	    error(function(data,status,headers,config) {
		data.errors.map(function(e) { 
		    $scope.alerts.push({type: 'danger', msg:e});
		});
	    });

	$('#badHostModal').modal('hide');
	$scope.inputMacAddress = "";
    };

    
});
