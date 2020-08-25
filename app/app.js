//'use strict';
const onDeviceReady = () => {
   if (window.device && navigator.connection.type == "none") {
       navigator.notification.alert('No network connection found. Please check your network settings and try again.', function() {
           navigator.app.exitApp();
       }, 'No Network', 'Ok');
       return;
   }else{
     angular.module('unifyedmobile', [
       'MainCtrl',
       'AppletCtrl',
       'pageCtrl',
       'siteGroupCtrl',
       'MobileServices',
       'convertSvg',
       'cmsDirectives',
       'siteGroupHeaderDirective',
       'UnifyedActionIcon',
       'BannerSrvc',
       'sqlService',
       'ngRoute',
       'appRoutes'
     ]);
   }
}
window.device?document.addEventListener('deviceready',onDeviceReady, false):onDeviceReady();
