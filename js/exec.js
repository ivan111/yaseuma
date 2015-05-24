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


    y.ast.ASTOp2.prototype.exec = function (env) {
        var op = this.op.lexeme;
        var right = this.right.exec(env);

        if (op === "=") {
            env.vars(this.left.idName, right);
            return right;
        }

        var left = this.left.exec(env);

        return runOp(op, left, right);
    };


    y.ast.ASTVar.prototype.exec = function (env) {
        return env.vars(this.idName);
    };


    y.ast.ASTCall.prototype.exec = function (env) {
        var f = env.vars(this.idName);
        var args = [];

        this.args.items.forEach(function (arg) {
            args.push(arg.exec(env));
        });

        // 組み込み関数
        if (typeof f === "function") {
            return f.apply(null, args);
        }

        if (f.type !== y.AST.DEF) {
            throw "could not call " + this.idName;
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
    };


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
            env.vars(this.aVar.idName, arr[i]);

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
        env.vars(this.funcName.idName, this);
    };


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
