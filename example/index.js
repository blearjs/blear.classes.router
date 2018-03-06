/**
 * 文件描述
 * @author ydr.me
 * @create 2016-06-01 15:15
 */


'use strict';


var Router = require('../src/index');

var router = new Router();

router
// // 匿名路径
//     .match(function (next) {
//         console.log('1 start');
//         next();
//     })
//     .match(function (next) {
//         console.log('2');
//
//         setTimeout(function () {
//             next();
//         }, 100);
//     })
//     .match(function () {
//         console.log('3 end');
//     })
//     .match(function () {
//         console.log('永不会执行');
//     })

// 具名路由
    .match(function (next) {
        console.log('不管什么路由，都要经过我');
        next();
    })
    .match('/user/abc/:abc1', function (next) {
        console.log('1 start', 'params.abc1 =', this.params.abc1);
        next();
    })
    .match(/^\/user\/abc\/([^/]+)$/, function (next) {
        console.log('2', 'params[1] =', this.params[1]);
        next();
    })
    .match('/user/abc/123', function (next) {
        console.log('3');
        next('./1234');
    })
    .match('/user/abc/1234', function (next) {
        console.log('4');
        next('./12345');
    })
    .match('/user/abc/12345', function (next) {
        console.log('5 end');

        setTimeout(function () {
            next({});
        });
    })
    .match('/user/abc/123', function () {
        console.log('永不会执行');
    })

    .match('/user/def/456', function (next) {
        console.log('1 start');

        setTimeout(function () {
            next();
        }, 500);
    })
    .match('/user/def/456', function (next) {
        console.log('2');
        require.async('./async/def.js', next);
    })
    .match('/user/def/456', function () {
        console.log('打印了这个日志，说明出错了');
    })

    .match('/user/def/ghi', function () {
        console.log(this);
        debugger;
    })

    .otherwise(function () {
        console.log('load 404');
    });

document.getElementById('rewrite').onclick = function () {
    router.rewriteQuery('r', Math.random());
};

router.start();
