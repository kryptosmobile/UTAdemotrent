'use strict';

/* Services */
angular.module('MobileServices', []).factory('unifyedglobal', ['$http', '$rootScope', '$location', 'sqlLiteServ', '$route', function($http, $rootScope, $location, sqlLiteServ, $route) {
    function fnGetClearpass(config, callBack) {
        //Skip clearpass API call if password exists
        if ($rootScope.password) {
            config.password = $rootScope.password;
            return callBack(null, config);
        }
        //var clearpassEndpoint =  "https://qlsso.quicklaunchsso.com/admin/secured/" + qlTenantid + "/api/getClearPass";
        var clearpassEndpoint = $rootScope.idpUrl + "/admin/secured/" + $rootScope.qlTenantId + "/api/getClearPass";
        console.log("clearpassurl= " + clearpassEndpoint);
        //var clearpassEndpoint = config.clearpassUrl;
        // call clearpass API
        $http({
            url: clearpassEndpoint,
            method: 'GET',
            withCredentials: true
        }).then(function successCallback(res) {
            if (!res.data) {
                console.error("Unkonw error: Clearpass API not executed properly. " + res);
                return callBack({
                    "err": "Couldnt get clearpass from QL"
                });
            }
            $rootScope.password = config.password = res.data;
            return callBack(null, config);
        }, function errorCallback(err) {
            console.error(err);
            return callBack(err);
        });
    }

    function handleWebAdapterAuthentication(erpconfig, callBack) {
        //For webadapter products, need external authentication to webadapter to get valid ticket for calling service APIs
        var url = erpconfig.middlewareServerUrl + "/services/authenticate/" + $rootScope.user.tenant + "/" + erpconfig.product;
        //Example: https://kryptosmw.kryptosmobile.com/webadapter2/services/authenticate/SWCC/colleague
        var data = {};
        if (window.device) {
            data = "username=" + erpconfig.username + "&password=" + erpconfig.password;
        } else {
            url = "/websimulator/json?url=" + url;
            data = {
                method: "POST",
                body: "username=" + erpconfig.username + "&password=" + erpconfig.password
            };
        }
        $.blockUI();
        $http.post(url, data).success(function(data, status, headers, config) {
            $.unblockUI();
            $rootScope.erpticket[erpconfig.product] = data.ticket;
            var serviceUrl = erpconfig.middlewareServerUrl + "/services/data/" + $rootScope.user.tenant + "/" + erpconfig.product + erpconfig.endpoint + "?ticket=" + $rootScope.erpticket[erpconfig.product];
            console.log("Service URL: " + serviceUrl);
            erpconfig.serviceUrl = serviceUrl;
            return callBack(null, erpconfig);
        }).error(function(data, status, headers, config) {
            $.unblockUI();
            $rootScope.erpticket[erpconfig.product] = "";
            return callBack(data);
        });
    }

    function handleBannerAuthentication(erpconfig, callBack) {
        //For banner products, need external authentication to webadapter to get valid ticket for calling service APIs
        var url = erpconfig.middlewareServerUrl + "/services/authenticate/login";
        //Example: https://kryptosda.kryptosmobile.com/kmwda1mwcc/services/authenticate/login
        var data = {};
        //if (window.device) {
        data = "username=" + erpconfig.username + "&password=" + erpconfig.password;
        //} else {
        //  url = "/websimulator/json?url=" + url;
        //  data = {
        //    method: "POST",
        //    body: "username=" + erpconfig.username + "&password=" + erpconfig.password
        //  };
        //}
        $.blockUI();
        $http.post(url, data).success(function(data, status, headers, config) {
            $.unblockUI();
            $rootScope.erpticket[erpconfig.product] = data.ticket;
            var serviceUrl = erpconfig.middlewareServerUrl + "/services/student" + erpconfig.endpoint + "?ticket=" + $rootScope.erpticket[erpconfig.product];
            console.log("Service URL: " + serviceUrl);
            erpconfig.serviceUrl = serviceUrl;
            return callBack(null, erpconfig);
        }).error(function(data, status, headers, config) {
            $.unblockUI();
            $rootScope.erpticket[erpconfig.product] = "";
            return callBack(data);
        });
    }

    function handleBannerOAuthAuthentication(config, callBack) {
        //For Banner, no need of external authentication, API service call itself would validate and get the service data.
        $rootScope.erpticket[config.product] = $rootScope.user.accessToken;
        var serviceUrl = config.middlewareServerUrl + "/services/student/" + config.endpoint + "?ticket=" + $rootScope.erpticket[config.product];
        console.log("Service URL: " + serviceUrl);
        config.serviceUrl = serviceUrl;
        return callBack(null, config);
    }

    function setupDemoServiceEndpoints(config, callBack) {
        if (config.product.toLowerCase() == "banner") {
            config.serviceUrl = config.middlewareServerUrl + "/services/student" + config.endpoint;
        } else if (config.product.toLowerCase() == "ps") {
            config.serviceUrl = config.middlewareServerUrl + "/services/data/" + $rootScope.user.tenant + "/" + config.product + config.endpoint;
        }
        return callBack(null, config);
    }

    function setupServiceEndpoints(config, callBack) {
        if (!config.middlewareServerUrl) {
            console.error("Middleware server URL not mentioned for the applet !");
        }
        if (config.product && config.product.toLowerCase() == "banner") {
            config.serviceUrl = config.middlewareServerUrl + "/services/student" + config.endpoint + "?ticket=" + $rootScope.erpticket[config.product];
        } else if (config.product && config.product.toLowerCase() == "ps") {
            if (config.demoMode) {
                config.serviceUrl = config.middlewareServerUrl + "/" + config.product.toLowerCase() + config.endpoint + "?ticket=" + $rootScope.erpticket[config.product];
            } else {
                config.serviceUrl = config.middlewareServerUrl + "/services/data/" + $rootScope.user.tenant + "/" + config.product + config.endpoint + "?ticket=" + $rootScope.erpticket[config.product];
            }
        } else if (!config.product) {
            console.error("Product name not mentioned for the applet !");
        }
        return callBack(null, config);
    }

    function erpConnect(config, callBack) {
        config.username = $rootScope.username;
        // Remove the query parameters in case of demo mode
        if (config.demoMode) {
            var tempParamExists = config.endpoint.indexOf("=");
            var tempUrl = "";
            if (tempParamExists > 0) {
                config.endpoint = config.endpoint.substring(0, config.endpoint.lastIndexOf("/"));
            }
            setupDemoServiceEndpoints(config, function(err, config) {
                return callBack(err, config);
            });
        } else {
            if (config.product.toLowerCase() == "banner") {
                if (config.tokenType == "oauth") {
                    handleBannerOAuthAuthentication(config, function(err, config) {
                        return callBack(err, config);
                    });
                } else {
                    config.clearpassUrl = $rootScope.qlClearPassUrl;
                    fnGetClearpass(config, function(err, config) {
                        if (!err) {
                            handleBannerAuthentication(config, function(err, config) {
                                return callBack(err, config);
                            });
                        }
                        return callBack(err, config);
                    });
                }
            } else if (config.product.toLowerCase() == "ps") {
                config.clearpassUrl = $rootScope.qlClearPassUrl;
                fnGetClearpass(config, function(err, config) {
                    if (!err) {
                        handleWebAdapterAuthentication(config, function(err, config) {
                            return callBack(err, config);
                        });
                    }
                    return callBack(err, config);
                });
            }
        }
    }

    function executeServiceAPI(erpconfig, method, counter, callBack) {
        setupServiceEndpoints(erpconfig, function(err, erpconfig) {
            var serviceUrl = erpconfig.serviceUrl;
            console.log(serviceUrl);
            var url = "";
            var proxyMethod = method;
            var proxyData = {};
            if (window.device) {
                url = serviceUrl;
            } else {
                url = "/websimulator/json?url=" + encodeURIComponent(serviceUrl);
                proxyMethod = "POST";
                proxyData = {
                    method: method
                }
                if (method == "POST") {
                    proxyData = {
                        method: "POST",
                        body: erpconfig.postdata
                    }
                    if (erpconfig.demoMode) {
                        proxyData = "";
                        url = serviceUrl;
                    }
                }
            }
            counter++;
            /*$http({
                method: proxyMethod,
                url: url,
                data: proxyData
            }).success(function (data, status, headers, config) {
                console.log("RESULTS:");
                console.log(data);
                callBack(erpconfig, data, status, headers, config);
            }).error(function (data, status, headers, config) {
                if (status == 403 && counter <= 2) {
                    // ticket expired, need to reauthenticate
                    erpConnect(erpconfig, function (err, erpconfig) {
                        if (err) {
                            $.unblockUI();
                            console.log("Couldnt execute API due to errors.");
                            return callback();
                        }
                        return executeServiceAPI(erpconfig, method, counter, callBack);
                    });
                } else {
                    return callBack(erpconfig, data, status, headers, config);
                }
            });*/

            $http({
                method: proxyMethod,
                url: url,
                data: proxyData
            }).then(function successCallback(data, status, headers, config) {
                console.log("RESULTS:");
                console.log(data);
                callBack(erpconfig, data.data, status, headers, config);
            }, function errorCallback(data, status, headers, config) {
                if (status == 403 && counter <= 2) {
                    // ticket expired, need to reauthenticate
                    erpConnect(erpconfig, function(err, erpconfig) {
                        if (err) {
                            $.unblockUI();
                            console.log("Couldnt execute API due to errors.");
                            return callback();
                        }
                        return executeServiceAPI(erpconfig, method, counter, callBack);
                    });
                } else {
                    return callBack(erpconfig, data, status, headers, config);
                }
            });
        });

    }

    function validateConfigObject(config) {
        if (!config.middlewareServerUrl) {
            console.error("Middleware Server URL not mentioned for applet !");
            return false;
        }
        if (!config.product) {
            console.error("Product name not mentioned for applet !");
            return false;
        }
        if (!config.endpoint) {
            console.error("API endpoint not mentioned !");
            return true;
        }
        return true;
    }

    $rootScope.postAPI = function(config, endpoint, postdata, callback) {
        config.endpoint = endpoint;
        config.postdata = postdata;
        config.demoMode = (config.middlewareServerUrl == "https://kryptosda.kryptosmobile.com/kryptosds") ? true : false;
        if (!validateConfigObject(config)) {
            return callback();
        }
        $.blockUI();
        if ($rootScope.demoMode || (!$rootScope.demoMode && $rootScope.erpticket && $rootScope.erpticket[config.product])) {
            executeServiceAPI(config, "POST", 1, function(erpconfig, data, status, headers, config) {
                $.unblockUI();
                return callback(data, status, headers, config);
            });
        } else {
            if (!$rootScope.erpticket) {
                $rootScope.erpticket = {};
            }
            erpConnect(config, function(err, config) {
                if (err) {
                    console.log("Couldnt execute API due to errors.");
                    $.unblockUI();
                    return callback();
                }
                executeServiceAPI(config, "POST", 1, function(erpconfig, data, status, headers, config) {
                    $.unblockUI();
                    return callback(data, status, headers, config);
                });
            });
        }
    };


    $rootScope.getAPI = function(config, endpoint, callback) {
        config.endpoint = endpoint;
        config.demoMode = (config.middlewareServerUrl == "https://kryptosda.kryptosmobile.com/kryptosds") ? true : false;
        if (!validateConfigObject(config)) {
            return callback();
        }
        $.blockUI();
        if ($rootScope.demoMode || (!$rootScope.demoMode && $rootScope.erpticket && $rootScope.erpticket[config.product])) {
            executeServiceAPI(config, "GET", 1, function(erpconfig, data, status, headers, config) {
                $.unblockUI();
                return callback(data, status, headers, config);
            });
        } else {
            if (!$rootScope.erpticket) {
                $rootScope.erpticket = {};
            }
            erpConnect(config, function(err, config) {
                if (err) {
                    console.error("Couldnt execute API due to errors.");
                    $.unblockUI();
                    return callback();
                }
                if (window.device) {
                    executeServiceAPI(config, "GET", 1, function(erpconfig, data, status, headers, config) {
                        $.unblockUI();
                        return callback(data, status, headers, config);
                    });
                } else {
                    executeServiceAPI(config, "POST", 1, function(erpconfig, data, status, headers, config) {
                        $.unblockUI();
                        return callback(data, status, headers, config);
                    });
                }
            });
        }
    };
    /******************************************************************************************************************************************/

    $rootScope.userNameIntialsColor = ['#36B37E', '#FF5630', '#FFAB00', '#8d99ae', '#50939b', '#de4d78', '#bc59cf', '#0f5772', '#7d7e7d', '#4fb443', '#596fef', '#00b8ff'];
    $rootScope.randomBackground = function(fn, ln) {
        var first = fn;
        var last = ln;
        var name = first + last;
        var sum = 0;
        for (var i = 0; i < name.length; i++) {
            sum += name.charCodeAt(i);
        }
        return $rootScope.userNameIntialsColor[sum % $rootScope.userNameIntialsColor.length];
    }

    $rootScope.userRolestoString = function(a) {
        for (var i = 0; i < a.length; i++) {
            a[i] = a[i].charAt(0).toUpperCase() + a[i].slice(1);
        }
        return a.toString().replace(/,/g, ', ');
    }

    $rootScope.inAppNotificationHandler = function(push) {
        push.on('notification', function(data) {
            if (data.additionalData.foreground) {
                //navigator.notification.alert(data.message,null,data.title,'Ok');
                if (data.additionalData.picture || data.additionalData.image) {
                    if (device.platform == "Android") {
                        $('#notImg').attr('src', data.additionalData.picture);
                    } else {
                        $('#notImg').attr('src', data.additionalData.image);
                    }
                    $('#notImg').show();
                } else {
                    //$('#notImg').attr('src', '');
                    $('#notImg').hide();
                }
                $('#notTitle').html(data.title);
                $('#notDesc').html(data.message);
                $('.modale').css('display', 'block');
                setTimeout(function() {
                    $('.modale').addClass('opened');
                }, 1000)
            } else {
                if (data.title == 'BlueLight Tracking Alert') {

                    var mdata = data.message;
                    var href = "/app/BlueLightEmergency32/BlueLightEmergency32";

                    $location.path(href).search({
                        email: data.trackEmail
                    });

                } else if (data.title.indexOf("sent a new message!") != -1 ||
                    data.title.indexOf("wants to Chat!") != -1 ||
                    data.title.indexOf("approved chat connection!") != -1) {
                    var href = "/app/UnifyedChat/UnifyedChat";
                    $location.path(href).search({
                        pushtitle: data.title
                    });
                }
            }
        });
    }

    /*****************Services for unifyed applets (whatsUp, messaging etc) *********************************/
    $rootScope.isEmpty = function(obj) {
        return (Object.keys(obj).length === 0);
    };

    $rootScope.getHeaders = function(url, method) {

        var headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Bearer ' + $rootScope.user.accessToken,
            'X-TENANT-ID': $rootScope.user.tenant,
            'X-TENANT-DOMAIN': $rootScope.user.tenantdomain,
            'principal-user': $rootScope.username,
            'Site-ID': $rootScope.user.siteId,
            'timeStamp': new Date().getTime()
        }

        if ($rootScope.site && $rootScope.site._id) headers['site-id'] = $rootScope.site._id;

        if ($rootScope.user.email && url.indexOf("/unifyed-mydrive/") != -1 ||
            $rootScope.user.email && url.indexOf("/unifyed-notificationcentre/") != -1 ||
            $rootScope.user.email && url.indexOf("/unifyedsitegroups/") != -1 ||
            $rootScope.user.email && url.indexOf("/unifyedchat/") != -1)
            headers['X-USER-EMAIL'] = $rootScope.user.email;

        if ($rootScope.user.email && url.indexOf("/unifyedcladapter/") != -1) {
            headers['userid'] = $rootScope.user.email.split('@')[0];
        }
        return headers;
    }

    $rootScope.callAPI = function(url, method, data, callback) {
        try {
            if (!$rootScope.isblocking) $.blockUI();
            var apiEndPoint = $rootScope.GatewayUrl + url;
            if (window.globalsiteid) callAPISiteId = window.globalsiteid;
            var req = {
                "method": method,
                "url": apiEndPoint,
                "headers": $rootScope.getHeaders(url, method),
                data: data,
                json: true
            };

            console.log('apiEndPoint', req);
            $http(req).then(function successCallback(res) {
                if (!$rootScope.isblocking) {
                    $.unblockUI();
                }

                return callback(res);
            }, function errorCallback(err) {
                console.log(JSON.stringify(err));
                if (!$rootScope.isblocking) {
                    $.unblockUI();
                }
                //return callback();
                /* Commented the code below since token refersh is not working */
                if (err.status == 404) {
                    return callback(null);
                } else if (err.status == 0 || err.status == 401 || err.status == -1) {
                    $rootScope.refreshToken(url, method, data, callback);
                    //return callback();
                } else {
                    callback(err);
                }
            });
        } catch (e) {
            if (!$rootScope.isblocking) {
                $.unblockUI();
            }
            console.log(e)
            return callback();
        }
    }
    $rootScope.resetApp = function() {
        $rootScope.user = null;
        $rootScope.loggedIn = false;
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
        $rootScope.user.backgroundImg = data['backgroundImg'];
        $location.path("/app/Rbacsignin/Rbacsignin");
        $route.reload();
    }

    $rootScope.refreshHandler = function() {
        if ($rootScope.appDetails.guestApp) {
            let url;
            if (window.device) {
                url = $rootScope.GatewayUrl + '/unifyedrbac/rbac/open/menus'
            } else {
                url = $rootScope.getBaseUrl($rootScope.user.gatewaypath + '/unifyedrbac/rbac/open/menus', $rootScope.environment);
            }
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
                var menudata = res;
                $rootScope.dockApplets = menudata.docks;
                menudata.menus = $rootScope.removeDuplicates(menudata);
                $rootScope.rbacnavmenu = $rootScope.buildMenuTree(menudata.menus);
                $rootScope.rbacallmenus = menudata.menus;
                angular.forEach(menudata.menus, function(value, key) {
                    if (value.id == menudata.landingPages[0].pageId) {
                        $rootScope.landingPage = value;
                    }
                });
                /*trans = [];
                trans.push({
                    q: `CREATE TABLE IF NOT EXISTS rbacPublicDetails (info,tenantId)`,
                    d: null
                });
                trans.push({
                    q: `INSERT INTO rbacPublicDetails (info,tenantId) VALUES (?,?)`,
                    d: [JSON.stringify(res), $rootScope.tenantId]
                });
                sqlLiteServ.runAddQuery(trans, function(err, res) {});*/
                $rootScope.resetApp();
            });
        } else {
            $rootScope.resetApp();
        }
    }

    $rootScope.refreshToken = function(url, method, apidata, callback) {
        $.blockUI();
        var refreshUrl = $rootScope.GatewayUrl + "/unifydidentity/open/oauth2/token";
        //var data = "refresh_token=" + $rootScope.user.refreshToken;
        var data = 'username=' + $.jStorage.get("unifyedusername") + '&password=' + $.jStorage.get("unifyedpassword");
        var req = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-TENANT-ID': $rootScope.tenantId
            },
            url: refreshUrl,
            method: 'POST',
            data: data,
            json: true
        }
        $http(req).then(function successCallback(res) {
            var data = res.data;
            console.log('beforeRefresh', $rootScope.user);
            $rootScope.user['accessToken'] = data.access_token;
            $rootScope.user['refreshToken'] = data.refresh_token;
            $rootScope.user['providerData'] = data.access_token;
            console.log('afterRefresh', $rootScope.user);
            $.jStorage.set('user', $rootScope.user);
            $.jStorage.set('token', res.data);
            $rootScope.callAPI(url, method, apidata, callback);
            $.unblockUI();
        }, function errorCallback(err) {
            console.log(err);
            $.unblockUI();
            if (window.device) {
                navigator.notification.alert('Your session is expired. Please login again.', null, 'Session Expired', 'Ok');
            } else {
                alert('Your session is expired. Please login again.');
            }
            $.jStorage.deleteKey("user");
            $.jStorage.deleteKey("token");
            $.jStorage.deleteKey("unifyedusername");
            $.jStorage.deleteKey("unifyedpassword");
            $rootScope.refreshHandler();
        });
    };

    $rootScope.callOpenAPI = function(option, cb) {
        console.log('callOpenAPI', option, $rootScope.user);
        var req;
        if (window.device) {
            option.data = option.body;
            req = option
        } else {
            req = {
                url: 'https://kryptosda.kryptosmobile.com/kryptosds/utils/proxy',
                data: option,
                method: 'POST'
            }
        }

        //console.log('callOpenAPI', option);
        $http(req).then(function successCallback(res) {
            cb(null, res.data);
        }, function errorCallback(err) {
            cb(err, null);
        });

    };

    $rootScope.callCMSAPI = function(option, cb) {
        console.log('callCMSAPI', option, $rootScope.user);

        var req;
        if (window.device) {
            option.url = `https://${$rootScope.user.domain}${option.url}`;
            option.data = option.body;
            req = option
        } else {
            option.url = $rootScope.getBaseUrl(option.url, $rootScope.environment);
            req = {
                url: 'https://kryptosda.kryptosmobile.com/kryptosds/utils/proxy',
                data: option,
                method: 'POST'
            }
        }
        $http(req).then(function successCallback(res) {
            cb(null, res.data);
        }, function errorCallback(err) {
            cb(err, null);
        });
    };

    $rootScope.getNotificationBadgeMobile = function() {
        $rootScope.notificationcentre = $rootScope.notificationcentre || {}
        if (!$rootScope.GatewayUrl || !$rootScope.user || !$rootScope.user.accessToken || !$rootScope.user.email) {
            setTimeout(function() {
                $rootScope.getNotificationBadgeMobile();
            }, 500);
            return true;
        }

        var headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Bearer ' + $rootScope.user.accessToken,
            'X-TENANT-ID': $rootScope.user.tenant,
            'X-TENANT-DOMAIN': $rootScope.user.tenantdomain,
            'principal-user': $rootScope.username,
            'X-USER-EMAIL': $rootScope.user.email
        }
        if ($rootScope.site && $rootScope.site._id) headers['site-id'] = $rootScope.site._id;
        var url = $rootScope.GatewayUrl + '/unifyed-notificationcentre/v1/notifications/count?type=sent';
        $http({
            method: 'GET',
            url: url,
            headers: headers
        }).then(function successCallback(response) {
            $rootScope.notificationcentre.badge = (response && response.data && response.data.data) || 0;
            try {
                $rootScope.$apply();
            } catch (ex) {}
        }, function errorCallback(error) {
            console.log("in callAPI, URL : " + url + " : error status=" + error.status);
        });
    };



    function setAppTitle(next, current) {
        console.log();
        angular.forEach($rootScope.rbacallmenus, function(value, key) {
            if (value.type == 'applet' && value.url.split('/')[2] == next.params.appid) {
                $rootScope.appletTitle = value.label
            } else if (value.type == 'page' && value.url.split('/')[2] == next.params.id) {
                $rootScope.appletTitle = value.label
            }
        });
    }


    $rootScope.$on("$routeChangeStart", function(event, next, current) {
        $.blockUI();
        $rootScope.currentPagePath = $location.path();
        if (window.device && navigator.connection.type == "none") {
            navigator.notification.alert('No network connection found. Please check your network settings and try again.', function() {
                $location.path($rootScope.currentPagePath);
                $route.reload();
            }, 'No Network', 'Ok');
            return;
        }
        if ($rootScope.rbacnavmenu) {
            if ((current.params.sitebaseurl && next.params.appid == "UnifyedGroups") ||
                (current.params.sitebaseurl && $location.path().startsWith("/group/")) || ($rootScope.groupPageFromMenu && next.params.appid == "Rbacmenu")) {
                $rootScope.hideDockMenu = false;
                //navigating back from groups page, refresh rbac menu
                $rootScope.user.siteId = $rootScope.olderSiteIdPortal || $rootScope.user.siteId;
                window.globalsiteid = $rootScope.user.siteId;
                window.siteGroupId = undefined;
                $rootScope.groupPageFromMenu = false;
                let url1 = "/unifyedrbac/rbac/user?user=" + $rootScope.user.email + "&device=mobile";
                $rootScope.callAPI(url1, 'GET', {}, function(response) {
                    if (response && response.data) {
                        $rootScope.rbacGroupMenuGenerated = true;
                        var menudata = response.data;
                        // $rootScope.dockApplets = menudata.docks;
                        menudata.menus = $rootScope.removeDuplicates(menudata);
                        $rootScope.rbacnavmenu = $rootScope.buildMenuTree(menudata.menus);
                        $rootScope.rbacallmenus = menudata.menus;
                        setAppTitle(next, current);
                    }
                });
            }
            if (next.params.sitebaseurl && $location.path().startsWith("/group/")) {
                $rootScope.hideDockMenu = true;
            }
            setAppTitle(next, current);
        }
    });
    var fixgap = function addPadding() {
        var headerHeight = $('#appHeader').height()
        var footerHeight = $('#bottomFixContent').height()
        $('#loadApplet').css({
            'paddingBottom': footerHeight,
            'paddingTop': headerHeight
        })
    }
    $rootScope.$on("$routeChangeSuccess", function(event, next, current) {
        $.unblockUI();
        $(".dockIconLink .dockIconImage").children('.dock-menu-icon').css('opacity', 0.6);
        $(".dockIconLink .dockIconLabel").css('opacity', 0.6);
        if ($rootScope.dockApplets) {
            for (var i = 0; i < $rootScope.dockApplets.length; i++) {
                if (('/app/' + next.pathParams.appid + '/' + next.pathParams.pageid == $rootScope.dockApplets[i].url)) {
                    $(".dockIcon" + $rootScope.dockApplets[i].id).children('.dockIconImage').children('.dock-menu-icon').css('opacity', 1);
                    $(".dockIcon" + $rootScope.dockApplets[i].id).children('.dockIconLabel').css('opacity', 1);
                    break;
                } else if ('/app/' + next.pathParams.appid + '/' + next.pathParams.pageid == "/app/Rbacmenu/Rbacmenu") {
                    $(".menuRbac").children('.dockIconImage').children('.dock-menu-icon').css('opacity', 1)
                    $(".menuRbac").children('.dockIconLabel').css('opacity', 1)
                }
            }
        }
        setTimeout(function() {
            fixgap();
        }, 1000)
    })

    $rootScope.compare = function(a, b) {
        var genreA = a.precedence;
        var genreB = b.precedence;

        var comparison = 0;
        if (genreA > genreB) {
            comparison = 1;
        } else if (genreA < genreB) {
            comparison = -1;
        }
        return comparison;
    }

    $rootScope.removeDuplicates = function(arr) {
        var unique_array = []
        var unique_object = [];
        for (var i = 0; i < arr.menus.length; i++) {
            if (unique_array.indexOf(arr.menus[i].id) == -1) {
                unique_array.push(arr.menus[i].id)
                unique_object.push(arr.menus[i]);
            } else {
                for (var j = 0; j < unique_object.length; j++) {
                    if (unique_object[j].id == arr.menus[i].id) {
                        for (var permission in arr.menus[i].actions) {
                            if (!unique_object[j].actions.hasOwnProperty(permission)) {
                                unique_object[j].actions[permission] = true;
                            }
                        }
                    }
                }
            }
        }
        return unique_object
    }

    $rootScope.buildMenuTree = function(menuRanks) {
        $rootScope.masterMenuTree = [];
        var pushEleInGroup = function(tree, ele) {
            angular.forEach(tree, function(node, key) {
                //tree.forEach(node => {
                if ($rootScope.rbacFirstLanding && node.id == $rootScope.rbacFirstLanding.pageId) {
                    $rootScope.rbacFirstLanding.menu = node;
                    $rootScope.site.landingpage = $rootScope.rbacFirstLanding.menu.url;
                }
                if (node.path.split('/')[node.path.split('/').length - 1] == ele.root) {
                    node.children = node.children || [];
                    node.children.push(ele);
                } else if (node.children) {
                    pushEleInGroup(node.children, ele);
                }
            });
        }

        //menuRanks.forEach(node => {
        angular.forEach(menuRanks, function(node, key) {

            if ($rootScope.rbacFirstLanding && node.id == $rootScope.rbacFirstLanding.pageId) {
                $rootScope.rbacFirstLanding.menu = node;
                $rootScope.site.landingpage = $rootScope.rbacFirstLanding.menu.url;
            }
            if (node.path == node.root) {
                node.children = [];
                $rootScope.masterMenuTree.push(node)
            } else {
                pushEleInGroup($rootScope.masterMenuTree, node);
            }
        });

        return $rootScope.masterMenuTree;
    }

    $rootScope.getBaseUrl = function(url) {
        let baseUrl = "";
        switch ($rootScope.environment) {
            case 'dev':
                {
                    baseUrl = 'https://dev.unifyed.com';
                    break;
                }
            case 'stage':
                {
                    baseUrl = 'https://unifyed-staging.unifyed.com';
                    break;
                }
            case 'prod':
                {
                    baseUrl = 'https://unifyedprod.unifyed.com';
                    break;
                }
            case 'qa':
                {
                    baseUrl = 'https://unifyedqa.unifyed.com';
                    break;
                }
            case 'uat':
                {
                    baseUrl = 'https://uat-qa.unifyed.com';
                    break;
                }
            case 'demo':
                {
                    baseUrl = 'https://nmsu4.unifyed.com';
                    break;
                }
        }
        return baseUrl + url;
    }

    $rootScope.loginlogout = function() {
        $location.path('/app/Rbacsignin/Rbacsignin');
    }

    /*$rootScope.goPreviousPage = function(){
      console.log('back');
      window.history.back();
      console.log($location.path());
    }*/
    function exitApp() {
        navigator.app.exitApp();
    }
    $rootScope.goPreviousPage = function(event) {
        var loc = window.location;
        $rootScope.leftToRight = true;
        if (loc.hash == "#/app/Rbacsignin/Rbacsignin" && $rootScope.appDetails.guestApp) {
            window.location.href = "#/app/Rbacmenu/Rbacmenu";
        } else if (loc.hash == "#/app/Rbacsignin/Rbacsignin" && !$rootScope.appDetails.guestApp) {
            exitApp();
        } else if (loc.hash == "#/app/Rbacmenu/Rbacmenu" && !$rootScope.appDetails.guestApp) {
            //exitApp();
        } else if (loc.hash == "#/app/UnifyedGroups/UnifyedGroups" || loc.hash.indexOf('Rbacmenu') != -1) {
            $rootScope.user.siteId = $rootScope.olderSiteIdPortal ? $rootScope.olderSiteIdPortal : $rootScope.user.siteId;
            window.siteGroupId = undefined;
            window.history.back();
        } else {
            window.history.back();
        }
    }
    document.addEventListener("backbutton", $rootScope.goPreviousPage, true);

    $rootScope.loadUnacknowledgedMessage = function() {
        var url = $rootScope.GatewayUrl + '/unifyed-notificationcentre/v1/notifications/acknowledged?ack=false';
        $http({
            method: 'GET',
            url: url,
            headers: $rootScope.getHeaders(url, 'GET')
        }).then(function successCallback(response) {
            if (response && response.data) {
                if (response.data.length) {
                    $("#acknowledgeModal").modal("show");
                    $rootScope.unAcknowledgeMessages = response.data;
                }
            }
        }, function errorCallback(error) {
            console.log("in callAPI, URL : " + url + " : error status=" + error.status);
        });
    }


    window.open = function(url, type, options) {
            type = type || '_blank';
            options = options || '';
            return cordova.InAppBrowser.open(url, type, options);
        }
        /* Binding anchor pages in cms to open in inappbrowser */
    $(document).on("click", "#pageContent a", function(event) {
        event.preventDefault();
        if ($(this).attr('href') && $(this).attr('href') != '#') {
            if ($(this).attr('href').indexOf('mailto:') != -1 || $(this).attr('href').indexOf('tel:') != -1) {
                window.open($(this).attr('href'), '_system');
            } else {
                window.open($(this).attr('href'), '_blank');
            }
        }
    });

    $(document).on("click", ".bbContent a", function(event) {
        event.preventDefault();
        let url = $(this).attr('href');
        if (url.indexOf('mailto') != -1) {
            window.open($(this).attr('href'), '_system');
        } else {
            window.open($(this).attr('href'), '_blank');
        }
    });

    $(document).on("click", ".lineHeight22 a", function(event) {
        event.preventDefault();
        let url = $(this).attr('href');
        if (url.indexOf('mailto') != -1) {
            window.open($(this).attr('href'), '_system');
        } else {
            window.open($(this).attr('href'), '_blank');
        }
    });

    $rootScope.adddynamicPadding = function() {
        var headerHeight = $('#appHeader').height()
        var footerHeight = $('#bottomFixContent').height()
        $('#loadApplet').css({
            'paddingBottom': footerHeight,
            'paddingTop': headerHeight
        })
    }
    $rootScope.keybordHideshow = () => {
        window.addEventListener('keyboardWillShow', function() {
            Keyboard.disableScroll(false);
            //Keyboard.setResizeMode('native');
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
        window.addEventListener('keyboardDidShow', function() {
            if (device.platform == "iOS") {
                setTimeout(function() {
                    document.activeElement.scrollIntoViewIfNeeded()
                }, 100);
            }
        })
        window.addEventListener('keyboardDidHide', function() {
            $rootScope.adddynamicPadding();
        })
    }
    $rootScope.keybordHideshow();

    $rootScope.ackMessage = function(messageId, action, ack) {
        $rootScope.isRedirection = false;
        console.log('dks', ack)
        var url = '/unifyed-notificationcentre/v1/notification/acknowledged/' + messageId;
        if (action == 'skip') {
            url = '/unifyed-notificationcentre/v1/notification/skip/' + messageId;
        }
        $rootScope.callAPI(url, 'PUT', {}, function(response) {
            if (response && response.status == 2) {
                console.error("Failed to acknowledge message");
            } else {
                if ($rootScope.unAcknowledgeMessages && $rootScope.unAcknowledgeMessages.length) {
                    if (ack.redirectionUrl && ack.redirectionUrl != "Not Found") {
                        $rootScope.isRedirection = true;
                        $location.path(ack.redirectionUrl);
                        $("#acknowledgeModal").modal("hide");
                    }
                    $rootScope.unAcknowledgeMessages.shift();
                }
                if (!$rootScope.unAcknowledgeMessages || !$rootScope.unAcknowledgeMessages.length) {
                    $("#acknowledgeModal").modal("hide");
                }
            }
        }, 2);
    };

    window.alert = function(msg, title, callBack) {
        if (title) {
            navigator.notification.alert(msg, null, title, 'Ok');
        } else {
            navigator.notification.alert(msg, null, 'Alert', 'Ok');
        }
    }

    /* Dont remove this code */
    return {
        'serviceloaded': 'serviceloaded'
    }

}]);

