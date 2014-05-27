var numToOctets = function(x) { return [x >>> 24, (x >>> 16) % (1<<8), (x>>>8) % (1<<8), x % (1<<8)]; };
var ipToNum = function(xs) { 
    var a = xs[0];
    var b = xs[1];
    var c = xs[2];
    var d = xs[3];
    return a * Math.pow(2,24) + b * Math.pow(2,16) + c * Math.pow(2,8) + d;
}
var ipStringToNums = function(s) { 
    return s.split(".").map(function(x) { return parseInt(x);}); 
};

mapleControllers.controller('AclCtrl', function ($scope, $http, $timeout) {

    $scope.protocols = ["TCP","UDP"];
    $scope.actions = ["PERMIT","DENY"];

    $scope.alerts = [];

    $scope.addAlert = function(txt) {
	$scope.alerts.push({msg: txt});
    };

    $scope.closeAlert = function(index) {
	$scope.alerts.splice(index, 1);
    };

    $scope.sortableOptions = {
	stop: function(e, ui) { $scope.writeACL(); }
    };

    $scope.ruleForDisplay = function(rawRule) {
	newRule = rawRule;
	newRule.ipSourcePrefix = numToOctets(newRule.predicate.srcIp).join(".") + "/" + newRule.predicate.srcIpLen;
	newRule.ipDestPrefix = numToOctets(newRule.predicate.dstIp).join(".") + "/" + newRule.predicate.dstIpLen;
	newRule.srcPortRange = "[" + newRule.predicate.srcPortBegin + ", " + newRule.predicate.srcPortEnd + "]";
	newRule.dstPortRange = "[" + newRule.predicate.dstPortBegin + ", " + newRule.predicate.dstPortEnd + "]";
	return newRule;
    }

    $scope.getACL = function() {
	var req = { component: "acl", method: "read"};
        $http.post("/db", req).success(function(data) {
	    $scope.acl = data.map(function(rawRule) {
		newRule = rawRule;
		newRule.ipSourcePrefix = numToOctets(newRule.predicate.srcIp).join(".") + "/" + newRule.predicate.srcIpLen;
		newRule.ipDestPrefix = numToOctets(newRule.predicate.dstIp).join(".") + "/" + newRule.predicate.dstIpLen;
		newRule.srcPortRange = "[" + newRule.predicate.srcPortBegin + ", " + newRule.predicate.srcPortEnd + "]";
		newRule.dstPortRange = "[" + newRule.predicate.dstPortBegin + ", " + newRule.predicate.dstPortEnd + "]";
		return newRule;
	    });
        });
    };
    $scope.getACL();

    $scope.writeACL = function(acl) {
	var req = { component: "acl", method: "write", value:$scope.acl };
	$http.post("/db", req).success(function () {
	    $scope.getACL();
	});
    };

    $scope.deleteRule = function(acrule) {
	$scope.acl = $scope.acl.filter(function(x) {
	    return (acrule != x);
	});
	var req = { component: "acl", method: "write", value:$scope.acl };
	$http.post("/db", req).success(function () {
	    $scope.getACL();
	});
    };

    // add user
    $scope.addRow = function() {
	var pred = {"srcIp":0, 
		    "srcIpLen":0,
		    "dstIp":0, 
		    "dstIpLen":0,
		    "protocol":"TCP",
		    "srcPortBegin":0,
		    "srcPortEnd":65535,
		    "dstPortBegin":0,
		    "dstPortEnd":65535 };
	var rawRule = {"predicate":pred,"action":"DENY"};
	$scope.inserted = $scope.ruleForDisplay(rawRule);
	$scope.acl.push($scope.inserted);
    };

    $scope.parsePortRange = function(s) {
	var parts = s.substring(s.indexOf("[")+1,s.length - 1).split(",");
	return parts.map(function (x) { return parseInt(x) });
    }

    $scope.saveRow = function (rowData,index) {
	var srcIpParts = rowData.ipSourcePrefix_.split("/");
	var srcIp = ipToNum(ipStringToNums(srcIpParts[0]));
	var srcIpLen = srcIpParts[1];
	var dstIpParts = rowData.ipDestPrefix_.split("/");
	var dstIp = ipToNum(ipStringToNums(dstIpParts[0]));
	var dstIpLen = dstIpParts[1];
	var srcPortParts = $scope.parsePortRange(rowData.srcPortRange_);
	var srcPortBegin = srcPortParts[0];
	var srcPortEnd = srcPortParts[1];
	var dstPortParts = $scope.parsePortRange(rowData.dstPortRange_);
	var dstPortBegin = dstPortParts[0];
	var dstPortEnd = dstPortParts[1];
	var pred = {"srcIp":srcIp, 
		    "srcIpLen":srcIpLen,
		    "dstIp":dstIp, 
		    "dstIpLen":dstIpLen,
		    "protocol":rowData.protocol_,
		    "srcPortBegin":srcPortBegin,
		    "srcPortEnd":srcPortEnd,
		    "dstPortBegin":dstPortBegin,
		    "dstPortEnd":dstPortEnd
		    };
	var rule = {"predicate":pred, 
		    "action":rowData.action_};
	$scope.acl.splice(index,1,rule);
	var req = { component: "acl", method: "write", value:$scope.acl};
	$http.post('/db', req).
	    success(function(data) {
		$scope.getACL();
	    }).
	    error(function(data,status,headers,config) {
		data.errors.map(function(e) { 
		    $scope.alerts.push({type: 'danger', msg:e});
		});
	    });

    }

    $scope.close = function() {
	$scope.inputSrcIpPrefix = "";
	$scope.inputDstIpPrefix = "";
	$scope.inputSrcPortBegin = "";
	$scope.inputSrcPortEnd = "";
	$scope.inputDstPortBegin = "";
	$scope.inputDstPortEnd = "";
	$scope.inputProtocol = "";
	$scope.inputAction = "";
	$('#acruleModal').modal('hide');
    }
    
});
