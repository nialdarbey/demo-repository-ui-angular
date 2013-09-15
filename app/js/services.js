'use strict';

/* Services */
/*
angular.module('phonecatServices', ['ngResource']).
    factory('Phone', function($resource){
  return $resource('phones/:phoneId.json', {}, {
    query: {method:'GET', params:{phoneId:'phones'}, isArray:true}
  });
});
*/

app.factory('myHttpInterceptor', [ '$q', '$rootScope', 'ErrorService', '$location', function($q, $rootScope, ErrorService, $location) {
  return function(promise) {
    var success = function(response) {
      return response;
    };
    var error = function(response) {
      if (response.status === 403) {
        $rootScope.$broadcast('event:loginRequired');
      }
      ErrorService.setError(response.data);
      return $q.reject(response);
    };
    return promise.then(success, error);
  }
} ]);

app.factory('ErrorService', function() {
  return {
          errorMessage : null,
          setError : function(msg) {
            this.errorMessage = msg;
          },
          clear : function() {
            this.errorMessage = null;
          }
  }
});

app.factory('DemoCorrelationService', [ 'angularFire', '$rootScope', function(angularFire, $rootScope) {
  $rootScope.repositoriesMap = {};
  $rootScope.demosMap = {};
  angularFire(new Firebase("https://mule-demo-repository.firebaseio.com/repositories"), $rootScope, "repositoriesMap");
  angularFire(new Firebase("https://mule-demo-repository.firebaseio.com/demos"), $rootScope, "demosMap");
      
  return {
          getData: function() {
            
          },
          store : function(githubName, asrName) {
            $rootScope.repositoriesMap[githubName] = asrName;
            $rootScope.demosMap[asrName] = githubName;
          },
          getAsr : function(name) {
            return $rootScope.repositoriesMap[name];
          },
          getRepository : function(name) {
            return $rootScope.demosMap[name];
          },
          published : function(name) {
            return name in $rootScope.repositoriesMap;
          }
  }
} ]);

app.factory('SecurityService', [ '$rootScope', '$state', 'AuthorizationService', function($rootScope, $state, AuthorizationService) {
  return {
    check : function() {
      $rootScope.$on('event:loginRequired', function() {
        $state.go('login');
      });
      AuthorizationService.prepare();
    }
  }
} ]);

app.factory('AuthorizationService', [ 'Restangular', '$state', 'ErrorService', function(Restangular, $state, ErrorService) {
  return {
          errorMessage : null,
          prepared : false,
          hasToken : function() {
            return localStorage.getItem('token.dr') != null && localStorage.getItem('token.asr') != null;
          },
          authorize : function(usename, password, scope) {
            var drTokenParams = $.param({
                    grant_type : 'password',
                    username : scope.username,
                    password : scope.password,
                    client_id : 'web-ui',
                    scope : 'READ%20WRITE'
            });
            Restangular.oneUrl('', baseUrl + 'access-token').post('', drTokenParams, {}, {
                    'Content-Type' : 'application/x-www-form-urlencoded',
                    'Accept' : 'application/json'
            }).then(function(drToken) {
              Restangular.one('users', scope.username).get({
                access_token : drToken.access_token
              }).then(function(user) {
                var asrTokenParams = $.param({
                        grant_type : 'password',
                        username : user.srUser,
                        password : user.srPass,
                        client_id : 'WEBUI',
                        scope : 'READ_SERVICES%20WRITE_SERVICES%20CONSUME_SERVICES%20APPLY_POLICIES%20READ_CONSUMERS%20WRITE_CONSUMERS%20CONTRACT_MGMT%20CONSUME_POLICIES'
                });
                Restangular.oneUrl('', 'https://registry.mulesoft.com:443/api/access-token').post('', asrTokenParams, {}, {
                        'Content-Type' : 'application/x-www-form-urlencoded',
                        'Accept' : 'application/json'
                }).then(function(asrToken) {
                  localStorage.setItem('githubUsername', user.githubUsername);
                  localStorage.setItem('token.dr', drToken.access_token);
                  localStorage.setItem('token.asr', asrToken.access_token);
                  localStorage.setItem('user', scope.username);
                  $state.go('repositories.index');
                }, function(response) {
                  ErrorService.setError('Sorry, ' + scope.username + ', but you are not registered yet!', response.status);
                });
              });
            }, function(response) {
              ErrorService.setError('Invalid Credentials');
            });
          },
          logout : function() {
            localStorage.removeItem('token.dr');
            localStorage.removeItem('token.asr');
            localStorage.removeItem('githubUsername');
          },
          prepare : function() {
            if (!this.hasToken()) {
              ErrorService.setError('Please sign in!');
              $state.go('login');
            } else {
              var tokenAsr = localStorage.getItem('token.asr');
              var tokenDr = localStorage.getItem('token.dr');
              Restangular.setDefaultRequestParams({
                      access_token : tokenDr,
                      asrToken : tokenAsr
              });
              this.prepared = true;
            }
          }
  }
} ]);