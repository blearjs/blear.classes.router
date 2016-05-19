/**
 * 测试 文件
 * @author ydr.me
 * @create 2016-05-17 12:13
 */


'use strict';

var Router = require('../src/index.js');
var howdo = require('blear.utils.howdo');


describe('测试文件', function () {
    it('main', function (done) {
        location.hash = '#';

        var router;
        var beforeChange = 0;
        var change = 0;
        var afterChange = 0;
        var delay = function (fn) {
            setTimeout(fn, 300);
        };
        var beforeChangeRoute = null;
        var changeRoute = null;
        var acceptBeforeChange = true;
        var acceptChange = true;

        howdo
            .task(function (next) {
                router = new Router({
                    maxLength: 3
                });

                router.match('/string', function () {
                    return 'string';
                });

                router.match('/expression/:expression', function (resolve) {
                    resolve('expression');
                });

                router.match(/^\/regexp\//, function () {
                    return 'regexp';
                });

                router.otherwise(function () {
                    return '404';
                });

                router.on('beforeChange', function (route, next) {
                    beforeChangeRoute = route;
                    beforeChange++;
                    setTimeout(function () {
                        next(acceptBeforeChange);
                    });
                });

                router.on('change', function (route, next) {
                    changeRoute = route;
                    change++;
                    next(acceptChange);
                });

                router.on('afterChange', function (route, changed) {
                    afterChange++;
                });

                delay(next);
            })

            .task(function (next) {
                expect(beforeChange).toEqual(1);
                expect(change).toEqual(1);
                expect(afterChange).toEqual(1);
                expect(beforeChangeRoute.matched).toEqual(false);
                expect(beforeChangeRoute.controller).toEqual('404');
                expect(beforeChangeRoute.pathname).toEqual('/');

                location.hash = '#!/string/?a=1';
                delay(next);
            })
                
            .task(function (next) {
                expect(beforeChange).toEqual(2);
                expect(change).toEqual(2);
                expect(afterChange).toEqual(2);
                expect(beforeChangeRoute.matched).toEqual(true);
                expect(beforeChangeRoute.rule).toEqual('/string');
                expect(beforeChangeRoute.query.a).toEqual('1');
                expect(beforeChangeRoute.controller).toEqual('string');
                expect(beforeChangeRoute.pathname).toEqual('/string/');

                location.hash = '#!/expression/123/?a=2';
                delay(next);
            })
                
            .task(function (next) {
                expect(beforeChange).toEqual(3);
                expect(change).toEqual(3);
                expect(afterChange).toEqual(3);
                expect(beforeChangeRoute.matched).toEqual(true);
                expect(beforeChangeRoute.rule).toEqual('/expression/:expression');
                expect(beforeChangeRoute.params.expression).toEqual('123');
                expect(beforeChangeRoute.query.a).toEqual('2');
                expect(beforeChangeRoute.controller).toEqual('expression');
                expect(beforeChangeRoute.pathname).toEqual('/expression/123/');

                location.hash = '#!/regexp/?a=3';
                delay(next);
            })
            .task(function (next) {
                expect(beforeChange).toEqual(4);
                expect(change).toEqual(4);
                expect(afterChange).toEqual(4);
                expect(beforeChangeRoute.matched).toEqual(true);
                expect(beforeChangeRoute.query.a).toEqual('3');
                expect(beforeChangeRoute.controller).toEqual('regexp');
                expect(beforeChangeRoute.pathname).toEqual('/regexp/');

                router.redirect('/string?x=1');
                delay(next);
            })
            .task(function (next) {
                expect(beforeChange).toEqual(5);
                expect(change).toEqual(5);
                expect(afterChange).toEqual(5);
                expect(beforeChangeRoute.matched).toEqual(true);
                expect(beforeChangeRoute.query.x).toEqual('1');
                expect(beforeChangeRoute.pathname).toEqual('/string');

                // #!/regexp/?a=3
                router.redirect(-1);
                delay(next);
            })
            .task(function (next) {
                expect(beforeChange).toEqual(6);
                expect(change).toEqual(6);
                expect(afterChange).toEqual(6);
                expect(beforeChangeRoute.matched).toEqual(true);
                expect(beforeChangeRoute.query.a).toEqual('3');
                expect(beforeChangeRoute.controller).toEqual('regexp');
                expect(beforeChangeRoute.pathname).toEqual('/regexp/');

                router.redirect(0);
                delay(next);
            })
            .task(function (next) {
                expect(beforeChange).toEqual(6);
                expect(change).toEqual(6);
                expect(afterChange).toEqual(6);
                expect(beforeChangeRoute.matched).toEqual(true);
                expect(beforeChangeRoute.query.a).toEqual('3');
                expect(beforeChangeRoute.controller).toEqual('regexp');
                expect(beforeChangeRoute.pathname).toEqual('/regexp/');

                router.redirect(1000);
                delay(next);
            })
            .task(function (next) {
                expect(beforeChange).toEqual(6);
                expect(change).toEqual(6);
                expect(afterChange).toEqual(6);
                expect(beforeChangeRoute.matched).toEqual(true);
                expect(beforeChangeRoute.query.a).toEqual('3');
                expect(beforeChangeRoute.controller).toEqual('regexp');
                expect(beforeChangeRoute.pathname).toEqual('/regexp/');

                router.rewrite('/rewrite?length=1');
                delay(next);
            })
            .task(function (next) {
                expect(beforeChange).toEqual(6);
                expect(change).toEqual(6);
                expect(afterChange).toEqual(6);
                expect(beforeChangeRoute.matched).toEqual(true);
                expect(beforeChangeRoute.query.length).toEqual('1');
                expect(beforeChangeRoute.controller).toEqual('regexp');
                expect(beforeChangeRoute.pathname).toEqual('/rewrite');
                expect(beforeChangeRoute.rewriteList.length).toEqual(1);

                beforeChangeRoute.send({
                    what: 2
                });

                router.rewriteQuery({
                    what: 3
                });
                delay(next);
            })
            .task(function (next) {
                expect(beforeChange).toEqual(6);
                expect(change).toEqual(6);
                expect(afterChange).toEqual(6);
                expect(beforeChangeRoute.pathname).toEqual('/rewrite');
                expect(beforeChangeRoute.query.what).toEqual('3');
                expect(beforeChangeRoute.data.what).toEqual(2);

                acceptBeforeChange = false;
                acceptChange = true;
                router.redirect('/string?what=1');
                location.hash ='#!/string?what=1111';
                delay(function () {
                    router.redirect('/string?what=2');
                    delay(next);
                });
            })
            // drop before change
            .task(function (next) {
                expect(beforeChange).toEqual(8);
                expect(change).toEqual(6);
                expect(afterChange).toEqual(8);

                expect(beforeChangeRoute.pathname).toEqual('/string');
                expect(beforeChangeRoute.query.what).toEqual('2');

                expect(changeRoute.pathname).toEqual('/rewrite');
                expect(changeRoute.query.what).toEqual('3');
                expect(changeRoute.data.what).toEqual(2);


                acceptBeforeChange = true;
                acceptChange = false;
                router.redirect('/string?what=3');
                delay(next);
            })
            .task(function (next) {
                expect(beforeChange).toEqual(9);
                expect(change).toEqual(7);
                expect(afterChange).toEqual(9);

                expect(beforeChangeRoute.pathname).toEqual('/string');
                expect(beforeChangeRoute.query.what).toEqual('3');
                expect(changeRoute.pathname).toEqual('/string');
                expect(changeRoute.query.what).toEqual('3');
                expect(changeRoute.data.what).toEqual(2);
                delay(next);
            })
            .follow(done);
    });
});
