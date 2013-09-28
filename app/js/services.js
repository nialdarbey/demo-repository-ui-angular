'use strict';

/* Services */

app.factory('HttpInterceptorService', ['$q', '$rootScope', 'ErrorService', function($q, $rootScope, ErrorService) {
  return function(promise) {
    var success = function(response) {
      return response;
    };
    var error = function(response) {
      var message = null;
      if (response.status === 403) {
        message = 'Please sign in!';
        sessionStorage.removeItem('token.dr');
        sessionStorage.removeItem('token.asr');
        sessionStorage.removeItem('user');
        $rootScope.$broadcast('LoginRequired');
      } else {
        message = response.data;
      }
      ErrorService.setError(message);
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

app.factory('DemoCorrelationService', [ '$rootScope', function($rootScope) {
  return {
    getData: function() {
    },
    store : function(githubName, asrName) {
      $rootScope.repositoriesMap[githubName] = asrName;
      $rootScope.demosMap[asrName] = githubName;
    },
    storeMap: function(publications) {
      if ($rootScope.demosMap && $rootScope.repositoriesMap) {
        // skip
      } else {
        var repositoriesMap = {};
        var demosMap = {};
        for (var i=0; i < publications.length; i++) {
          repositoriesMap[publications[i].asr] = publications[i].github;
          demosMap[publications[i].github] = publications[i].asr;
        }
        sessionStorage.setItem('demosMap', JSON.stringify(demosMap));
        sessionStorage.setItem('repositoriesMap', JSON.stringify(repositoriesMap));
      }
    },
    getAsr : function(name) {
      if ($rootScope.demosMap) {
        // skip
      } else {
        $rootScope.repositoriesMap = JSON.parse(sessionStorage.repositoriesMap);
        $rootScope.demosMap = JSON.parse(sessionStorage.demosMap);
      }
      return $rootScope.demosMap[name];
    },
    getRepository : function(name) {
      if ($rootScope.demosMap) {
        // skip
      } else {
        $rootScope.repositoriesMap = JSON.parse(sessionStorage.repositoriesMap);
        $rootScope.demosMap = JSON.parse(sessionStorage.demosMap);
      }
      return $rootScope.demosMap[name];
    },
    published : function(name) {
      if ($rootScope.demosMap) {
        // skip
      } else {
        $rootScope.repositoriesMap = JSON.parse(sessionStorage.repositoriesMap);
        $rootScope.demosMap = JSON.parse(sessionStorage.demosMap);
      }
      return name in $rootScope.demosMap;
    }
  }
} ]);

// app.factory('SecurityService', [ '$rootScope', '$state', 'AuthorizationService', function($rootScope, $state, AuthorizationService) {
//   return {
//     check : function() {
//       AuthorizationService.prepare();
//     }
//   }
// } ]);

app.factory('AuthorizationService', [ '$resource', '$http', '$rootScope','Restangular', '$state', 'ErrorService', function($resource, $http, $rootScope,Restangular, $state, ErrorService) {
  var author = false;
  var userNotRegistered = function(username, response) {
    ErrorService.setError('Sorry, ' + username + ', but you are not registered yet!');
  };
  var authorizeFail = function(response) {
    ErrorService.setError('Invalid Credentials');
  };
  var proceedToSignIn = function(drToken, asrToken, user) {
    Restangular.setDefaultRequestParams({
      access_token : drToken.access_token,
      asrToken : asrToken.access_token
    });
    sessionStorage.setItem('token.dr', drToken.access_token);
    sessionStorage.setItem('token.asr', asrToken.access_token);
    sessionStorage.setItem('user', JSON.stringify(user));
    $rootScope.$broadcast('SignIn');
    if (user.githubUsername) {
      $state.go('repositories.index');
    } else {
      $state.go('demos.index');
    }
  };
  var authorizeSuccess = function(drToken, scope, self) {
    Restangular
      .one('users', scope.username)
      .get({access_token : drToken.access_token})
      .then(function(user) {
        var asrTokenParams = $.param({
          grant_type : 'password',
          username : user.srUser,
          password : user.srPass,
          client_id : 'WEBUI',
          scope : 'READ_SERVICES%20WRITE_SERVICES%20CONSUME_SERVICES%20APPLY_POLICIES%20READ_CONSUMERS%20WRITE_CONSUMERS%20CONTRACT_MGMT%20CONSUME_POLICIES'
        });
        Restangular
          .oneUrl('', 'https://registry.mulesoft.com:443/api/access-token')
          .post('', asrTokenParams, {}, {
            'Content-Type' : 'application/x-www-form-urlencoded',
            'Accept' : 'application/json'})
          .then(
            function(asrToken) {
              proceedToSignIn(drToken, asrToken, user);
            },
            function(response) {
              userNotRegistered(scope.username, response);
            }
          );
      })
    };
  return {
    getUser : function() {
        return JSON.parse(sessionStorage.getItem('user'));
    },
    isAuthor : function() {
      return self.author;//JSON.parse(sessionStorage.getItem('user')).githubUsername != undefined;
    },
    errorMessage : null,
    prepared : false,
    hasToken : function() {
      return sessionStorage.getItem('token.dr') != null && sessionStorage.getItem('token.asr') != null;
    },
    authorize : function(usename, password, scope) {
      var self = this;
      var drTokenParams = $.param({
        grant_type : 'password',
        username : scope.username,
        password : scope.password,
        client_id : 'web-ui',
        scope : 'READ%20WRITE'
      });
        Restangular
          .oneUrl('', baseUrl + 'access-token')
          .post('', drTokenParams, {}, {
            'Content-Type' : 'application/x-www-form-urlencoded;utf-8',
            'Accept' : 'application/json'}
            )
          .then(
            function(drToken) {
              authorizeSuccess(drToken, scope, self);
            },
            authorizeFail
          );
    },
    logout : function() {
      sessionStorage.removeItem('token.dr');
      sessionStorage.removeItem('token.asr');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('demosMap');
      sessionStorage.removeItem('repositoriesMap');
    },
    demandToken : function() {
      if ( ! this.hasToken()) {
        ErrorService.setError('Please sign in!');
        $state.go('login');
      } 
    },
    init: function() {
      var tokenAsr = sessionStorage.getItem('token.asr');
      var tokenDr = sessionStorage.getItem('token.dr');
      Restangular.setDefaultRequestParams({
        access_token : tokenDr,
        asrToken : tokenAsr
      });
    }
  }
} ]);