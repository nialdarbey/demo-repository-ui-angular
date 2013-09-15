'use strict';

/* App Module */

var app = angular.module('demo-repository', [ 'firebase', 'ui.router.compat', 'ui.bootstrap', 'restangular', 'ngResource' ]);

var baseUrl = "https://demo-repository-api.cloudhub.io/";
//var baseUrl = "https://localhost:9999/";

app.config([ '$stateProvider', '$routeProvider', '$urlRouterProvider', 'RestangularProvider', '$httpProvider', '$provide', function($stateProvider, $routeProvider, $urlRouterProvider, RestangularProvider, $httpProvider, $provide) {

  $httpProvider.responseInterceptors.push('myHttpInterceptor');

  RestangularProvider.setBaseUrl(baseUrl + "api");
  RestangularProvider.setFullResponse();

  RestangularProvider.setResponseExtractor(function(response, operation, what) {
    if (what === 'demos') {
      if (response.hasOwnProperty('services')) {
        return response.services;
      } else {
        return response;
      }
    } else if (what === 'read-me') {
      return response.readMe;
    } else if (what === 'taxonomies') {
        return response.taxonomies;
    } else {
      return response;
    }
  });

  $urlRouterProvider.when('', '/home').otherwise('/home');

  $stateProvider.state('repositories', {
          abstract : true,
          url : '/repositories',
          templateUrl : 'partials/repositories.html',
          controller : RepositoriesCtrl
  }).state('repositories.index', {
          url : '',
          templateUrl : 'partials/repositories-index.html',
  }).state('repositories.repository', {
          url : '/:repository',
          templateUrl : 'partials/repository.html',
          controller : RepositoryCtrl
  }).state('demos', {
          abstract : true,
          url : '/demos',
          templateUrl : 'partials/demos.html',
          controller : DemosCtrl
  }).state('demos.index', {
          url : '',
          templateUrl : 'partials/demos-index.html',
  }).state('demos.searchform', {
          url : '/searchform',
          templateUrl : 'partials/demos-search-form.html',
          controller : SearchCtrl
  }).state('demos.search', {
          url : '/search?criteria',
          templateUrl : 'partials/demos-search.html',
          controller : SearchCtrl
  }).state('demos.demo', {
          url : '/:demo',
          templateUrl : 'partials/demo.html',
          controller : DemoCtrl,
  }).state('login', {
          url : '/login',
          templateUrl : 'partials/login.html',
          controller : LoginCtrl
  }).state('logout', {
          url : '/login',
          templateUrl : 'partials/login.html',
          controller : LoginCtrl
  }).state('home', {
          url : '/home',
          templateUrl : 'partials/home.html'
  });
  ;
} ]);

app.run([ '$rootScope', '$state', '$stateParams', function($rootScope, $state, $stateParams) {
  $rootScope.$state = $state;
  $rootScope.$stateParams = $stateParams;
} ]);

app.controller('MainCtrl', [ '$state', '$scope', 'ErrorService', 'AuthorizationService', function($state, $scope, ErrorService, AuthorizationService) {
  $scope.errorService = ErrorService, $scope.signedIn = function() {
    return AuthorizationService.hasToken();
  }, $scope.logout = function() {
    AuthorizationService.logout();
    $state.go('login');
  }, $scope.search = function() {
    $state.go("demos.searchform");
  }, $scope.inDemos = function() {
    return $state.includes('demos');
  }
} ]);
