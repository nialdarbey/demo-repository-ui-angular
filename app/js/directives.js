'use strict';

/* Directives */

app.directive('alertBar', [ '$parse', function($parse) {
  return {
          restrict : 'A',
          template : '<div class="alert alert-error alert-bar" ng-show="errorMessage">' + '<button type="button" class="close" ng-click="hideAlert()">x</button>{{errorMessage}}</div>',
          link : function(scope, elem, attrs) {
            var alertMessageAttr = attrs['alertmessage'];
            scope.errorMessage = null;
            scope.$watch(alertMessageAttr, function(newVal) {
              scope.errorMessage = newVal;
            });
            scope.hideAlert = function() {
              scope.errorMessage = null;
            };
            $parse(alertMessageAttr).assign(scope, null);
          }
  }
} ]);

app.directive('showdown', function($compile) {
  return function(scope, element, attrs) {
    scope.$watch(function(scope) {
      return scope.$eval(attrs.showdown);
    }, function(value) {
      if (value) {
        var converter = new Showdown.converter();
        element.html(converter.makeHtml(value));
        $compile(element.contents())(scope);
      }
    });
  };
});

app.directive('typeahead', function(){
  return{
    restrict: 'E',
    replace: true,
    scope: {
      choice: '=',
      list: '='
    },
    template: '<input type="text" ng-model="choice" />',
    link: function(scope, element, attrs){
      scope.typeaheadElement = element;
      $(element).typeahead({
        source: scope.list,
        updater: function(item){
          scope.$apply(function(){
            scope.choice = item;
          });
          return item;
        }
      });
      
      scope.$watch('list', function(newList, oldList){
        $(element).data('typeahead').source = newList;
      } ,true);
    }
  };
});

app.directive('moment', function($compile) {
  return function(scope, element, attrs) {
    scope.$watch(function(scope) {
      return scope.$eval(attrs.moment);
    }, function(value) {
      element.html(moment(value).fromNow());
      $compile(element.contents())(scope);
    });
  };
});

app.directive('highlight', [ '$timeout', function(timer) {
  return {
          restrict : 'A',
          link : function(scope, element, attrs) {
            $(element).each(function(i, e) {
              hljs.highlightBlock(e);//, null, true);
            });
          }
  }
} ]);