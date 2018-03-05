/**
 * 路由
 * @author ydr.me
 * @create 2018-03-05 10:19
 * @update 2018-03-05 10:19
 */


'use strict';

var Events = require('blear.classes.events');
var object = require('blear.utils.object');
var access = require('blear.utils.access');

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
        the[_foundMatches] = [];
        the[_notFoundMatch] = null;
    },


    /**
     * 路由匹配
     * @param path
     * @param callback
     * @returns {Router}
     */
    match: function (path, callback) {
        var the = this;
        var args = access.args(arguments);

        switch (args.length) {
            case 0:
                break;

            case 1:
                break;

            case 2:
                break;
        }

        return the;
    },

    otherwise: function (callback) {

    },

    destroy: function () {
        var the = this;

        the[_options] = the[_foundMatches] = the[_notFoundMatch] = null;
    }
});
var prop = Router.prototype;
var sole = Router.sole;
var _options = sole();
var _foundMatches = sole();
var _notFoundMatch = sole();

