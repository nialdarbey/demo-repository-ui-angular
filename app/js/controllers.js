'use strict';

/* Controllers */

function LoginCtrl($scope, AuthorizationService) {
    $scope.username = 'nial.darbey', 
    $scope.password = 'xxx', 
    $scope.login = function() {
        AuthorizationService.authorize($scope.username, $scope.password, $scope);
    }
}

function RepositoriesCtrl($scope, Restangular, AuthorizationService, $state, DemoCorrelationService, $location) {
    $scope.$on('event:loginRequired', function() {
        $state.go('login');
    });
    AuthorizationService.prepare();
    $scope.repositories = Restangular.one('repositories').get({
        owner : 'nialdarbey'
    }).get('repositories');
    $scope.published = function(repository) {
        return DemoCorrelationService.published(repository.name);
    }
    $scope.showDemo = function(repository) {
        var demo = DemoCorrelationService.getAsr(repository.name);
        $state.go('demos.demo', {
            demo : demo
        });
    }
}

function RepositoryCtrl($scope, $stateParams, Restangular, AuthorizationService, $state, DemoCorrelationService, ErrorService) {
    $scope.$on('event:loginRequired', function() {
        $state.go('login');
    });
    AuthorizationService.prepare();
    DemoCorrelationService.getData();
    $scope.repository = Restangular.one('repositories', $stateParams.repository).get({
        owner : 'nialdarbey'
    });
    $scope.readMe = Restangular.one('repositories', $stateParams.repository).one('read-me').get({
        owner : 'nialdarbey'
    });
    $scope.repository.then(function(repository) {
        $scope.master.name = repository.name;
    });
    $scope.publish = function(demo) {
        $scope.repository.then(function(repository) {
            var summary = repository.description.replace(/\n/g, '\\n').substring(0, 96);
            summary = (summary === '') ? 'x' : summary;
            $scope.readMe.then(function(readMe) {
                var newDemo = {
                        name : demo.name.replace(/[^A-Za-z 0-9]/g, '-'),
                        repository : $stateParams.repository,
                        description : readMe.replace(/\n/g, '\\n').substring(0, 2048),
                        summary : summary,
                        githubOwner : 'nialdarbey', // AuthorizationService.getUser().getGithubUsername(),
                        releaseNotes : readMe.replace(/\n/g, '\\n').substring(0, 2048),
                        githubLink : repository.cloneUrl,
                        amazonLink : demo.amazonLink || 'http://localhost:8080/not/filled',
                        version : demo.major + '.' + demo.minor + '.' + demo.revision,
                        author : localStorage.getItem('user'),
                        verticals: demo.verticals
                };
                Restangular.all('demos').post(newDemo).then(function(response) {
                    DemoCorrelationService.store($stateParams.repository, response.location);
                }, function(response) {
                    ErrorService.setError(response.data);
                });
            });
        });
    };
    $scope.published = function() {
        return DemoCorrelationService.published($stateParams.repository);
    }
    
    
    $scope.master = { name: $stateParams.repository, major: 3, minor: 4, revision: 0, verticals: [] };
    $scope.availableVerticals = Restangular.all('taxonomies').getList({ q: '.*', limit: 10000});

    $scope.demo = angular.copy($scope.master);
   
    $scope.reset = function() {
      $scope.demo = angular.copy($scope.master);
    };
   
    $scope.isUnchanged = function(demo) {
      return angular.equals(demo, $scope.master);
    };
}

function DemosCtrl($scope, AuthorizationService, Restangular, $state, DemoCorrelationService) {
    $scope.$on('event:loginRequired', function() {
        $state.go('login');
    });
    AuthorizationService.prepare();
    DemoCorrelationService.getData();
    $scope.demos = Restangular.one('demos').get().get('demos').get('services');
    $scope.tags = Restangular.all('tags').getList({
            q : '.*',
            limit : 0
    }).get('tags');
    $scope.search = function() {
        $scope.demos = Restangular.all('demos').getList({
            q : $scope.searchCriteria
        }).get('demos').get('services');
    }
}

function SearchCtrl($scope, AuthorizationService, Restangular, $stateParams, $state) {
    $scope.$on('event:loginRequired', function() {
        $state.go('login');
    });
    AuthorizationService.prepare();
    $scope.demos = Restangular.all('demos').getList();

}

function DemoCtrl($scope, $stateParams, AuthorizationService, $state, Restangular, DemoCorrelationService, $rootScope) {
    $scope.$on('event:loginRequired', function() {
        $state.go('login');
    });
    AuthorizationService.prepare();
    var promise = Restangular.one('demos', $stateParams.demo).get();
    $scope.demo = promise.get('demo');
    $scope.author = promise.get('owner');
    promise.then(function(response) {
        $scope.configs = Restangular.one('repositories', response.githubName).one('configs').get({
            owner : 'nialdarbey'
        });
        $scope.configs.then(function(conf) {
           $scope.currentConfig = conf.configs[Object.keys(conf.configs)[0]];
        });
    });
    /*$rootScope.$watch('demosMap', function() {
        if (Object.keys($rootScope.demosMap).length > 0) {
            var repository = DemoCorrelationService.getRepository($stateParams.demo);
            $scope.configs = Restangular.one('repositories', repository).one('configs').get({
                owner : 'nialdarbey'
            });
        }
    });*/
    $scope.chooseConfig = function(name) {
        $scope.currentConfig = $scope.configs.get('configs').get(name);
    }
    $scope.taxonomyLabel = function(node) {
        return node.path[node.path.length - 1];
    }

    $scope.chooseVersion = function(version) {
        Restangular.one('demos', $stateParams.demo).one('vers', version).getList('links').then(function(links) {
            $scope.links = {};
            for ( var i = 0; i < links.endpoints.length; i++) {
                $scope.links[links.endpoints[i].uri] = Restangular.one('demos', $stateParams.demo).one('vers', version).one('links', links.endpoints[i].id).one('metadata').get();
            }
            $scope.linksMap = {};
            for ( var uri in $scope.links) {
                $scope.links[uri].then(function(link) {
                    for ( var j = 0; j < link.metadata.length; j++) {
                        if (link.metadata[j].key === 'type') {
                            $scope.linksMap[link.metadata[j].value] = uri;
                        }
                    }
                });
            }
        });
        $scope.linkFor = function(type) {
            if ($scope.linksMap) {
                return $scope.linksMap[type];
            }
        };
        $scope.version = 'Version 3.4.1';
    }
    Restangular.one('demos', $stateParams.demo).all('vers').getList().then(function(vs) {
        $scope.versions = [];
        var v = vs.versions;
        for ( var i = 0; i < v.length; i++) {
            $scope.versions.push(v[i].major + '.' + v[i].minor + '.' + v[i].revision);
        }
        $scope.chooseVersion($scope.versions[0]);
    });
}
