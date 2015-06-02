(function() {
    "use strict";

    y.runOp = runOp;


    y.ast.ASTNumber.prototype.exec = function () {
        return this.num;
    };


    y.ast.ASTString.prototype.exec = function () {
        return this.s;
    };


    y.ast.ASTList.prototype.exec = function (env) {
        var items = [];

        this.items.forEach(function (item) {
            items.push(item.exec(env));
        });

        return items;
    };


    y.ast.ASTDict.prototype.exec = function (env) {
        var obj = [];

        for (var i = 0; i < this.keys.length; i++) {
            var keyAst = this.keys[i];

            switch (keyAst.type) {
                case y.AST.VAR:
                    var key = keyAst.idName;
                    break;

                case y.AST.STRING:
                    key = keyAst.s;
                    break;

                case y.AST.NUMBER:
                    key = "" + keyAst.num;
                    break;

                default:
                    throw "map key error: " + keyAst;
            }

            obj[key] = this.values[i].exec(env);
        }

        return obj;
    };


    y.ast.ASTOp1.prototype.exec = function (env) {
        var op = this.op;
        var right = this.right.exec(env);

        if (op === "-") {
            return -right;
        }

        if (op === "not") {
            return !right;
        }

        throw "unknown op1: " + op;
    };


    y.ast.ASTOp2.prototype.exec = function (env) {
        var op = this.op;
        var right = this.right.exec(env);

        if (op === "=") {
            assignVar(env, this.left, right);
            return right;
        }

        var left = this.left.exec(env);

        return runOp(op, left, right);
    };


    y.ast.ASTVar.prototype.exec = function (env) {
        return env.vars(this.idName);
    };


    y.ast.ASTSlice.prototype.exec = function (env) {
        var obj = this.obj.exec(env);
        var start = this.start.exec(env);

        if (this.end) {
            return obj.slice(start, this.end.exec(env));
        }

        return obj[start];
    };


    y.ast.ASTCall.prototype.exec = function (env) {
        var funcName = this.funcName;

        var args = [];

        this.args.items.forEach(function (arg) {
            args.push(arg.exec(env));
        });

        return aCall(env, funcName, args);
    };


    function aCall(env, funcName, args) {
        var f = env.vars(funcName);

        // 組み込み関数
        if (typeof f === "function") {
            return f.apply(null, args);
        }

        if (f.type !== y.AST.DEF) {
            try {
                window[funcName].apply(null, args);
            } catch (e) {
                throw "could not call " + funcName;
            }

            throw "could not call " + funcName;
        }

        // ユーザ定義関数
        var funcEnv = new y.Env(env);

        for (var i = 0; i < f.params.items.length; i++) {
            var param = f.params.items[i];

            funcEnv.vars(param.idName, args[i]);
        }

        var returnValue;

        try {
            f.body.exec(funcEnv);
        } catch (e) {
            if (e.name === "ReturnException") {
                returnValue = e.returnValue;
            } else {
                throw e;
            }
        }

        var top = env.getTopLevelEnv();

        if (top.notifyDeleteEnv) {
            top.notifyDeleteEnv(env);
        }

        return returnValue;
    }


    y.ast.ASTPass.prototype.exec = function () {};


    y.ast.ASTIf.prototype.exec = function (env) {
        if (this.cond.exec(env)) {
            this.body.exec(env);
        } else {
            this.aElse.exec(env);
        }
    };


    y.ast.ASTFor.prototype.exec = function (env) {
        var arr = this.aArray.exec(env);

        for (var i = 0; i < arr.length; i++) {
            assignVar(env, this.aVar, arr[i]);

            try {
                this.body.exec(env);
            } catch (e) {
                if (e.name === "BreakException") {
                    break;
                } else if (e.name === "ContinueException") {
                    continue;
                } else {
                    throw e;
                }
            }
        }
    };


    y.ast.ASTWhile.prototype.exec = function (env) {
        while (this.cond.exec(env)) {
            try {
                this.body.exec(env);
            } catch (e) {
                if (e.name === "BreakException") {
                    break;
                } else if (e.name === "ContinueException") {
                    continue;
                } else {
                    throw e;
                }
            }
        }
    };


    y.ast.ASTReturn.prototype.exec = function (env) {
        var ret = this.value.exec(env);
        throw new ReturnException(ret);
    };


    function ReturnException(returnValue) {
        this.returnValue = returnValue;
        this.name = "ReturnException";
    }


    y.ast.ASTBreak.prototype.exec = function () {
        throw new BreakException();
    };


    function BreakException() {
        this.name = "BreakException";
    }


    y.ast.ASTContinue.prototype.exec = function () {
        throw new ContinueException();
    };


    function ContinueException() {
        this.name = "ContinueException";
    }


    y.ast.ASTBlock.prototype.exec = function (env) {
        this.astList.forEach(function (ast) {
            ast.exec(env);
        });
    };


    y.ast.ASTDef.prototype.exec = function (env) {
        env.vars(this.funcName, this);
    };


    y.ast.ASTMember.prototype.exec = function (env) {
        var obj = this.obj.exec(env);

        if (this.idAst.type === y.AST.VAR) {
            return obj[this.idAst.idName];
        }

        var args = [];

        this.idAst.args.items.forEach(function (arg) {
            args.push(arg.exec(env));
        });

        var funcName = this.idAst.funcName;

        try {
            return obj[funcName].apply(obj, args);
        } catch (e) {
            args.unshift(obj);
            return aCall(env, funcName, args);
        }
    };


    y.ast.ASTNew.prototype.exec = function () {
        throw "new は未実装";
    };


    function assignVar(env, leftAst, right) {
        if (leftAst.type === y.AST.VAR) {
            env.vars(leftAst.idName, right);
        } else {  // field
            var obj = leftAst.obj.exec(env);

            obj[leftAst.idAst.idName] = right;
        }
    }


    function runOp(op, x, y) {
        switch (op) {
        case "+": return x + y;
        case "-": return x - y;
        case "*": return x * y;
        case "/": return x / y;
        case "==": return x === y;
        case "!=": return x !== y;
        case "<": return x < y;
        case "<=": return x <= y;
        case ">": return x > y;
        case ">=": return x >= y;
        default: throw "unknown op: " + op;
        }
    }
})();
