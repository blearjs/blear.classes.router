/**
 * 文件描述
 * @author ydr.me
 * @create 2016-06-01 15:15
 */


'use strict';


var Router = require('../src/index');

var router = new Router({
    onChange: function (route, next) {
        console.log('[change]', route.path, route.controller);
        next(false);
    }
});


router
    .match(function (route, next) {
        console.log('all middleware');
        next();
    })
    .match(/^\/user\/(.*)$/, function (route, next) {
        console.log('user middleware');
        setTimeout(function () {
            next();
        }, 100);
    })
    .match(/^\/user\/abc\/([^/]*)$/, function (route, next) {
        console.log('user/abc middleware');
        setTimeout(function () {
            if (route.params[1] === '123') {
                return next('./1234');
            }

            next();
        }, 100);
    })
    .match(/^\/user\/def\/.*$/, function (route, next) {
        console.log('user/abc middleware');
        setTimeout(function () {
            next();
        }, 100);
    })
    .match('/user/abc/:userId', function () {
        return 'user/abc controller';
    })
    .match('/user/def/:ussrId', function (resolve) {
        setTimeout(function () {
            resolve('user/def controller');
        }, 1000);
    })
    .otherwise(function () {
        console.log('404');
    });
