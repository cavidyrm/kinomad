/* Kinomad admin auth — token in localStorage, no cookies. */
(function () {
  'use strict';

  var SIGN_IN = 'Kinomad CRM Sign In.dc.html';
  var ADMIN = 'Kinomad CRM.dc.html';

  function go(file) {
    if (window.KMROUTES && KMROUTES.go) KMROUTES.go(file);
    else window.location.href = file;
  }

  function goLogin() { go(SIGN_IN); }
  function goAdmin() { go(ADMIN); }

  function waitForAPI(timeoutMs) {
    var timeout = timeoutMs == null ? 8000 : timeoutMs;
    return new Promise(function (resolve, reject) {
      if (window.KMAPI) return resolve(window.KMAPI);
      var timer = setTimeout(function () {
        reject(new Error('The API client (km-api.js) did not load.'));
      }, timeout);
      function done() {
        clearTimeout(timer);
        window.removeEventListener('kmapi-ready', done);
        if (window.KMAPI) resolve(window.KMAPI);
        else reject(new Error('The API client (km-api.js) did not load.'));
      }
      window.addEventListener('kmapi-ready', done);
    });
  }

  function hang() { return new Promise(function () {}); }

  function bootRequireAuth() {
    return waitForAPI().then(function () {
      var sess = KMAPI.session.local();
      if (sess && sess.token) return sess;
      goLogin();
      return hang();
    });
  }

  function bootGuest() {
    return waitForAPI().then(function () {
      var sess = KMAPI.session.local();
      if (sess && sess.token) {
        goAdmin();
        return hang();
      }
      return null;
    }).catch(function () { return null; });
  }

  function login(email, password) {
    return waitForAPI().then(function () {
      return KMAPI.session.login(email, password);
    });
  }

  function logout() {
    return waitForAPI().then(function () {
      return KMAPI.session.logout();
    }).then(function () {
      goLogin();
    });
  }

  window.addEventListener('km-auth-expired', function () {
    goLogin();
  });

  window.KMAUTH = {
    waitForAPI: waitForAPI,
    bootRequireAuth: bootRequireAuth,
    bootGuest: bootGuest,
    login: login,
    logout: logout,
    goLogin: goLogin,
    goAdmin: goAdmin,
  };
})();