/*****************End for Services for unifyed applets (whatsUp, messaging etc) *********************************/
angular.module('unifyedmobile').run(['unifyedglobal', function(unifyedglobal) {}]);

angular.module('convertSvg', []).service('convertSvgIcon', function() {
    var converTeddata = function() {
        jQuery('img.sidebar-menu-icon , img.convertsvg , img.dock-menu-icon').each(function() {
            var $img = jQuery(this);
            var imgID = $img.attr('id');
            var imgClass = $img.attr('class');
            var imgURL = $img.attr('src');
            jQuery.get(imgURL, function(data) {
                // Get the SVG tag, ignore the rest
                var $svg = jQuery(data).find('svg');
                // Add replaced image's ID to the new SVG
                if (typeof imgID !== 'undefined') {
                    $svg = $svg.attr('id', imgID);
                }
                // Add replaced image's classes to the new SVG
                if (typeof imgClass !== 'undefined') {
                    $svg = $svg.attr('class', imgClass + ' replaced-svg');
                }
                // Remove any invalid XML tags as per http://validator.w3.org
                $svg = $svg.removeAttr('xmlns:a');
                // Check if the viewport is set, else we gonna set it if we can.
                if (!$svg.attr('viewBox') && $svg.attr('height') && $svg.attr('width')) {
                    $svg.attr('viewBox', '0 0 ' + $svg.attr('height') + ' ' + $svg.attr('width'))
                }
                // Replace image with new SVG
                $img.replaceWith($svg);
            }, 'xml');
        });
    }
    return {
        converTeddata: converTeddata
    };
});