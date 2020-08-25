let appletCtrl = angular.module('AppletCtrl', []);
appletCtrl.controller('appletController', ['$rootScope', '$scope', '$routeParams', '$http', '$compile', '$sce', '$location', '$window', 'BannerService', 'sqlLiteServ','$injector', 'convertSvgIcon', function($rootScope, $scope, $routeParams, $http, $compile, $sce, $location, $window, BannerService, sqlLiteServ,$injector ,convertSvgIcon) {
    let services = {
        "BannerService": BannerService
    }
    $scope.appid = $routeParams.appid;
    $scope.pageid = $routeParams.pageid;

    $scope.evaluateApplet = function(appPage, callBack) {
        try {
            window.eval(appPage.pageprocessor);
            return callBack(appPage);
        } catch (e) {
            if (!$rootScope.isblocking) $.unblockUI();
            console.error(e);
            return callBack(appPage, e);
        }
    }
     $scope.adddynamicPadding = function(){
        var headerHeight = $('#appHeader').height()
        var footerHeight = $('#bottomFixContent').height()
        $('#loadApplet').css({
            'paddingBottom':footerHeight,
            'paddingTop':headerHeight
        })
    }
    $scope.keybordHideshow = () => {
      window.addEventListener('keyboardWillShow', function() {
        Keyboard.disableScroll(false);
        Keyboard.setResizeMode('native');
        $('#dockIcon').hide();
        $('#loadApplet').css('paddingBottom', '0px')
        $('#bottomFixContent').addClass('fixBottomgap0px').removeClass('fixBottomgap');
      });
      window.addEventListener('keyboardWillHide', function() {
        Keyboard.disableScroll(true);
        var footerHeight = $('#bottomFixContent').height();
        if(window.location.hash.split('/')[2] == 'Rbacsignin' && !$rootScope.appDetails.guestApp){
          $('#dockIcon').hide();
        }else{
          $('#dockIcon').show();
        }
        $('#loadApplet').css('paddingBottom', footerHeight)
        $('#bottomFixContent').removeClass('fixBottomgap0px').addClass('fixBottomgap');
      });
      window.addEventListener('keyboardDidShow', function () {
        if(device.platform == "iOS"){
          setTimeout(function() {
              document.activeElement.scrollIntoViewIfNeeded()
          }, 100);
        }
      })
      window.addEventListener('keyboardDidHide', function () {
        $scope.adddynamicPadding();
      })
    }

    $scope.launchPage = function(appPage) {
        var pagedef = {};
        pagedef.datatemplate = appPage.datatemplate;
        pagedef.pageprocessor = appPage.pageprocessor;
        pagedef.pageTemplate = appPage.pageTemplate;
        // Get all additional configs.
        for (var prop in appPage) {
            switch (prop) {
                case "pageid":
                    break;
                case "datatemplate":
                    break;
                case "pageTemplate":
                    break;
                case "pageprocessor":
                    break;
                default:
                    pagedef[prop] = appPage[prop];
            }
        }

        try {
            setTimeout(function() {
                $("#appContent").html("");
                window[$scope.pname](pagedef, $scope, $routeParams, $compile,
                    $http, $rootScope, $sce, $window, $location, services,sqlLiteServ,convertSvgIcon);
                    setTimeout(function() {
                      convertSvgIcon.converTeddata();
                      $scope.adddynamicPadding();
                      //$scope.keybordHideshow();
                    }, 100);
                $scope.$apply();
            }, 100);
        } catch (err) {
            $.unblockUI();
        }
    }

    let found = false;
    $scope.pname = "pageprocessor" + $scope.pageid;

    $scope.checkNewAppletVer = function(){
      var req = {
          headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
          },
          url: '/studio/checkappletver/' + $rootScope.tenantId + '/' + $scope.appid,
          method: 'GET'
      };
      $rootScope.callCMSAPI(req, function(err, res) {
          $rootScope.appletsData = $rootScope.appletsData || [];
          $rootScope.appletsData.push(res.pages[0]);
          $scope.evaluateApplet(res.pages[0], $scope.launchPage);
      });
    }

    $scope.getAppletFromLocal = function(configs){
      angular.forEach($rootScope.appletsData, function(val, key) {
          if (val.pageid == $scope.pageid) {
              found = true;
              for (var prop in configs) {
                val[prop] = configs[prop];
              }
              $scope.evaluateApplet(val, $scope.launchPage);
          }
      });

      if (found) {
          return;
      }

      if (!found) {
          /* check if the page is sql DB */
          if (window.device) {
              let trans = [];
              trans.push({
                  q: `SELECT info FROM pageDetails WHERE pageid = ?`,
                  d: [$scope.pageid]
              });
              sqlLiteServ.runGetQuery(trans, function(err, res) {
                  if (err) {
                      $scope.checkDeviceUpdatePublish();
                  } else {
                      //console.log('pageDetails', JSON.parse(res.item(0).info));
                      $rootScope.appletsData = $rootScope.appletsData || [];
                      $rootScope.appletsData.push(JSON.parse(res.item(0).info));
                      let appletData = JSON.parse(res.item(0).info)
                      for (var prop in configs) {
                        appletData[prop] = configs[prop];
                      }
                      $scope.evaluateApplet(appletData, $scope.launchPage);
                  }
              });
          } else {
              var req = {
                  headers: {
                      'Content-Type': 'application/json',
                      'Accept': 'application/json'
                  },
                  url: '/studio/getmobileappletmetadata/' + $rootScope.tenantId + '/' + $scope.appid + "/" + $scope.pageid,
                  method: 'POST',
                  data:{
                    uuid: window.device?device.uuid:'9876543210',
                  }
              };
              $rootScope.callCMSAPI(req, function(err, res) {
                let appletVersion = $.jStorage.get('appletVersion')?$.jStorage.get('appletVersion'):{};
                appletVersion[$scope.pageid] = res.updateApp.appletversion;
                $.jStorage.set('appletVersion',appletVersion);
                $rootScope.appletsData = $rootScope.appletsData || [];
                $rootScope.appletsData.push(res.updateApp.pages[0]);
                $scope.evaluateApplet(res.updateApp.pages[0], $scope.launchPage);
                $scope.saveApplet($scope.pageid,res.updateApp.pages[0]);
              });
          }
      }
    }

    $scope.saveApplet = function(pageid,pages){
      let trans = [];
      trans.push({
          q: `SELECT info FROM pageDetails WHERE pageid = ?`,
          d: [pageid]
      });
      sqlLiteServ.runGetQuery(trans, function(err, res) {
          if (err) {
            trans = [];
            trans.push({
                q: `CREATE TABLE IF NOT EXISTS pageDetails (info,pageid)`,
                d: null
            });
            trans.push({
                q: `INSERT INTO pageDetails (info,pageid) VALUES (?,?)`,
                d: [JSON.stringify(pages), pageid]
            });
          }else{
            trans = [];
            trans.push({
                q: `UPDATE pageDetails SET info=? WHERE pageid=?`,
                d: [JSON.stringify(pages), pageid]
            });
          }
          sqlLiteServ.runAddQuery(trans, function(err, res) {
              if (err) {
                  console.log(err);
              }
          });
        });
    }

    $scope.checkDeviceUpdatePublish = function(){
      var req = {
          headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
          },
          url: '/studio/getmobileappletmetadata/' + $rootScope.tenantId + '/' + $scope.appid + "/" + $scope.pageid,
          method: 'POST',
          body: { uuid: window.device?device.uuid:'9876543210',
                  cver:$.jStorage.get('appletVersion')?$.jStorage.get('appletVersion')[$scope.pageid]:null
          },
  		    json: true
      };
      $rootScope.callCMSAPI(req, function(err, res) {
          //console.log('checkDeviceUpdatePublish',res);
          if(res.success){
            /* No update is required, get applet from sqlLite else load from mongo DB */
            $scope.getAppletFromLocal(res.configs);
          } else if(res.devicepublish){
            /*let appletVersion = $.jStorage.get('appletVersion')?$.jStorage.get('appletVersion'):{};
            appletVersion[$scope.pageid] = res.devicepublish.appletversion;
            $.jStorage.set('appletVersion',appletVersion);*/
            $scope.evaluateApplet(res.devicepublish.pages[0], $scope.launchPage);
          } else{
            let appletVersion = $.jStorage.get('appletVersion')?$.jStorage.get('appletVersion'):{};
            appletVersion[$scope.pageid] = res.updateApp.appletversion;
            $.jStorage.set('appletVersion',appletVersion);
            $rootScope.appletsData = $rootScope.appletsData || [];
            $scope.evaluateApplet(res.updateApp.pages[0], $scope.launchPage);
            $scope.saveApplet($scope.pageid,res.updateApp.pages[0]);
            angular.forEach($rootScope.appletsData, function(val, key) {
                if (val.pageid == $scope.pageid) {
                    val = res.updateApp.pages[0];
                }
            });
          }
      });
    }();
}]);
