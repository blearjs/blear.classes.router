/**
 * 测试 文件
 * @author ydr.me
 * @create 2016-05-17 12:13
 */


'use strict';

var Router = require('../src/index.js');
var howdo = require('blear.utils.howdo');


describe('测试文件', function () {
    var delay = function (next) {
        setTimeout(next);
    };

    it('water test', function (done) {
        var water = howdo;
        var pipe = function (id, task) {
            water = water.task(function (next) {
                location.hash = '#';
                delay(next);
            });
            water = water.task(function (done) {
                console.log('test>>', id);
                task(done);
            });
        };

        pipe('options.onChange', function (done) {
            var changeTimes = 0;
            var beforeTimes = 0;
            var afterTimes = 0;
            var router = new Router({
                onChange: function (route, next) {
                    changeTimes++;
                    next(true);
                }
            });

            router.on('beforeChange', function () {
                beforeTimes++;
            });

            router.on('afterChange', function () {
                afterTimes++;
            });

            howdo
                .task(function (next) {
                    location.hash = '#!/a';
                    delay(next);
                })
                .task(function (next) {
                    location.hash = '#!/b';
                    delay(next);
                })
                .task(function (next) {
                    router.destroy();
                    delay(next);
                })
                .task(function (next) {
                    expect(changeTimes).toEqual(3);
                    expect(beforeTimes).toEqual(3);
                    expect(afterTimes).toEqual(3);
                    expect(location.hash).toEqual('#!/b');
                    delay(next);
                })
                .follow(done);
        });

        pipe('#redirect', function (done) {
            var changeTimes = 0;
            var router = new Router({
                onChange: function (route, next) {
                    changeTimes++;
                    next(true);
                }
            });

            howdo
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
                    expect(location.hash).toEqual('#!/a');
                    delay(next);
                })
                .follow(done);
        });

        pipe('#rewrite', function (done) {
            var changeTimes = 0;
            var router = new Router({
                onChange: function (route, next) {
                    changeTimes++;
                    next(true);
                }
            });

            howdo
                .task(function (next) {
                    router.rewrite('/a');
                    delay(next);
                })
                .task(function (next) {
                    router.destroy();
                    delay(next);
                })
                .task(function (next) {
                    expect(changeTimes).toEqual(1);
                    expect(location.hash).toEqual('#!/a');
                    delay(next);
                })
                .follow(done);
        });

        pipe('#rewriteQuery', function (done) {
            var changeTimes = 0;
            var router = new Router({
                onChange: function (route, next) {
                    changeTimes++;
                    next(true);
                }
            });

            howdo
                .task(function (next) {
                    router.rewriteQuery({a:1});
                    delay(next);
                })
                .task(function (next) {
                    expect(location.hash).toEqual('#!/?a=1');
                    router.rewriteQuery('a', '2');
                    delay(next);
                })
                .task(function (next) {
                    expect(location.hash).toEqual('#!/?a=2');
                    router.rewriteQuery('a=3');
                    delay(next);
                })
                .task(function (next) {
                    expect(location.hash).toEqual('#!/?a=3');
                    router.destroy();
                    delay(next);
                })
                .task(function (next) {
                    expect(changeTimes).toEqual(1);
                    expect(location.hash).toEqual('#!/?a=3');
                    delay(next);
                })
                .follow(done);
        });

        water.follow(done);
    });
});
