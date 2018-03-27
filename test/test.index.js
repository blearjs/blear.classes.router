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

    it('顺序测试', function (done) {
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

        pipe('event: change 路由变化前后都会触发', function (done) {
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

        pipe('event: load 同一个 director 只加载一次', function (done) {
            var beforeTimes = 0;
            var afterTimes = 0;
            var router = new Router();

            router.on('beforeLoad', function () {
                beforeTimes++;
            });

            router.on('afterLoad', function () {
                afterTimes++;
            });

            router.match(function (next) {
                next();
            }).match('/', function (next) {
                next();
            }).get('/', function (next) {
                next();
            }).get('/a', function (next) {
                next();
            }).start();

            plan
                .task(function (next) {
                    delay(next);
                })
                .task(function (next) {
                    location.hash = '#/a';
                    delay(next);
                })
                .task(function (next) {
                    history.back();
                    delay(next);
                })
                .task(function (next) {
                    router.destroy();
                    delay(next);
                })
                .task(function (next) {
                    expect(beforeTimes).toEqual(2);
                    expect(afterTimes).toEqual(2);
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

        pipe('#setQuery/removeQuery', function (done) {
            var changeTimes = 0;
            var router = new Router();

            router.on('beforeChange', function () {
                changeTimes++;
            });

            router.start();

            plan
                .task(function (next) {
                    router.setQuery({a: 1});
                    delay(next);
                })
                .task(function (next) {
                    expect(location.hash).toEqual('#/?a=1');
                    router.setQuery('a', '2');
                    delay(next);
                })
                .task(function (next) {
                    expect(location.hash).toEqual('#/?a=2');
                    router.setQuery('a=3');
                    delay(next);
                })
                .task(function (next) {
                    expect(location.hash).toEqual('#/?a=3');
                    router.removeQuery('a');
                    delay(next);
                })
                .task(function (next) {
                    expect(location.hash).toEqual('#/');
                    router.destroy();
                    delay(next);
                })
                .task(function (next) {
                    expect(changeTimes).toEqual(5);
                    expect(location.hash).toEqual('#/');
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

        pipe('无match无otherwise', function (done) {
            var router = new Router();
            var changeTimes = 0;
            var routeList = [];

            router.start();

            router.on('afterChange', function (route) {
                routeList.push(route);
                changeTimes++;
            });

            plan
                .task(function (next) {
                    location.hash = '#/a';
                    delay(next);
                })
                .task(function (next) {
                    router.destroy();
                    expect(changeTimes).toBe(2);
                    expect(routeList.length).toBe(2);
                    expect(routeList[0].pathname).toBe('/');
                    expect(routeList[1].pathname).toBe('/a');
                    delay(next);
                })
                .serial(done);
        });

        pipe('#match 匿名路径', function (done) {
            var router = new Router();
            var change1Times = 0;
            var change2Times = 0;
            var change3Times = 0;

            router
                .match(function (next) {
                    change1Times++;
                    next();
                })
                .match(function () {
                    change2Times++;
                })
                .match(function (next) {
                    change3Times++;
                    next();
                });

            router.start();

            plan
                .task(function (next) {
                    router.destroy();
                    expect(change1Times).toBe(1);
                    expect(change2Times).toBe(1);
                    expect(change3Times).toBe(1);
                    delay(next);
                })
                .serial(done);
        });

        pipe('#match 具名路径', function (done) {
            var router = new Router();
            var change1Times = 0;
            var change2Times = 0;
            var change3Times = 0;

            router
                .match('/aaa', function (next) {
                    change1Times++;
                    next();
                })
                .match('/aaa', function () {
                    change2Times++;
                })
                .match('/bbb', function (next) {
                    change3Times++;
                    next();
                });

            router.start();

            plan
                .task(function (next) {
                    location.hash = '#/aaa';
                    delay(next);
                })
                .task(function (next) {
                    router.destroy();
                    expect(change1Times).toBe(1);
                    expect(change2Times).toBe(1);
                    expect(change3Times).toBe(0);
                    delay(next);
                })
                .serial(done);
        });

        pipe('#match 路径匹配', function (done) {
            var router = new Router();
            var change1Times = 0;
            var change2Times = 0;
            var change3Times = 0;
            var userName = '';
            var param1 = '';

            router
                .match('/user/:userName', function (next) {
                    change1Times++;
                    userName = this.params.userName;
                    next();
                })
                .match(/^\/user\/([^\/]+)$/, function () {
                    param1 = this.params[1];
                    change2Times++;
                })
                .match('/user/bbb', function (next) {
                    change3Times++;
                    next();
                });

            router.start();

            plan
                .task(function (next) {
                    location.hash = '#/user/aaa';
                    delay(next);
                })
                .task(function (next) {
                    router.destroy();
                    expect(change1Times).toBe(1);
                    expect(change2Times).toBe(1);
                    expect(change3Times).toBe(0);
                    expect(userName).toBe('aaa');
                    expect(param1).toBe('aaa');
                    delay(next);
                })
                .serial(done);
        });

        pipe('#match + 同步控制器', function (done) {
            var router = new Router();
            var route1 = null;
            var objA = {a: 'a'};

            router
                .get('/', function () {
                    route1 = this;
                    return objA;
                });

            router.start();

            plan
                .task(function (next) {
                    router.destroy();
                    expect(route1.controller).toBe(objA);
                    delay(next);
                })
                .serial(done);
        });

        pipe('#match + 异步控制器', function (done) {
            var router = new Router();
            var route1 = null;
            var objA = {a: 'a'};

            router
                .get('/', function (next) {
                    route1 = this;
                    setTimeout(function () {
                        next(objA);
                    }, 10);
                });

            router.start();

            plan
                .task(function (next) {
                    delay(next);
                })
                .task(function (next) {
                    router.destroy();
                    expect(route1.controller).toBe(objA);
                    delay(next);
                })
                .serial(done);
        });

        pipe('#get(loader) + 同步控制器', function (done) {
            var router = new Router();
            var route1 = null;
            var objA = {a: 'a'};

            router
                .get(function () {
                    route1 = this;
                    return objA;
                });

            router.start();

            plan
                .task(function (next) {
                    router.destroy();
                    expect(route1.controller).toBe(objA);
                    delay(next);
                })
                .serial(done);
        });

        pipe('#get(loader) + 异步控制器', function (done) {
            var router = new Router();
            var route1 = null;
            var objA = {a: 'a'};

            router
                .get(function (next) {
                    route1 = this;
                    setTimeout(function () {
                        next(objA);
                    }, 100);
                });

            router.start();

            plan
                .task(function (next) {
                    delay(next);
                })
                .task(function (next) {
                    router.destroy();
                    expect(route1.controller).toBe(objA);
                    delay(next);
                })
                .serial(done);
        });

        pipe('#loader 多次被使用', function (done) {
            var router = new Router();
            var objA = {};
            var abcTimes = 0;

            router.get('/abc/:abc', function (next) {
                abcTimes++;
                next(objA);
            });

            router.start();

            plan
                .task(function (next) {
                    location.hash = '#/abc/123';
                    delay(next);
                })
                .task(function (next) {
                    location.hash = '#/abc/456';
                    delay(next);
                })
                .task(function (next) {
                    router.destroy();
                    expect(abcTimes).toBe(1);
                    delay(next);
                })
                .serial(done);
        });

        pipe('#match 中间件跳转模式', function (done) {
            var router = new Router();

            router.match('/aaa', function (next) {
                next('bbb');
            });

            router.start();

            plan
                .task(function (next) {
                    location.hash = '#/aaa';
                    delay(next);
                })
                .task(function (next) {
                    expect(location.hash).toBe('#/bbb');
                    router.destroy();
                    delay(next);
                })
                .serial(done);
        });

        pipe('#match 中间件多次跳转模式', function (done) {
            var router = new Router();
            var aTimes = 0;
            var bTimes = 0;
            var beforeChangeTimes = 0;
            var afterChangeTimes = 0;

            router.match('/aaa', function (next) {
                aTimes++;
                next('/bbb');
            }).match('/bbb', function () {
                bTimes++;
            });

            router.on('beforeChange', function () {
                beforeChangeTimes++;
            }).on('afterChange', function () {
                afterChangeTimes++;
            });

            plan
                .task(function (next) {
                    location.hash = '#/aaa';
                    router.start();
                    delay(next);
                })
                .task(function (next) {
                    expect(location.hash).toBe('#/bbb');
                    expect(aTimes).toBe(1);
                    expect(bTimes).toBe(1);
                    expect(beforeChangeTimes).toBe(1);
                    expect(afterChangeTimes).toBe(1);
                    router.destroy();
                    delay(next);
                })
                .serial(done);
        });

        pipe('#get 多次进入', function (done) {
            var router = new Router();
            var directionList = [];

            router.get('/', function (next) {
                next({});
            });

            router.on('afterChange', function (route) {
                directionList.push(route.direction);
            });
            router.start();

            plan
                .task(function (next) {
                    location.hash = '#/?a=1';
                    delay(next);
                })
                .task(function (next) {
                    router.destroy();
                    expect(directionList.length).toBe(2);
                    expect(directionList[0]).toBe('forward');
                    expect(directionList[1]).toBe('replace');
                    delay(next);
                })
                .serial(done);
        });

        pipe('#match 历史返回与前进 match 只会进一次', function (done) {
            var router = new Router();
            var abcTimes = 0;

            router
                .match('/abc', function (next) {
                    abcTimes++;
                    next();
                })
                .get('/abc', function () {

                });

            router.start();

            plan
                .task(function (next) {
                    location.href = '#/abc';
                    delay(next);
                })
                .task(function (next) {
                    location.href = '#/def';
                    delay(next);
                })
                .task(function (next) {
                    history.back();
                    delay(next);
                })
                .task(function (next) {
                    router.destroy();
                    expect(abcTimes).toBe(1);
                    delay(next);
                })
                .serial(done);
        });

        pipe('小route #resolve', function (done) {
            var router = new Router();
            var ret = '';

            router.match('/a/b/c/d', function () {
                ret = this.resolve('../../f');
            });

            router.start();

            plan
                .task(function (next) {
                    location.hash = '#/a/b/c/d';
                    delay(next);
                })
                .task(function (next) {
                    expect(ret).toBe('/a/f');
                    router.destroy();
                    delay(next);
                })
                .serial(done);
        });

        pipe('小route #redirect', function (done) {
            var router = new Router();

            router.match('/a/b/c/d', function () {
                this.redirect('../../f');
            });

            router.start();

            plan
                .task(function (next) {
                    location.hash = '#/a/b/c/d';
                    delay(next);
                })
                .task(function (next) {
                    expect(location.hash.replace('#', '')).toBe('/a/f');
                    router.destroy();
                    history.back();
                    delay(next);
                })
                .task(function (next) {
                    expect(location.hash.replace('#', '')).toBe('/a/b/c/d');
                    delay(next);
                }).serial(done);
        });

        pipe('小route #rewrite', function (done) {
            var router = new Router();

            router.match('/a/b/c/d', function () {
                this.rewrite('../../f');
            });

            router.start();

            plan
                .task(function (next) {
                    location.hash = '#/a/b/c/d';
                    delay(next);
                })
                .task(function (next) {
                    expect(location.hash.replace('#', '')).toBe('/a/f');
                    router.destroy();
                    history.back();
                    delay(next);
                })
                .task(function (next) {
                    expect(location.hash.replace('#', '')).toBe('');
                    delay(next);
                })
                .serial(done);
        });

        pipe('小route #setQuery', function (done) {
            var router = new Router();

            router.match('/a/b/c/d', function () {
                this.setQuery({
                    a: 11,
                    b: 22
                });
            });

            router.start();

            plan
                .task(function (next) {
                    location.hash = '#/a/b/c/d?a=1&b=2&c=3&c=4&c=5';
                    delay(next);
                })
                .task(function (next) {
                    expect(location.hash.replace('#', '')).toMatch(/a=11&/);
                    expect(location.hash.replace('#', '')).toMatch(/b=22&/);
                    router.destroy();
                    history.back();
                    delay(next);
                })
                .task(function (next) {
                    expect(location.hash.replace('#', '')).toBe('');
                    delay(next);
                })
                .serial(done);
        });

        pipe('小route #removeQuery', function (done) {
            var router = new Router();

            router.match('/a/b/c/d', function () {
                this.removeQuery(['a', 'b', 'c'])
            });

            router.start();

            plan
                .task(function (next) {
                    location.hash = '#/a/b/c/d?a=1&b=2&c=3&c=4&c=5';
                    delay(next);
                })
                .task(function (next) {
                    expect(location.hash.replace('#', '')).toBe('/a/b/c/d');
                    router.destroy();
                    history.back();
                    delay(next);
                })
                .task(function (next) {
                    expect(location.hash.replace('#', '')).toBe('');
                    delay(next);
                })
                .serial(done);
        });

        pipe('边界：相同路由只触发一次', function (done) {
            var router = new Router();
            var changeTimes = 0;

            router.match('/a', function () {
                changeTimes++;
            });

            router.start();

            plan
                .task(function (next) {
                    location.hash = '/a?a=1&b=2&c=3&c=4&c=5';
                    delay(next);
                })
                .task(function (next) {
                    location.hash = '/a?b=2&a=1&c=3&c=5&c=4';
                    delay(next);
                })
                .task(function (next) {
                    expect(changeTimes).toBe(1);
                    router.destroy();
                    delay(next);
                })
                .serial(done);
        });

        pipe('边界：同时间内只解析一次', function (done) {
            var router = new Router();
            var matchTimes = 0;

            router.match(function (next) {
                matchTimes++;
                setTimeout(function () {
                    next();
                }, 300);
            });

            router.start();

            plan
                .task(function (next) {
                    expect(location.hash.replace('#', '')).toBe('');
                    location.hash = '#/xxx';
                    delay(next);
                })
                .task(function (next) {
                    expect(location.hash.replace('#', '')).toBe('/xxx');
                    expect(matchTimes).toBe(1);
                    router.destroy();
                    delay(next);
                }).serial(done);
        });

        pipe('边界：匿名路由销毁之后才完成控制器加载', function (done) {
            var router = new Router();
            var beforeChangeTimes = 0;
            var afterChangeTimes = 0;

            router.on('beforeChange', function () {
                beforeChangeTimes++;
            });

            router.on('afterChange', function () {
                afterChangeTimes++;
            });

            router.match(function (next) {
                setTimeout(function () {
                    next();
                }, 10000);
            });

            router.start();
            router.destroy();

            plan
                .task(function (next) {
                    expect(beforeChangeTimes).toBe(1);
                    expect(afterChangeTimes).toBe(0);
                    delay(next);
                })
                .serial(done);
        });

        pipe('边界：具名路由销毁之后才完成控制器加载', function (done) {
            var router = new Router();
            var beforeChangeTimes = 0;
            var afterChangeTimes = 0;

            router.on('beforeChange', function () {
                beforeChangeTimes++;
            });

            router.on('afterChange', function () {
                afterChangeTimes++;
            });

            router.match('/', function (next) {
                setTimeout(function () {
                    next();
                }, 10000);
            });

            router.start();
            router.destroy();

            plan
                .task(function (next) {
                    expect(beforeChangeTimes).toBe(1);
                    expect(afterChangeTimes).toBe(0);
                    delay(next);
                })
                .serial(done);
        });

        pipe('模式：path', function (done) {
            var router = new Router({
                mode: 'path'
            });
            var matched = false;
            var origin = location.href;

            router
                .match('/', function (next) {
                    next('/abc');
                })
                .match('/abc', function () {
                    matched = true;
                });

            plan
                .task(function (next) {
                    history.replaceState(null, null, '/');
                    router.start();
                    delay(next);
                })
                .task(function (next) {
                    expect(location.pathname).toBe('/abc');
                    router.destroy();
                    history.replaceState(null, null, origin);
                    delay(next);
                })
                .serial(done);
        });

        water.serial(done);
    }, 10000000);
});
