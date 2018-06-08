/**
 * 文件描述
 * @author ydr.me
 * @create 2016-06-01 15:15
 */


'use strict';


var Router = require('../src/index');

var router = new Router();

router
    .match(function (next) {
        console.log('enter', this.href);
        next();
    })

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

    .match('/user/**', function (next) {
        next();
    })

    // 具名路由
    .match({
        path: '/user/abc/:abc1',
        meta: {a: 1}
    }, function (next) {
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
    .get({
        path: '/user/abc/12345',
        meta: {b: 2}
    }, function (next) {
        console.log('5 end');

        setTimeout(function () {
            next({});
        });
    })
    .match({
        path: '/user/abc/123',
        meta: {c: 3}
    }, function () {
        console.log('永不会执行');
    })

    .match({
        path: '/user/def/456',
        meta: {a: 4}
    }, function (next) {
        console.log('1 start');

        setTimeout(function () {
            next();
        }, 500);
    })
    .get('/user/def/456', function (next) {
        console.log('2');
        require.async('./async/def.js', next);
    })
    .get('/user/def/456', function () {
        console.log('打印了这个日志，说明出错了');
    })

    .get('/user/def/ghi', function () {
        var route = this;

        console.log(route);
        console.log(route.resolve('../../aaa'));

        route.redirect('a');
    })

    .get('/aaa', function (next) {
        var route = this;
        setTimeout(function () {
            route.redirect('/aaa/111');
            next({});
        }, 100);
    })

    .get('/eee', function (next) {
        console.log('/eee');

        setTimeout(function () {
            next({});
        }, 100000);
    })

    .get(function () {
        console.log('load 404');
    });

router.on('afterChange', function (route) {
    if (route.meta.a) {
        console.log('当前路由有 meta.a 属性');
    }

    if (route.match('/user/abc/12345')) {
        console.log('route matched', route.rule)
    }
});

document.getElementById('rewrite').onclick = function () {
    router.setQuery('r', Math.random());
};

router.start().on('repeat', function (route) {
    console.log(route);
});

window.router = router;
