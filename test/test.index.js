/**
 * 测试 文件
 * @author ydr.me
 * @create 2016-05-17 12:13
 */


'use strict';

var Router = require('../src/index.js');
var plan = require('blear.utils.plan');


describe('测试文件', function () {
    var delay = function (next) {
        setTimeout(next, 100);
    };

    it('water test', function (done) {
        var water = plan.task(function (next) {
            next();
        });
        var pipe = function (id, task) {
            water = water.task(function (next) {
                location.hash = '#';
                delay(next);
            });
            water = water.task(function (next) {
                console.log('test>>', id);
                task(next);
            });
        };

        pipe('event', function (done) {
            var beforeTimes = 0;
            var afterTimes = 0;
            var router = new Router();

            router.on('beforeChange', function () {
                beforeTimes++;
            });

            router.on('afterChange', function () {
                afterTimes++;
            });

            router.start();

            plan
                .task(function (next) {
                    location.hash = '#/a';
                    delay(next);
                })
                .task(function (next) {
                    location.hash = '#/b';
                    delay(next);
                })
                .task(function (next) {
                    router.destroy();
                    delay(next);
                })
                .task(function (next) {
                    expect(beforeTimes).toEqual(3);
                    expect(afterTimes).toEqual(3);
                    expect(location.hash).toEqual('#/b');
                    delay(next);
                })
                .serial(done);
        });
        
        pipe('#redirect', function (done) {
            var changeTimes = 0;
            var router = new Router();

            router.on('beforeChange', function () {
                changeTimes++;
            });

            router.start();

            plan
                .task(function (next) {
                    router.redirect('/a');
                    delay(next);
                })
                .task(function (next) {
                    router.destroy();
                    delay(next);
                })
                .task(function (next) {
                    expect(changeTimes).toEqual(2);
                    expect(location.hash).toEqual('#/a');
                    delay(next);
                })
                .serial(done);
        });

        pipe('#rewrite', function (done) {
            var changeTimes = 0;
            var router = new Router();

            router.on('beforeChange', function () {
                changeTimes++;
            });

            router.start();

            plan
                .task(function (next) {
                    router.rewrite('/a');
                    delay(next);
                })
                .task(function (next) {
                    router.destroy();
                    delay(next);
                })
                .task(function (next) {
                    expect(changeTimes).toEqual(2);
                    expect(location.hash).toEqual('#/a');
                    delay(next);
                })
                .serial(done);
        });

        pipe('#rewriteQuery', function (done) {
            var changeTimes = 0;
            var router = new Router();

            router.on('beforeChange', function () {
                changeTimes++;
            });

            router.start();

            plan
                .task(function (next) {
                    router.rewriteQuery({a: 1});
                    delay(next);
                })
                .task(function (next) {
                    expect(location.hash).toEqual('#/?a=1');
                    router.rewriteQuery('a', '2');
                    delay(next);
                })
                .task(function (next) {
                    expect(location.hash).toEqual('#/?a=2');
                    router.rewriteQuery('a=3');
                    delay(next);
                })
                .task(function (next) {
                    expect(location.hash).toEqual('#/?a=3');
                    router.destroy();
                    delay(next);
                })
                .task(function (next) {
                    expect(changeTimes).toEqual(4);
                    expect(location.hash).toEqual('#/?a=3');
                    delay(next);
                })
                .serial(done);
        });

        pipe('#resolve', function (done) {
            var changeTimes = 0;
            var router = new Router();

            router.on('beforeChange', function () {
                changeTimes++;
            });

            router.start();

            plan
                .task(function (next) {
                    var ret = router.resolve('/a/b/c');
                    expect(ret).toMatch('#/a/b/c');
                    location.href = ret;
                    delay(next);
                })
                .task(function (next) {
                    var ret = router.resolve('..');
                    expect(ret).toMatch(/#\/a/);
                    location.href = ret;
                    delay(next);
                })
                .task(function (next) {
                    expect(location.hash).toEqual('#/a');
                    router.destroy();
                    delay(next);
                })
                .task(function (next) {
                    expect(changeTimes).toEqual(3);
                    expect(location.hash).toEqual('#/a');
                    delay(next);
                })
                .serial(done);
        });

        pipe('#match(fn) 无具名路由匹配', function (done) {
            var changeTimes = 0;
            var matchTimes = 0;
            var routeList = [];
            var router = new Router();

            router.on('beforeChange', function (route) {
                changeTimes++;
                routeList.push(route);
            });

            router.match(function (route, next) {
                matchTimes++;
                next();
            });

            router.start();

            plan
                .task(function (next) {
                    location.hash = '#/a';
                    delay(next);
                })
                .task(function (next) {
                    location.hash = '#/b';
                    delay(next);
                })
                .task(function (next) {
                    router.destroy();
                    delay(next);
                })
                .task(function (next) {
                    expect(matchTimes).toEqual(3);
                    expect(changeTimes).toEqual(3);
                    expect(routeList.length).toEqual(3);
                    expect(routeList[0].controller).toEqual(null);
                    expect(routeList[1].controller).toEqual(null);
                    expect(routeList[2].controller).toEqual(null);
                    delay(next);
                })
                .serial(done);
        });

        pipe('#match(fn) 有具名路由匹配', function (done) {
            var changeTimes = 0;
            var matchTimes = 0;
            var routeList = [];
            var router = new Router();

            router.on('beforeChange', function (route) {
                changeTimes++;
                routeList.push(route);
            });

            router.match(function (route, next) {
                matchTimes++;
                next();
            });

            router.match('/a', function () {
                return 'a';
            });

            router.match('/b', function (resolve) {
                setTimeout(function () {
                    resolve('b');
                });
            });

            router.start();

            plan
                .task(function (next) {
                    location.hash = '#/a';
                    delay(next);
                })
                .task(function (next) {
                    location.hash = '#/b';
                    delay(next);
                })
                .task(function (next) {
                    router.destroy();
                    delay(next);
                })
                .task(function (next) {
                    expect(matchTimes).toEqual(3);
                    expect(routeList.length).toEqual(3);
                    expect(routeList[0].controller).toEqual(null);
                    expect(routeList[1].controller).toEqual('a');
                    expect(routeList[2].controller).toEqual('b');
                    expect(changeTimes).toEqual(3);
                    delay(next);
                })
                .serial(done);
        });

        pipe('#match(rule, fn) 无具名路由', function (done) {
            var changeTimes = 0;
            var matchTimes = 0;
            var routeList = [];
            var router = new Router();

            router.on('beforeChange', function (route) {
                changeTimes++;
                routeList.push(route);
            });

            router.match('/a', function (route, next) {
                matchTimes++;
                next();
            });

            router.start();

            plan
                .task(function (next) {
                    location.hash = '#/a';
                    delay(next);
                })
                .task(function (next) {
                    location.hash = '#/b';
                    delay(next);
                })
                .task(function (next) {
                    router.destroy();
                    delay(next);
                })
                .task(function (next) {
                    expect(matchTimes).toEqual(1);
                    expect(routeList.length).toEqual(3);
                    expect(routeList[0].controller).toEqual(null);
                    expect(routeList[1].controller).toEqual(null);
                    expect(routeList[2].controller).toEqual(null);
                    expect(changeTimes).toEqual(3);
                    delay(next);
                })
                .serial(done);
        });

        pipe('#match(rule, fn) 有具名路由匹配', function (done) {
            var changeTimes = 0;
            var matchTimes = 0;
            var routeList = [];
            var router = new Router();

            router.on('beforeChange', function (route) {
                changeTimes++;
                routeList.push(route);
            });

            router.match('/a', function (route, next) {
                matchTimes++;
                next();
            });

            router.match('/a', function () {
                return 'a';
            });

            router.match('/b', function (resolve) {
                setTimeout(function () {
                    resolve('b');
                });
            });

            router.start();

            plan
                .task(function (next) {
                    location.hash = '#/a';
                    delay(next);
                })
                .task(function (next) {
                    location.hash = '#/b';
                    delay(next);
                })
                .task(function (next) {
                    expect(matchTimes).toEqual(1);
                    expect(routeList.length).toEqual(3);
                    expect(routeList[0].controller).toEqual(null);
                    expect(routeList[1].controller).toEqual('a');
                    expect(routeList[2].controller).toEqual('b');
                    expect(changeTimes).toEqual(3);
                    router.destroy();
                    delay(next);
                })
                .serial(done);
        });

        pipe('#otherwise(fn)', function (done) {
            var changeTimes = 0;
            var matchTimes = 0;
            var routeList = [];
            var router = new Router();

            router.on('beforeChange', function (route) {
                changeTimes++;
                routeList.push(route);
            });

            router.otherwise(function () {
                return 'otherwise';
            });

            router.start();

            plan
                .task(function (next) {
                    location.hash = '#/a';
                    delay(next);
                })
                .task(function (next) {
                    location.hash = '#/b';
                    delay(next);
                })
                .task(function (next) {
                    expect(changeTimes).toEqual(3);
                    expect(routeList.length).toEqual(3);
                    expect(routeList[0].controller).toEqual('otherwise');
                    expect(routeList[1].controller).toEqual('otherwise');
                    expect(routeList[2].controller).toEqual('otherwise');
                    router.destroy();
                    delay(next);
                })
                .serial(done);
        });

        water.serial(done);
    }, 10000000);
});
