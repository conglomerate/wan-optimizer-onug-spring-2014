mapleControllers.controller('TapCtrl', function ($scope, $http, $timeout) {

    $scope.isEnabled = function(tapRule) {
	return tapRule.tapRuleEnabled;
    };

    $scope.updateEnabled = function($event, tapRule) {
	var req = { requestName: "tapRules", method: "delete", data:tapRule };
	$http.post("/udf", req).success(function () {
	    if ($event.target.checked) {
		tapRule.tapRuleEnabled = true;
	    } else {
		tapRule.tapRuleEnabled = false;
	    }
	    $scope.addTapRule(tapRule);    
	});
    };

    $scope.alerts = [];

    $scope.addAlert = function(txt) {
	$scope.alerts.push({msg: txt});
    };

    $scope.closeAlert = function(index) {
	$scope.alerts.splice(index, 1);
    };

    $scope.selectedIngressPorts = [];
    $scope.selectedEgressPorts = [];

    $scope.getIngressPorts = function() {
	var req = { requestName: "tapPorts", method: "get", data:{} };
        $http.post("/udf", req).success(function(data) {
	    if (!angular.equals(data, $scope.tapPorts)) {
		$scope.tapPorts = data;
		$scope.monitorLocs = data.filter(function(f) { return (f.tapPortStatus == "TapDest"); });
		$scope.normalPorts = data.filter(function(f) { return (f.tapPortStatus == "Normal"); });
		$scope.namedIngressPorts = data.filter(function(x) { 
                    return (x.tapPortStatus == "TapSource" || x.tapPortStatus == "Normal");
		});
	    }
        });
    };

    $scope.showIngressPorts = function(tapRule) {
	var spToString = function(x) { 
	    return ("(" + x.switch + "," + x.port + ")");
	};
	return (tapRule.tapIngressPorts.map(spToString).join(", "));
    }

    $scope.getTapRules = function() {
	var req = { requestName: "tapRules", method: "get", data:{} };
	$http.post("/udf",req).success(function(data) {
	    $scope.tapRules = data;
	});
    };
        
    $scope.intervalFunction = function(){
        $timeout(function() {
            $scope.getIngressPorts();
	    $scope.getTapRules();
            $scope.intervalFunction();
        }, 5000);
    };
    $scope.getTapRules();
    $scope.getIngressPorts();
    $scope.intervalFunction();

    $scope.deleteIngressPort = function(ingressPort) {
	var req = { requestName: "tapPorts", method: "delete", data:ingressPort };
	$http.post("/udf", req).success(function () {
	    $scope.getIngressPorts();
	});
    };
    $scope.ngDeleteTap = function(tapRule) {
	var req = { requestName: "tapRules", method: "delete", data:tapRule };
	$http.post("/udf", req).success(function () {
	    $scope.getTapRules();
	});
    };

    $scope.ngAddTap = function() {
	var tapFilter   = $scope.ngInputFilter;
	var tapDestsStr = $scope.ngInputDests;
	var tapDests    = $scope.selectedEgressPorts.map(function(x) {
	    return x.tapPortName;
	});

	var inPorts = $scope.selectedIngressPorts.map(function(x) {
	    return {switch:x.tapPortLocation.switch,port:x.tapPortLocation.port};
	});

	var tap = {"tapFilter":tapFilter,
		   "tapDests":tapDests,
		   "tapIngressPorts":inPorts,
		   "tapRuleName": $scope.ngInputTapName,
		   "tapRuleEnabled": true  };

	$scope.ngInputTapName = "";
	$scope.selectedIngressPorts = [];
	$scope.selectedEgressPorts = [];
	$scope.ngInputFilter = "";
	$scope.ngInputDests = "";

	$scope.addTapRule(tap);

	$('#tapModal').modal('hide');
    };

    $scope.addTapRule = function(tapRule) {
	var req = { requestName: "tapRules", method: "post", data:tapRule };
	$http.post("/udf", req).
	    success(function(data) {
		$scope.getTapRules();
	    }).
	    error(function(data,status,headers,config) {
		data.errors.map(function(e) { 
		    $scope.alerts.push({type: 'danger', msg:e});
		});
	    });
    };

    $scope.addMonitorLocationFromForm = function () {
	var monitorLocName = $scope.ngInputMonitorLocationName;
	var s = parseInt($scope.inputMonitorLocationSwitchPort.tapPortLocation.switch);
	var p = parseInt($scope.inputMonitorLocationSwitchPort.tapPortLocation.port);
	var tapLoc    = {tapPortLocation:{switch:s,port:p}, 
			 tapPortName:monitorLocName, 
			 tapPortStatus:"TapDest"};
	var req = { requestName: "tapPorts", method: "post", data:tapLoc };
	$http.post('/udf', req).
	    success(function(data) {
		$scope.getIngressPorts();
	    }).
	    error(function(data,status,headers,config) {
		data.errors.map(function(e) { 
		    $scope.alerts.push({type: 'danger', msg:e});
		});
	    });

	$scope.ngInputMonitorLocationName = "";
	$('#monitorLocationModal').modal('hide');
    };
    $scope.deleteMonitorLoc = function(monitorLoc) {
	var req = { requestName: "tapPorts", method: "delete", data:monitorLoc };
	$http.post("/udf", req).
	    success(function () {
		$scope.getIngressPorts();
	    }).
	    error(function(data,status,headers,config) {
		data.errors.map(function(e) { 
		    $scope.alerts.push({type: 'danger', msg:e});
		});
	    });
    };
    $scope.deletable = function(monitorLoc) {
	// a tap dest is deletable if no tapRule uses the tap dest, 
	// i.e. for every tap rule r, the given dest is not among the dests of r.
	return (_.every($scope.tapRules, function(r) {
	    return !(_.contains(r.tapDests, monitorLoc.tapPortName));
	}));
    }

    $scope.addIngressPortFromForm = function () {
        var tapName   = $scope.ngInputTapLocationName;
	var tapSwitch = parseInt($scope.inputTapLocationSwitchPort.tapPortLocation.switch);
	var tapPort = parseInt($scope.inputTapLocationSwitchPort.tapPortLocation.port);
        var tapLoc    = {tapPortLocation:{switch:tapSwitch,port:tapPort}, 
			 tapPortName:tapName, 
			 tapPortStatus:"TapSource"};
	var req = { requestName: "tapPorts", method: "post", data:tapLoc };
        $http.post('/udf', req).success(function (data) {
            $scope.getIngressPorts();
        });

	$scope.ngInputTapLocationName = "";

        $('#ingressModal').modal('hide');
    }

    $scope.showTapRules = function() {
	d3.select("#container").select("#tapRulesTable").classed("hide", false);
	d3.select("#container").select("#ingressLocationsTable").classed("hide", true);
	d3.select("#container").select("#monitorLocationsTable").classed("hide", true);
	d3.select("#container").select("#showTapRulesButton").classed("active",true);
	d3.select("#container").select("#showIngressLocationsButton").classed("active",false);
	d3.select("#container").select("#showMonitorLocationsButton").classed("active",false);
    };

    $scope.showIngressLocations = function() {
	d3.select("#container").select("#tapRulesTable").classed("hide", true);
	d3.select("#container").select("#ingressLocationsTable").classed("hide", false);
	d3.select("#container").select("#monitorLocationsTable").classed("hide", true);
	d3.select("#container").select("#showTapRulesButton").classed("active",false);
	d3.select("#container").select("#showIngressLocationsButton").classed("active",true);
	d3.select("#container").select("#showMonitorLocationsButton").classed("active",false);
    };

    $scope.showMonitorLocations = function() {
	d3.select("#container").select("#tapRulesTable").classed("hide", true);
	d3.select("#container").select("#ingressLocationsTable").classed("hide",true);
	d3.select("#container").select("#monitorLocationsTable").classed("hide",false);
	d3.select("#container").select("#showTapRulesButton").classed("active",false);
	d3.select("#container").select("#showIngressLocationsButton").classed("active",false);
	d3.select("#container").select("#showMonitorLocationsButton").classed("active",true);
    };

    $scope.showTapRules();
    
});
