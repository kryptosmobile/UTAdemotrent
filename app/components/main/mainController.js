let mainCtrl = angular.module('MainCtrl', []);
mainCtrl.controller('mainController', ['$rootScope', '$scope', '$routeParams', '$http', '$compile', '$sce', '$location', '$injector', 'sqlLiteServ', function($rootScope, $scope, $routeParams, $http, $compile, $sce, $location, $injector, sqlLiteServ) {
  //$.jStorage.deleteKey("unifyedusername")
  $scope.appSetup = (callBack) => {
     $scope.adddynamicPadding = function(){
        var headerHeight = $('#appHeader').height()
        var footerHeight = $('#bottomFixContent').height()
        $('#loadApplet').css({
            'paddingBottom':footerHeight,
            'paddingTop':headerHeight
        })
    }
    /*$scope.keybordHideshow = () => {
      window.addEventListener('keyboardWillShow', function() {
        Keyboard.disableScroll(false);
        Keyboard.setResizeMode('native');
        $('#dockIcon').hide();
        $('#loadApplet').css('paddingBottom', '0px')
        $('#bottomFixContent').addClass('fixBottomgap0px').removeClass('fixBottomgap');
      });
      window.addEventListener('keyboardWillHide', function() {
        Keyboard.disableScroll(true);
        var footerHeight = $('#bottomFixContent').height()
        $('#dockIcon').show();
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
    $scope.keybordHideshow();*/

    $rootScope.tenantId = tenantInfo.tenantId;
    $rootScope.environment = tenantInfo.env;
    $scope.fetchTenantAppVer = function() {
      var req = {
        headers: {
          'Content-Type': 'application/json',
          'X-TENANT-ID': $rootScope.tenantId
        },
        method: 'GET',
        data: ''
      }
      req['url'] = $rootScope.getBaseUrl('/studio/getAllVersions/' + $rootScope.tenantId);
      $scope.loadDetails = false;
      $rootScope.callOpenAPI(req, function(err, res) {
        if ($.jStorage.get('AppVersion')) {
          var oldVer = $.jStorage.get('AppVersion');
          if (oldVer.cssVer < res.cssVer || oldVer.appVer < res.appVer || oldVer.tenantVer < res.tenantVer) {
            $scope.loadDetails = true;
            $.jStorage.set('AppVersion', res);
          }
        } else {
          $scope.loadDetails = true;
          $.jStorage.set('AppVersion', res);
        }
        callBack(null);
      });
    }();
  }

  $rootScope.trustAsHTML = function (data) {
    return $sce.trustAsHtml(data);
  }

  $scope.loadAppDetails = (callBack) => {
    $scope.fetchTenantAppDetails = function() {
      var req = {
        headers: {
          'Content-Type': 'application/json',
          'X-TENANT-ID': $rootScope.tenantId
        },
        method: 'GET',
        data: ''
      }
      req['url'] = $rootScope.getBaseUrl('/studio/getAllMobileDetails/' + $rootScope.tenantId);
      $rootScope.callOpenAPI(req, function(err, res) {
        let trans = [];
        if ($rootScope.appConfiguration) {
          trans.push({
            q: `UPDATE appDetails SET info = ? WHERE tenantId=?`,
            d: [JSON.stringify(res), $rootScope.tenantId]
          });
        } else {
          trans.push({
            q: `CREATE TABLE IF NOT EXISTS appDetails (info,tenantId)`,
            d: null
          });
          trans.push({
            q: `INSERT INTO appDetails (info,tenantId) VALUES (?,?)`,
            d: [JSON.stringify(res), $rootScope.tenantId]
          });
        }
        $rootScope.appConfiguration = res;
        $rootScope.appDetails = $rootScope.appConfiguration.appDetails;
        $rootScope.authFunction = $rootScope.appConfiguration.authFunction;
        $rootScope.homeScreenTemplate = $rootScope.appConfiguration.homeScreenTemplate;
        try {
          const homeScreenCode = $compile($($rootScope.homeScreenTemplate))($scope);
          $("#homeScreenTemplate").html(homeScreenCode);
          window.eval($rootScope.authFunction);
        } catch (e) {
          console.log(e);
        }
        $rootScope.mobilecss = $rootScope.appConfiguration.mobilecss;
        $rootScope.tenantDetails = $rootScope.appConfiguration.tenantDetails;
        let data = $rootScope.tenantDetails;
        $rootScope.user = $.isEmptyObject($rootScope.user) ? {} : $rootScope.user;
        $rootScope.brandingUrl = data.logoUrl;
        $rootScope.user.tenant = $rootScope.tenantId;
        $rootScope.user.tenantdomain = data['idpTenantDomain'];
        $rootScope.GatewayUrl = 'https://' + data['domain'] + data['gatewaypath'];
        $rootScope.user.domain = data['domain'];
        $rootScope.user.gatewaypath = data['gatewaypath'];
        $rootScope.user.admins = data['admins'] || [];
        $rootScope.user.oauthUserInfoUrl = data['oauthUserInfoUrl'];
        $rootScope.user.products = data['products'];
        $rootScope.user.qlId = data['qlTenantid'];
        $rootScope.user.siteId = data['siteId'];
        window.globalsiteid = $rootScope.user.siteId;
        $rootScope.$broadcast('launchsite', {
          "site": window.globalsiteid
        });
        $rootScope.user.backgroundImg = data['backgroundImg'];
        const tenantTheme = $rootScope.tenantDetails.themeColors;
        const mobileTheme = $rootScope.tenantDetails.mobileThemeColors;
        if (window.device) {
          StatusBar.backgroundColorByHexString(tenantTheme.primaryColor);
          StatusBar.overlaysWebView(false);
          StatusBar.show();
        }
        const themeCSS = $rootScope.mobilecss.replace(/##primaryColor/g, tenantTheme.primaryColor).replace(/##secondaryColor/g, tenantTheme.secondaryColor).replace(/##textColor/g, tenantTheme.textColor).replace(/##btnColor/g, tenantTheme.btnColor).replace(/##headerColor/g, mobileTheme.headerColor).replace(/##headerFontColor/g, mobileTheme.headerFontColor).replace(/##footerColor/g, mobileTheme.footerColor).replace(/##footerIcon/g, mobileTheme.footerIcon).replace(/##menuTopBackground/g, mobileTheme.menuTopBackground).replace(/##menuBottomBackground/g, mobileTheme.menuBottomBackground).replace(/##menuIconColor/g, mobileTheme.menuIconColor);
        $("#themeColorsCSS").html(themeCSS);
        $("#customCSS").html($rootScope.appConfiguration.customCSS);

        if (window.device) {
          sqlLiteServ.runAddQuery(trans, function(err, res) {
            if (err) {
              console.log(err);
            }
          });
        }
        try {
          callBack(null);
        } catch (e) {}
      });
    }

    if (window.device) {
      let trans = [];
      trans.push({
        q: `SELECT info FROM appDetails`,
        d: null
      });
      sqlLiteServ.runGetQuery(trans, function(err, res) {
        console.log('appDetails', err, res);
        if (!err) {
          $rootScope.appConfiguration = JSON.parse(res.item(0).info);
          if ($scope.loadDetails) {
            navigator.notification.alert('Loading new updates for the app.', null, 'Update', 'Ok')
            $scope.fetchTenantAppDetails();
            return;
          } else {
            $rootScope.appDetails = $rootScope.appConfiguration.appDetails;
            $rootScope.authFunction = $rootScope.appConfiguration.authFunction;
            $rootScope.homeScreenTemplate = $rootScope.appConfiguration.homeScreenTemplate;
            try {
              const homeScreenCode = $compile($($rootScope.homeScreenTemplate))($scope);
              $("#homeScreenTemplate").html(homeScreenCode);
              window.eval($rootScope.authFunction);
            } catch (e) {
              console.log(e);
            }
            $rootScope.mobilecss = $rootScope.appConfiguration.mobilecss;
            $rootScope.tenantDetails = $rootScope.appConfiguration.tenantDetails;
            let data = $rootScope.tenantDetails;
            $rootScope.user = $.isEmptyObject($rootScope.user) ? {} : $rootScope.user;
            $rootScope.brandingUrl = data.logoUrl;
            $rootScope.user.tenant = $rootScope.tenantId;
            $rootScope.user.tenantdomain = data['idpTenantDomain'];
            $rootScope.GatewayUrl = 'https://' + data['domain'] + data['gatewaypath'];
            $rootScope.user.domain = data['domain'];
            $rootScope.user.gatewaypath = data['gatewaypath'];
            $rootScope.user.admins = data['admins'] || [];
            $rootScope.user.oauthUserInfoUrl = data['oauthUserInfoUrl'];
            $rootScope.user.products = data['products'];
            $rootScope.user.qlId = data['qlTenantid'];
            $rootScope.user.siteId = data['siteId'];
            window.globalsiteid = $rootScope.user.siteId;
            $rootScope.$broadcast('launchsite', {
              "site": window.globalsiteid
            });
            $rootScope.user.backgroundImg = data['backgroundImg'];
            const tenantTheme = $rootScope.tenantDetails.themeColors;
            const mobileTheme = $rootScope.tenantDetails.mobileThemeColors;
            if (window.device) {
              StatusBar.backgroundColorByHexString(tenantTheme.primaryColor);
              StatusBar.overlaysWebView(false);
              StatusBar.show();
            }
            const themeCSS = $rootScope.mobilecss.replace(/##primaryColor/g, tenantTheme.primaryColor).replace(/##secondaryColor/g, tenantTheme.secondaryColor).replace(/##textColor/g, tenantTheme.textColor).replace(/##btnColor/g, tenantTheme.btnColor).replace(/##headerColor/g, mobileTheme.headerColor).replace(/##headerFontColor/g, mobileTheme.headerFontColor).replace(/##footerColor/g, mobileTheme.footerColor).replace(/##footerIcon/g, mobileTheme.footerIcon).replace(/##menuTopBackground/g, mobileTheme.menuTopBackground).replace(/##menuBottomBackground/g, mobileTheme.menuBottomBackground).replace(/##menuIconColor/g, mobileTheme.menuIconColor);
            $("#themeColorsCSS").html(themeCSS);
            $("#customCSS").html($rootScope.appConfiguration.customCSS);
            console.log('$rootScope.appConfiguration', $rootScope.appConfiguration);
            if ($rootScope.appConfiguration) {
              callBack(null);
              $scope.fetchTenantAppDetails();
            }
          }
        } else {
          $scope.fetchTenantAppDetails();
        }
      });
    } else {
      $scope.fetchTenantAppDetails();
    }
  }

  $scope.checkConfig = function(callBack) {
    if ($.jStorage.get("unifyedusername") && $.jStorage.get("unifyedpassword")) {
      let token = $.jStorage.get("token");
      $rootScope.loggedIn = true;
      $rootScope.user['accessToken'] = token.accessToken;
      $rootScope.user['refreshToken'] = token.refreshToken;
      $rootScope.user['providerData'] = token.accessToken;
      $rootScope.loadUserRbac = true;
      callBack(null);
    } else if ($rootScope.appDetails.guestApp) {
      $rootScope.loadPublicRbac = true;
      $rootScope.loggedIn = false;
      callBack(null);
    } else {
      $rootScope.showSignInPage = true;
      callBack(null);
    }
  }

  $scope.loadRbac = (callBack) => {
    if ($rootScope.showSignInPage) {
      callBack(null);
    } else {
      if ($rootScope.loadPublicRbac) {
        $scope.getSavedPublicRbac = function() {
          let trans = [];
          trans.push({
            q: `SELECT info FROM rbacPublicDetails`,
            d: null
          });
          sqlLiteServ.runGetQuery(trans, function(err, res) {
            callBack(null, JSON.parse(res.item(0).info));
          });
        }

        $scope.updatePublicRbac = function(response) {
          var trans = [];
          trans.push({
            q: `SELECT info FROM rbacPublicDetails`,
            d: null
          });

          sqlLiteServ.runGetQuery(trans, function(err, res) {
            if (err) {
              trans = [];
              trans.push({
                q: `CREATE TABLE IF NOT EXISTS rbacPublicDetails (info,tenantId)`,
                d: null
              });
              trans.push({
                q: `INSERT INTO rbacPublicDetails (info,tenantId) VALUES (?,?)`,
                d: [JSON.stringify(response), $rootScope.tenantId]
              });
              sqlLiteServ.runAddQuery(trans, function(err, res) {});
            } else {
              trans = [];
              trans.push({
                q: `UPDATE rbacPublicDetails SET info = ? WHERE tenantId=?`,
                d: [JSON.stringify(response), $rootScope.tenantId]
              });
            }
          });
        }

        let url = $rootScope.getBaseUrl($rootScope.user.gatewaypath + '/unifyedrbac/rbac/open/menus', $rootScope.environment);
        var req = {
          headers: {
            'Content-Type': 'application/json',
            'X-TENANT-ID': $rootScope.tenantId,
            'site-id': $rootScope.user.siteId
          },
          url: url,
          method: 'POST',
          body: [{
            "roles": ["Public"],
            "product": "global"
          }],
          json: true
        };
        $rootScope.callOpenAPI(req, function(err, res) {
          try {
            if (!res) {
              $scope.getSavedPublicRbac();
            } else {
              $scope.updatePublicRbac(res.data);
            }
          } catch (e) {}
          callBack(null, res);
        });

      } else if ($rootScope.loadUserRbac) {
        let data = $.jStorage.get("user");
        $rootScope.user['id'] = data['id'];
        $rootScope.user['profileBackground'] = data['profileBackground'];
        $rootScope.user['firstName'] = data['firstName'];
        $rootScope.user['lastName'] = data['lastName'];
        $rootScope.user['profileImage'] = data['profileImage'];
        $rootScope.user['role'] = data['role'];
        $rootScope.user['tenant'] = data['tenant'];
        $rootScope.user['email'] = data['email'];
        $rootScope.user['phone'] = data['phone'];
        $rootScope.user['countryCode'] = data['countryCode'];
        $rootScope.user['provider'] = data['provider'];
        $rootScope.user['gender'] = data['gender'];
        $rootScope.user['devices'] = data['devices'];
        $rootScope.user['areaOfInterest'] = data['areaOfInterest'] || [];
        $rootScope.tenantUrl = $rootScope.user['domain'];

        $scope.getSavedRbac = function() {
          var trans = [];
          trans.push({
            q: `SELECT info FROM rbacRoleDetails`,
            d: null
          });

          sqlLiteServ.runGetQuery(trans, function(err, res) {
            callBack(null, JSON.parse(res.item(0).info));
          });
        }

        $scope.updateRbac = function(response) {
          var trans = [];
          trans.push({
            q: `SELECT info FROM rbacRoleDetails`,
            d: null
          });

          sqlLiteServ.runGetQuery(trans, function(err, res) {
            if (err) {
              trans = [];
              trans.push({
                q: `CREATE TABLE IF NOT EXISTS rbacRoleDetails (info,tenantId)`,
                d: null
              });
              trans.push({
                q: `INSERT INTO rbacRoleDetails (info,tenantId) VALUES (?,?)`,
                d: [JSON.stringify(response), $rootScope.tenantId]
              });
              sqlLiteServ.runAddQuery(trans, function(err, res) {});
            } else {
              trans = [];
              trans.push({
                q: `UPDATE rbacRoleDetails SET info = ? WHERE tenantId=?`,
                d: [JSON.stringify(response), $rootScope.tenantId]
              });
            }
          });
        }

        let url = "/unifyedrbac/rbac/user?user=" + $rootScope.user.email + "&device=mobile";
        $rootScope.callAPI(url, 'GET', {}, function(response) {
          console.log('userrbac', response);
          try {
            if (!response) {
              $scope.getSavedRbac();
            } else {
              $scope.updateRbac(response.data);
            }
          } catch (e) {}
          callBack(null, response.data);
        });
      }
    }
  }

  if (window.device && navigator.connection.type == "none") {
    navigator.notification.alert('No network connection found. Please check your network settings and try again.', function() {
      navigator.app.exitApp();
    }, 'No Network', 'Ok');
    return;
  }
  async.waterfall([
    $scope.appSetup,
    $scope.loadAppDetails,
    $scope.checkConfig,
    $scope.loadRbac
  ], function(err, results) {
    /* Evaluate the default auth and home screen template code */
    MyCampusApp = {};
    MyCampusApp.rootScope = $rootScope;
    /* End of Evaluate the default auth and home screen template code */
    console.log('results', results);
    if (!results) {
      /* If app has only auth applets and user is not logged In */
      $location.path('/app/Rbacsignin/Rbacsignin');
    } else {
      var menudata = results;
      $rootScope.dockApplets = menudata.docks;
      menudata.menus = $rootScope.removeDuplicates(menudata);
      $rootScope.rbacnavmenu = $rootScope.buildMenuTree(menudata.menus);
      $rootScope.rbacallmenus = menudata.menus;
      console.log('$rootScope.rbacnavmenu', $rootScope.rbacnavmenu);
      console.log('$rootScope.rbacallmenus', $rootScope.rbacallmenus);
      if(menudata.landingPages.length > 0){
        angular.forEach(menudata.menus, function(value, key) {
          if (value.id == menudata.landingPages[0].pageId) {
            $rootScope.landingPage = value;
          }
        });
      }
      if ($rootScope.loadUserRbac) {
      $rootScope.getNotificationBadgeMobile();
      var badgeInterval = 2 * 60 * 1000; //every two minute
      setInterval($rootScope.getNotificationBadgeMobile, badgeInterval);
      $rootScope.loadUnacknowledgedMessage();
      let push = PushNotification.init({
        android: {
          senderID: tenantInfo.senderId,
          icon: "myicon",
          iconColor: "#123456",
          vibrate: "true",
          sound: "true"
        },
        browser: {
          pushServiceURL: 'http://push.api.phonegap.com/v1/push'
        },
        ios: {
          alert: "true",
          badge: "true",
          sound: "true"
        },
        windows: {}
      });
      $rootScope.inAppNotificationHandler(push);
    }
    $location.path('/app/Rbacsetting/RbacsettingPage9');
    }
  });

}]);
