(function() {
    "use strict";

    if (!window.y) {
        window.y = {};
    }

    y.inst2numMap = {};

    helpers.myEnum(y.inst2numMap, "nop", "and", "or", "not",
        "=", "+", "-", "*", "/", "==", "!=",
        "<", "<=", ">", ">=", "var", "slice", "list", "map", "call", "exec", "ret",
        "break", "cont", "ret_val", "jmp", "jmp_f", "for", "field", "method",
        "skip", "dict", "new");
})();
