/**
 * 文件描述
 * @author ydr.me
 * @create 2016-06-01 15:15
 */


'use strict';


var Router = require('../src/index');

var router = new Router();

router
    .get('/', function (next) {
        require.async('./async2/home.js', next);
    })
    .get('/abc', function (next) {
        require.async('./async2/abc.js', next);
    });

router.start();

router.on('afterChange', function (route) {
    if(route.controller.installed) {
        return;
    }

    route.controller.install(route);
    route.controller.installed = true;
});


window.router = router;
