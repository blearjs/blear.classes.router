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
        the[_previousState] = null;
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
        var path2 = null;
        var ctrl2 = null;

        switch (args.length) {
            case 1:
                path2 = null;
                ctrl2 = args[0];
                break;

            case 2:
                path2 = args[0];
                ctrl2 = args[1];
        }

        the[_namedDirectorList].push(wrapDirector(path2, ctrl2));
        return the;
    },

    /**
     * 否则路由不匹配
     * @param controller
     * @returns {Router}
     */
    otherwise: function (controller) {
        var the = this;
        the[_anonymousDirector] = wrapDirector(null, controller);
        return the;
    },

    // resolve: function (b) {
    //     var the = this;
    //     var options = the[_options];
    //
    //
    // },
    //
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

    /**
     * 路由开始
     * @returns {Router}
     */
    start: function () {
        var the = this;

        the[_initAnonymousDirector]();
        the[_initPopstateEvent]();
        the[_parseStateByStateType](STATE_TYPE_IS_PUSH);

        return the;
    },

    /**
     * 销毁
     */
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
var _previousState = sole();
var _historyManger = sole();
var _initAnonymousDirector = sole();
var _initPopstateEvent = sole();
var _onWindowPopstate = sole();
var _parseStateByStateType = sole();

prop[_initAnonymousDirector] = function () {
    var the = this;

    the[_anonymousDirector] = the[_anonymousDirector] || wrapDirector(null, function () {
        // ignore
    });
};

prop[_initPopstateEvent] = function () {
    var the = this;
    var options = the[_options];

    the[_parseStateByStateType] = function (stateType) {
        var route = hashbang.parse();
        var state = getState();
        var pathname = route.pathname;
        var matchedNamedDirectorList = [];
        // 这里用时间戳来判断，而不用 id，原因是：
        // id 是一个固定起始值，会与历史记录重复导致方向判断错误
        // 而时间戳是一个自增值，不会与历史记录重复
        var direction = state && the[_previousState] &&
        state.timestamp && the[_previousState].timestamp &&
        state.timestamp < the[_previousState].timestamp ? 'backward' : 'forward';

        switch (stateType) {
            // 浏览器主动：需要判断方向
            case STATE_TYPE_IS_POP:
                the[_historyManger][direction](route);
                break;

            // 用户主动：新增历史
            case STATE_TYPE_IS_PUSH:
                the[_historyManger].forward(route);
                break;

            // 用户主动：替换历史
            case STATE_TYPE_IS_REPLACE:
                direction = 'replace';
                the[_historyManger].replace(route);
                break;
        }

        route.direction = direction;
        route.state = state;
        nativeHistory.replaceState(the[_previousState] = state, null, location.href);
        plan.each(the[_namedDirectorList], function (index, director, next) {
            var directorPath = director.path;
            var matched = false;

            // 具名路径
            if (directorPath) {
                switch (typeis(directorPath)) {
                    case 'string':
                        matched = route.params = url.matchPath(pathname, directorPath, {
                            strict: options.strict,
                            ignoreCase: options.ignoreCase
                        });
                        break;

                    case 'regexp':
                        var matches = pathname.match(directorPath);

                        if (matches) {
                            matched = route.params = array.from(matches);
                        }
                        break;
                }

                if(matched) {
                    matchedNamedDirectorList.push(director);
                }
            }
            // 匿名路径
            else {
                matched = true;
            }

            // 未匹配到
            if (!matched) {
                return next();
            }

            director.ctrl.call(route, /*next*/function (replaceTo) {
                switch (typeis(replaceTo)) {
                    // 终点：替换当前 hashbang
                    case 'string':
                        replaceTo = hashbang.set(url.resolve(pathname, replaceTo), options.split);
                        nativeHistory.replaceState(state, null, replaceTo);
                        next(true);
                        the[_parseStateByStateType](STATE_TYPE_IS_REPLACE);
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

                    // 加载的模块
                    default:
                        next(true);
                        break;
                }
            });
        }).serial(function () {
            // 因为 plan 是异步的
            if (!matchedNamedDirectorList.length) {
                the[_anonymousDirector].ctrl.call(route, /*next*/function () {
                    // ignore
                });
            }
        });
    };

    event.on(win, 'popstate', the[_onWindowPopstate] = function (ev) {
        the[_parseStateByStateType](STATE_TYPE_IS_POP);
    });
};


Router.defaults = defaults;
module.exports = Router;

// ==================================================================

/**
 * 下一个 state
 * @returns {{timestamp: number}}
 */
function nextState() {
    return {
        timestamp: Date.now()
    };
}

/**
 * 获取当前 state
 * @returns {{id: number, timeStamp: number, timestamp: number}}
 */
function getState() {
    return nativeHistory.state || nextState();
}


/**
 * 包装控制器
 * @param path1
 * @param ctrl1
 * @returns {{ctrl: *, path: *, async: boolean}}
 */
function wrapDirector(path1, ctrl1) {
    var async = false;
    var ctrl2 = null;

    // 通过回调函数的参数个数来与判断路由回调类型
    // 异步控制器
    // router.match(path, function (resolve) {
    //     resolve(nextPath);
    // });
    if (ctrl1.length === 1) {
        async = true;
        ctrl2 = ctrl1;
    }
    // 默认是同步控制器
    // router.match(path, function () {
    //    do sth.
    // });
    else {
        ctrl2 = function (next) {
            ctrl1.call(this);
            next();
        }
    }

    return {
        ctrl: ctrl2,
        path: path1,
        async: async
    };
}
