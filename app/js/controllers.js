'use strict';

/* Controllers */

function LoginCtrl($scope, AuthorizationService) {
    $scope.login = function() {
        AuthorizationService.authorize($scope.username, $scope.password, $scope);
    }
}

function RepositoriesCtrl($scope, Restangular, AuthorizationService, $state, DemoCorrelationService, $location) {
    $scope.isSelected = function(repository) {
        return $location.path().indexOf(repository.name) != -1;
    };
    $scope.published = function(repository) {
        return DemoCorrelationService.published(repository.name);
    };
    $scope.showDemo = function(repository) {
        var demo = DemoCorrelationService.getAsr(repository.name);
        $state.go('demos.demo', {
            demo : demo
        });
    };
    
    AuthorizationService.init();
    var repositoriesPromise = Restangular.one('repositories').get({
        owner : AuthorizationService.getUser().githubUsername
    });
    $scope.repositories = repositoriesPromise.get('repositories');
    
    repositoriesPromise.then(function(response) {
        DemoCorrelationService.storeMap(response.publications);
    });
}

function RepositoryCtrl($scope, $stateParams, Restangular, AuthorizationService, $state, DemoCorrelationService, ErrorService) {
    var publishing = false;
    $scope.repository = Restangular.one('repositories', $stateParams.repository).get({
        owner : AuthorizationService.getUser().githubUsername
    });
    $scope.readMe = Restangular.one('repositories', $stateParams.repository).one('read-me').get({
        owner : AuthorizationService.getUser().githubUsername
    });
    $scope.master = { name: $stateParams.repository, major: 3, minor: 4, revision: 0, verticals: [] };
    $scope.availableVerticals = Restangular.all('taxonomies').getList({ q: '.*', limit: 10000});
    $scope.demo = angular.copy($scope.master);
    
    $scope.isPublishing = function() {
        return publishing;
    };
    $scope.publish = function(demo) {
        publishing = true;
        $scope.repository.then(function(repository) {
            var summary = repository.description.replace(/\n/g, '\\n').substring(0, 96);
            summary = (summary === '') ? 'x' : summary;
            $scope.readMe.then(function(readMe) {
                var verticals = [];
                for (var i = 0; i < demo.verticals.length; i++) {
                    verticals.push({
                        taxonomy: demo.verticals[i].taxonomy,
                        path: demo.verticals[i].path,
                        id: demo.verticals[i].id
                    });
                }
                var newDemo = {
                        name : demo.name.replace(/[^A-Za-z 0-9]/g, '-'),
                        repository : $stateParams.repository,
                        description : readMe.replace(/\n/g, '\\n').substring(0, 2048),
                        summary : summary,
                        githubOwner : AuthorizationService.getUser().githubUsername,
                        releaseNotes : readMe.replace(/\n/g, '\\n').substring(0, 8192),
                        githubLink : repository.cloneUrl,
                        amazonLink : demo.amazonLink || 'http://localhost:8080/not/filled/' + $stateParams.repository,
                        version : demo.major + '.' + demo.minor + '.' + demo.revision,
                        author : AuthorizationService.getUser().username,
                        verticals: verticals
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
    $scope.reset = function() {
        publishing = false;
      $scope.demo = angular.copy($scope.master);
    };
    $scope.isUnchanged = function(demo) {
      return angular.equals(demo, $scope.master);
    };

    $scope.$on('event:loginRequired', function() {
        $state.go('login');
    });

    AuthorizationService.init();
    $scope.repository.then(function(repository) {
        $scope.master.name = repository.name;
    });
}

function DemosCtrl($location, $scope, AuthorizationService, Restangular, $state, DemoCorrelationService) {
    $scope.filterOff = function() {
        $location.path($location.path()).search({verticals:null, tags: null});
    };
    $scope.isSelected = function(demo) {
        return $location.path().indexOf(demo.id) != -1;
    }
    $scope.isFiltered = function() {
        return $state.params.verticals || $state.params.tags;
    }
    $scope.filter = function() {
        return ($state.params.verticals || $state.params.tags);
    }
    AuthorizationService.init();
    if ($state.params.tags) {
        $scope.demos = Restangular
            .one('demos')
            .get({ q : $state.params.tags, limit : 0})
            .get('demos')
            .get('services');
    } else if ($state.params.verticals) {
        $scope.demos = Restangular
            .one('taxonomies')
            .one('verticals')
            .one('nodes', $state.params.verticals)
            .one('demos')
            .get();
    } else {
        $scope.demos = Restangular
            .one('demos')
            .get()
            .get('demos')
            .get('services');
    }
}

function SearchCtrl($scope, AuthorizationService, Restangular, $stateParams, $state) {
    $scope.tagMode = true;
    $scope.tags = Restangular
        .all('tags')
        .getList({ q : '.*', limit : 0})
        .get('tags');
    $scope.verticals = Restangular
        .all('taxonomies')
        .getList({ q: '.*', limit: 10000});

    $scope.search = function() {
        if ($scope.tagMode) {
            $state.go('demos.search', { tags: $scope.tag});
        } else {
            $state.go('demos.search', { verticals: $scope.vertical.name})
        }
    };
    $scope.focusVertical = function() {
        $scope.tagMode = false;
    };
    $scope.focusTag = function() {
        $scope.tagMode = true;
    };
    $scope.searchButtonDisabled = function() {
        return $scope.tagMode ? $scope.tag === undefined : false;
    }

    $scope.$on('event:loginRequired', function() {
        $state.go('login');
    });
    
    AuthorizationService.init();
    $scope.vertical = $scope
        .verticals
        .then(function(v) {
                return v[0];
            });
}

function DemoCtrl($scope, $stateParams, AuthorizationService, $state, Restangular, DemoCorrelationService, $rootScope) {
    var demosPromise = Restangular.one('demos', $stateParams.demo).get();
    $scope.demo = demosPromise.get('demo');
    $scope.author = demosPromise.get('author');

    $scope.truncatedConfigName = function(name) {
        if (name.length <= 8) {
            return name + '.xml';
        } else { 
            return name.substring(0, 7) + '...';
        }
    };
    $scope.chooseConfig = function(name) {
        $scope.currentConfig = $scope.configs.get('configs').get(name);
    }
    $scope.taxonomyLabel = function(node) {
        return node.path[node.path.length - 1];
    }

    $scope.chooseVersion = function(version) {
        var versionResource = Restangular.one('demos', $stateParams.demo).one('vers', version);
        $scope.version = versionResource.get(); 
        $scope.links = versionResource.all('links').getList();
        $scope.versionLabel = version;
    }
    $scope.amazonAMIAssigned = function(link) {
        if (link) {
            return link.indexOf('/not/filled') == -1;
        }
    }
    
    AuthorizationService.init();
    demosPromise.then(function(response) {
        $scope.configs = Restangular.one('repositories', response.githubName).one('configs').get({
            owner : response.githubOwner
        });
        $scope.configs.then(function(conf) {
           $scope.currentConfig = conf.configs[Object.keys(conf.configs)[0]];
        });
    });
    Restangular
        .one('demos', $stateParams.demo)
        .all('vers')
        .getList()
        .then(function(vs) {
            $scope.versions = [];
            var v = vs.versions;
            for ( var i = 0; i < v.length; i++) {
                $scope.versions.push(v[i].major + '.' + v[i].minor + '.' + v[i].revision);
            }
            $scope.chooseVersion($scope.versions[0]);
        });
}
