(function() {
    "use strict";

    window.helpers = {
        isNullOrUndef: isNullOrUndef,
        createEvent: createEvent
    };


    function isNullOrUndef(v) {
        if (typeof v === "undefined" || v === null) {
            return true;
        }

        return false;
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
})();
