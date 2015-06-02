(function() {
    "use strict";

    window.helpers = {
        isNullOrUndef: isNullOrUndef,
        isString: isString,
        isArray: isArray,
        createEvent: createEvent,
        myEnum: myEnum,
        hasClass: hasClass,
        addClass: addClass,
        removeClass: removeClass
    };


    function isNullOrUndef(v) {
        if (typeof v === "undefined" || v === null) {
            return true;
        }

        return false;
    }


    function isString(d) {
        return typeof d === "string" || d instanceof String;
    }


    function isArray(d) {
        return Object.prototype.toString.call(d) === "[object Array]";
    }


    function createEvent(obj, eventName) {
        var onListenersName = ["on", eventName, "Listeners"].join("");
        var addListenerName = ["add", eventName, "Listener"].join("");
        var removeListenerName = ["remove", eventName, "Listener"].join("");
        var notifyName = "notify" + eventName;

        obj[onListenersName] = [];

        obj[addListenerName] = function (listener) {
            if (obj[onListenersName].indexOf(listener) === -1) {
                obj[onListenersName].push(listener);
            }
        };

        obj[removeListenerName] = function (listener) {
            var i = obj[onListenersName].indexOf(listener);
            if (i !== -1) {
                obj[onListenersName].splice(i, 1);
            }
        };

        obj[notifyName] = function () {
            var args = arguments;

            obj[onListenersName].forEach(function (listener) {
                listener.apply(null, args);
            });
        };
    }


    function myEnum(obj) {
        obj.reverseMap = [];

        var n = 0;

        for (var i = 1; i < arguments.length; i++) {
            var arg = arguments[i];

            if (typeof arg === "number") {
                n = arg;
            } else {
                obj[arg] = n;
                obj.reverseMap[n] = arg;
                n++;
            }
        }
    }


    var name2reMap = {};


    function className2re(className) {
        if (className in name2reMap) {
            var re = name2reMap[className];
        } else {
            re = new RegExp(["(?:^|\\s)", className, "(?!\\S)"].join(""));
            name2reMap[className] = re;
        }

        return re;
    }


    function hasClass(elem, className) {
        var re = className2re(className);

        if (elem.className.match(re)) {
            return true;
        }

        return false;
    }


    function addClass(elem, className) {
        if (!hasClass(elem, className)) {
            if (elem.className === "") {
                elem.className = className;
            } else {
                elem.className += " " + className;
            }
        }
    }


    function removeClass(elem, className) {
        var re = className2re(className);

        elem.className = elem.className.replace(re, "");
    }
})();
