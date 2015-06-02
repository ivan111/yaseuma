(function() {
    "use strict";

    y.CodeEnv = CodeEnv;
    y.inst2numMap = {};


    function CodeEnv() {
        this.defs = {};
        this.code = [];

        this.curTmpNo = 0;

        this.ifId = 0;
        this.forId = 0;
        this.whileId = 0;

        this.noTmpVar = false;
    }


    helpers.myEnum(y.inst2numMap, "nop", "and", "or", "not",
        "=", "+", "-", "*", "/", "==", "!=",
        "<", "<=", ">", ">=", "var", "slice", "list", "map", "call", "exec", "ret",
        "break", "cont", "ret_val", "jmp", "jmp_f", "for", "field", "method",
        "skip", "dict", "new");


    CodeEnv.prototype.toJSON = function () {
        return JSON.stringify({
            defs: this.defs,
            code: this.code
        });
    };


    CodeEnv.prototype.toHTMLTable = function () {
        var maxCol = 0;

        for (var i = 0; i < this.code.length; i++) {
            var colNum = this.code[i].length;

            if (colNum > maxCol) {
                maxCol = colNum;
            }
        }

        var a = [];

        //a.push("<table>");

        for (var rowI = 0; rowI < this.code.length; rowI++) {
            var row = this.code[rowI];

            a.push("<tr><th>");
            a.push(rowI);
            a.push("</th>");

            for (var colI = 0; colI < maxCol; colI++) {
                if (colI < row.length) {
                    a.push("<td><pre>");
                    a.push(asm2str(row[colI]));
                    a.push("</pre></td>");
                } else {
                    a.push("<td></td>");
                }
            }

            a.push("</tr>");
        }

        //a.push("</table>");

        return a.join("");
    };


    function asm2str(asm) {
        if (typeof asm === "number") {
            return asm;
        }

        if (helpers.isString(asm)) {
            return asm.replace(/\n/g, "\\n");
        }

        if (!helpers.isArray(asm)) {
            return asm;
        }

        switch (asm[0]) {
            case "jmp":
                return "jmp " + asm[1];

            case "jmp_f":
                return "jmp_f " + asm[1];

            case "exec":
            case "call":
                return [asm2str(asm[1]), "(", asmList2str(asm[2]), ")"].join("");

            case "skip":
                return ["skip ", asm2str(asm[1])].join("");

            case "ret":
                if (asm.length === 1) {
                    return "ret";
                }

                return "ret " + asm2str(asm[1]);

            case "list":
                var arr = [];

                for (var i = 1; i < asm.length; i++) {
                    arr.push(asm2str(asm[i]));
                }

                return ["[", arr.join(", "), "]"].join("");

            case "dict":
                arr = [];

                for (i = 1; i < asm.length; i++) {
                    var pair = asm[i];
                    arr.push([pair[0], ": ", asm2str(pair[1])].join(""));
                }

                return ["{", arr.join(", "), "}"].join("");

            case "slice":
                if (asm.length === 4) {
                    return [asm2str(asm[1]), "[", asm2str(asm[2]), ":", asm2str(asm[3]), "]"].join("");
                }

                return [asm2str(asm[1]), "[", asm2str(asm[2]), "]"].join("");

            case "label":
                return asm[1];

            case "var":
                return var2str(asm[1]);

            case "for":
                return ["for ", asm2str(asm[1]), " in ", var2str(asm[2])].join("");

            case "field":
                return [asm2str(asm[1]), ".", asm2str(asm[2])].join("");

            case "method":
                return [asm2str(asm[1]), ".", asm2str(asm[2]), "(", asmList2str(asm[3]), ")"].join("");

            case "new":
                return ["new ", asm2str(asm[1])].join("");

            case "=":
                return [var2str(asm[1]), " = ", asm2str(asm[2])].join("");

            case "not":
                return "not " + asm2str(asm[1]);

            case "and": case "or": case "+": case "-": case "*": case "/":
            case "==": case "!=": case "<": case "<=": case ">": case ">=":
                return [asm2str(asm[1]), " ", asm[0], " ", asm2str(asm[2])].join("");
        }

        return asm;
    }


    function var2str(asm) {
        if (typeof asm === "number") {
            return "$" + asm;
        }

        return asm2str(asm);
    }


    function asmList2str(asmList) {
        var arr = [];

        asmList.forEach(function (asm) {
            arr.push(asm2str(asm));
        });

        return arr.join(", ");
    }


    CodeEnv.prototype.appendInst = function (lineNo, inst) {
        if (!this.code[lineNo]) {
            this.code[lineNo] = [];
        }

        this.code[lineNo].push(inst);
    };


    CodeEnv.prototype.fill = function () {
        for (var i = 0; i < this.code.length; i++) {
            if (!this.code[i]) {
                this.code[i] = [];
            }
        }
    };


    CodeEnv.prototype.createTmp = function () {
        return this.curTmpNo++;
    };


    CodeEnv.prototype.getIfId = function () {
        return this.ifId++;
    };


    CodeEnv.prototype.getForId = function () {
        return this.forId++;
    };


    CodeEnv.prototype.getWhileId = function () {
        return this.whileId++;
    };


    CodeEnv.prototype.codeForEach = function (callback) {
        for (var lineNo = 0; lineNo < this.code.length; lineNo++) {
            var insts = this.code[lineNo];

            for (var i = 0; i < insts.length; i++) {
                var inst = insts[i];

                callback(inst, lineNo, i);
            }
        }
    };


    CodeEnv.prototype.traverseArray = function (node, callback) {
        var nodes = [node];

        while (nodes.length !== 0) {
            node = nodes.pop();

            if (!helpers.isArray(node)) {
                continue;
            }

            var car = node[0];

            callback(node);

            if (car === "dict") {
                for (var i = 1; i < node.length; i++) {
                    var pair = node[i];

                    if (helpers.isArray(pair[1])) {
                        nodes.push(pair[1]);
                    }
                }

                continue;
            }

            if (car === "call" || car === "exec" || car === "method") {
                if (car === "method") {
                    nodes.push(node[1]);
                    var args = node[3];
                } else {
                    args = node[2];
                }

                for (i = 0; i < args.length; i++) {
                    var arg = args[i];

                    if (helpers.isArray(arg)) {
                        nodes.push(arg);
                    }
                }

                continue;
            }

            for (i = 1; i < node.length; i++) {
                if (helpers.isArray(node)) {
                    nodes.push(node[i]);
                }
            }
        }
    };
})();
