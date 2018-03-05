/**
 * 路由
 * @author ydr.me
 * @create 2018-03-05 10:19
 * @update 2018-03-05 10:19
 */


'use strict';

var Events = require('blear.classes.events');

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
    constructor: function () {

    }
});


