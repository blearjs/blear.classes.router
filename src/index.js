/**
 * 路由
 * @author ydr.me
 * @create 2018-03-05 10:19
 * @update 2018-03-05 10:19
 */


'use strict';

var Events = require('blear.classes.events');
var access = require('blear.utils.access');
var array = require('blear.utils.array');
var object = require('blear.utils.object');
var plan = require('blear.utils.plan');
var url = require('blear.utils.url');
var typeis = require('blear.utils.typeis');
var hashbang = require('blear.core.hashbang');
var event = require('blear.core.event');

var History = require('./history');

var win = window;
var nativeHistory = win.history;
var STATE_TYPE_IS_PUSH = 0;
var STATE_TYPE_IS_REPLACE = 1;
var STATE_TYPE_IS_POP = 2;
var defaults = {
    /**
     * 是否忽略大小写，默认 false
     * @type Boolean
     */
    ignoreCase: false,

    /**
     * 是否严格模式，默认 false，即默认忽略末尾“/”
     * @type Boolean
     */
    strict: false,

    /**
     * hashbang 分隔符
     * @type String
     */
    split: ''
};
var Router = Events.extend({
    className: 'Router',
    constructor: function (options) {
        var the = this;

        the[_options] = object.assign(true, {}, defaults, options);
        the[_namedDirectorList] = [];
        the[_anonymousDirector] = null;
        the[_historyManger] = new History();
    },


    /**
     * 路由匹配
     * @param [path]
     * @param controller
     * @returns {Router}
     */
    match: function (path, controller) {
        var args = access.args(arguments);
        var the = this;
        var async = false;
        var path2 = null;
        var ctrl2 = null;
        var ctrl3 = null;

        switch (args.length) {
            case 1:
                path2 = null;
                ctrl2 = args[0];
                break;

            case 2:
                path2 = args[0];
                ctrl2 = args[1];
        }


        // 通过回调函数的参数个数来与判断路由回调类型
        // 异步控制器
        // router.match(path, function (resolve) {
        //     resolve(nextPath);
        // });
        if (ctrl2.length === 1) {
            async = true;
            ctrl3 = ctrl2;
        }
        // 默认是同步控制器
        // router.match(path, function () {
        //    do sth.
        // });
        else {
            ctrl3 = function (next) {
                ctrl2.call(this);
                next();
            }
        }

        the[_namedDirectorList].push({
            ctrl: ctrl3,
            path: path2,
            async: async
        });
        return the;
    },

    otherwise: function (callback) {

    },

    resolve: function (b) {
        var the = this;
        var options = the[_options];


    },

    // redirect: function () {
    //
    // },
    //
    // rewrite: function () {
    //
    // },
    //
    // rewriteQuery: function () {
    //
    // },

    start: function () {
        var the = this;

        the[_initPopstateEvent]();
        the[_parseStateByStateType](STATE_TYPE_IS_PUSH);
    },

    destroy: function () {
        var the = this;

        the[_options] = the[_namedDirectorList] = the[_anonymousDirector] = null;
    }
});
var prop = Router.prototype;
var sole = Router.sole;
var _options = sole();
var _namedDirectorList = sole();
var _anonymousDirector = sole();
var _historyManger = sole();
var _initPopstateEvent = sole();
var _onWindowPopstate = sole();
var _parseStateByStateType = sole();

prop[_initPopstateEvent] = function () {
    var the = this;
    var options = the[_options];

    the[_parseStateByStateType] = function (stateType) {
        var route = hashbang.parse();
        var state = getState();
        var pathname = route.pathname;
        var matchedDirectorList = [];

        the[_historyManger].forward(route);
        plan.each(the[_namedDirectorList], function (index, director, next) {
            director.ctrl.call(route, /*next*/function (replaceTo) {
                switch (typeis(replaceTo)) {
                    // 终点：替换当前 hashbang
                    case 'string':
                        replaceTo = hashbang.set(url.resolve(pathname, replaceTo), options.split);
                        nativeHistory.replaceState(state, null, replaceTo);
                        next(true);
                        break;

                    case 'undefined':
                        // 异步：过渡
                        if (director.async) {
                            next();
                        }
                        // 同步：终点
                        else {
                            next(true);
                        }
                        break;

                    default:
                        break;
                }
            });
        }).serial();

        switch (stateType) {
            // 浏览器主动：新增历史
            case STATE_TYPE_IS_POP:
                break;

            // 用户主动：新增历史
            case STATE_TYPE_IS_PUSH:
                break;

            // 用户主动：替换历史
            case STATE_TYPE_IS_REPLACE:
                break;
        }
    };

    event.on(win, 'popstate', the[_onWindowPopstate] = function (ev) {
        the[_parseStateByStateType](STATE_TYPE_IS_POP);
    });
};


Router.defaults = defaults;
module.exports = Router;

// ==================================================================
var stateId = 0;

/**
 * 获取当前 state
 * @returns {{id: number, timeStamp: number, timestamp: number}}
 */
function getState() {
    var timeStamp = Date.now();
    return nativeHistory.state || {
        id: stateId++,
        timeStamp: timeStamp,
        timestamp: timeStamp
    };
}
