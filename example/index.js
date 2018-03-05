/**
 * 文件描述
 * @author ydr.me
 * @create 2016-06-01 15:15
 */


'use strict';


var Router = require('../src/index');

var router = new Router();

router
// 匿名路径
    .match(function (next) {
        console.log('1 start');
        next();
    })
    .match(function (next) {
        console.log('2');

        setTimeout(function () {
            next();
        }, 100);
    })
    .match(function () {
        console.log('3 end');
    })
    .match(function () {
        console.log('永不会执行');
    })


    .otherwise(function () {
        console.log('load 404');
    });

document.getElementById('rewrite').onclick = function () {
    router.rewriteQuery('r', Math.random());
};

router.start();
