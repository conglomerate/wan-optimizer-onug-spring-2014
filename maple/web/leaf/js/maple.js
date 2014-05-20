'use strict';

/* App Module */

var mapleApp = angular.module('mapleApp', [
    'ngRoute',
    'ui.bootstrap',
    'mapleControllers','ui.sortable','xeditable'
]);

mapleApp.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/login', {
        templateUrl: 'login.html',
      }).
      when('/topology', {
        templateUrl: 'topology.html',
        controller: 'topoCtrl'
      }).
      when('/ports', {
        templateUrl: 'ports.html',
        controller: 'PortCtrl'
      }).
      when('/fib', {
        templateUrl: 'fib.html',
        controller: 'fibCtrl'
      }).
      when('/hostLocs', {
        templateUrl: 'hostLocs.html',
        controller: 'hostLocsCtrl'
      }).
      when('/links', {
        templateUrl: 'links.html',
        controller: 'linksCtrl'
      }).
      when('/usage', {
        templateUrl: 'usage.html',
        controller: 'usageCtrl'
      }).
      when('/badhosts', {
        templateUrl: 'badhosts.html',
        controller: 'BadHostsCtrl'
      }).
      when('/acl', {
        templateUrl: 'acl.html',
        controller: 'AclCtrl'
      }).
      when('/monitor', {
        templateUrl: 'monitor.html',
        controller: 'MonitorCtrl'
      }).
      when('/taps', {
        templateUrl: 'taps.html',
        controller: 'TapCtrl'
      }).
      when('/test', {
        templateUrl: 'test.html',
        controller: 'TestCtrl'
      }).
      otherwise({
        redirectTo: '/login'
      });
  }]);

mapleApp.run(function($rootScope, $location) {
    $rootScope.$on( "$routeChangeStart", function(event, next, current) {
      if ( current != null ) {
        if ( current.originalPath == "/usage" && next.originalPath != "/usage" ) {
          stopUsagePlots();
        } else if ( current.originalPath == "/topology" && next.originalPath != "/topology" ) {
          deinitTopology();
        }
      }
    });
});

/* Controllers */

var mapleControllers = angular.module('mapleControllers', []);

mapleControllers.controller(
    'HeaderCtrl',
    ['$scope',
     '$location',
     function($scope,$location) {
	 $scope.isActive = function (viewLocation) {
             return viewLocation === $location.path();
	 };
     }]);

mapleControllers.controller(
    'PortCtrl',
    ['$scope',
     '$http',
     function($scope,$http) {

	 $http.get('/ports').success(function(data) {
	     $scope.switchPorts = data;
	 });
	 var handleCallback = function (msg) {
	     $scope.$apply(function () {
                 $http.get('/ports').success(function(data) {
		     $scope.switchPorts = data;
		 });
             });
	 };
	 var source = new EventSource('/event');
	 source.addEventListener('message', handleCallback, false);
     }]);

mapleControllers.controller(
    'usageCtrl',
    ['$scope',
     '$http',
     function($scope,$http) {
	 startUsagePlots();
     }]);
mapleControllers.controller(
  'topoCtrl',
  ['$scope',
   '$http',
   function($scope,$http) {
    initTopology();
    periodicallyUpdate();
   }]);

mapleControllers.controller(
    'fibCtrl',
    ['$scope',
     '$http',
     function($scope,$http) {

	 var prettifyActions = function(r) { 
	     if ((r.outPorts) instanceof Array) {
		 if (0 == r.outPorts.length) {
		     r.actions = "drop";
		     return r;
		 }
		 r.actions = r.outPorts.map(function (x) {
		     if ('Left' in x) {
			 return "Port " + x.Left;
		     } else if ('Right' in x) {
			 if (x.Right.tag == "SetEthSrc") {
			     return x.Right.tag + " " + prettyPrintMac(x.Right.contents);
			 } else if (x.Right.tag == "SetEthDst") {
			     return x.Right.tag + " " + prettyPrintMac(x.Right.contents);
			 } else if (x.Right.tag == "SetIPSrc") {
			     return x.Right.tag + " " + ipToOctets(x.Right.contents).join(".");
			 } else if (x.Right.tag == "SetIPDst") {
			     return x.Right.tag + " " + ipToOctets(x.Right.contents).join(".");
			 } else {
			     return x.Right.tag + " " + x.Right.contents;
			 }
		     } else {
			 return x;
		     }
		 }).join(", ");
	     }
	     return r;
	 };

	 $http.get('/fib').success(function(data) {
	     $scope.frules = data.map(prettifyActions);
	 });

	 var handleCallback = function (msg) {
	     $scope.$apply(function () {
                 $http.get('/fib').success(function(data) {
		     $scope.frules = data.map(prettifyActions);
		 });
             });
	 };
	 var source = new EventSource('/event');
	 source.addEventListener('message', handleCallback, false);

     }]);

mapleControllers.controller(
    'hostLocsCtrl',
    ['$scope',
     '$http',
     function($scope,$http) {
	 $http.get('/hostlocations').success(function(data) {
	     $scope.hostlocs = data.map(function(h) {
		 return { host: h.host, switch: h.switch, port: h.port, prettyHost: prettyPrintMac(h.host) };
	     });
	 });
	 var handleCallback = function (msg) {
	     $scope.$apply(function () {
                 $http.get('/hostlocations').success(function(data) {
		     $scope.hostlocs = data.map(function(h) {
			 return { host: h.host, switch: h.switch, port: h.port, prettyHost: prettyPrintMac(h.host) };
		     });
		 });
             });
	 };
	 var source = new EventSource('/event');
	 source.addEventListener('message', handleCallback, false);
     }]);

mapleControllers.controller(
    'linksCtrl',
    ['$scope',
     '$http',
     function($scope,$http) {
	 $http.get('/topology').success(function(data) {
	     $scope.links = data.links.map(function(h) {
		 return { source: prettyPrintMac(h.source),
			  sourceport: h.sourceport,
			  target: prettyPrintMac(h.target),
			  targetport: h.targetport
			};
	     });
	 });
	 var handleCallback = function (msg) {
	     $scope.$apply(function () {
                 $http.get('/topology').success(function(data) {
		     $scope.links = data.links.map(function(h) {
			 return { source: prettyPrintMac(h.source),
				  sourceport: h.sourceport,
				  target: prettyPrintMac(h.target),
				  targetport: h.targetport
				};
		     });
		 });
             });
	 };
	 var source = new EventSource('/event');
	 source.addEventListener('message', handleCallback, false);
     }]);

mapleControllers.controller(
    'usageCtrl',
    ['$scope',
     '$http',
     function($scope,$http) {
	 startUsagePlots();
     }]);
