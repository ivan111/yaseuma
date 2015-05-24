(function() {
    "use strict";

    y.ast = {
        ASTNumber: ASTNumber,
        ASTString: ASTString,
        ASTList: ASTList,
        ASTOp2: ASTOp2,
        ASTVar: ASTVar,
        ASTCall: ASTCall,
        ASTIf: ASTIf,
        ASTFor: ASTFor,
        ASTWhile: ASTWhile,
        ASTReturn: ASTReturn,
        ASTBreak: ASTBreak,
        ASTContinue: ASTContinue,
        ASTBlock: ASTBlock,
        ASTDef: ASTDef
    };

    y.AST = {
        NUMBER: 300,
        STRING: 301,
        LIST: 302,
        DICT: 303,

        OP2: 310,
        VAR: 311,
        CALL: 312,

        IF: 320,
        FOR: 321,
        WHILE: 322,
        RETURN: 323,
        BREAK: 324,
        CONTINUE: 325,
        DEF: 326,

        PASS: 400
    };


    function ASTNumber(num) {
        this.type = y.AST.NUMBER;
        this.num = num;

        this.className = "ast-number";
        this.nodeChar = "N";
        this.nodeText = "" + num;
    }


    ASTNumber.prototype.exec = function () {
        return this.num;
    };


    function ASTString(s) {
        this.type = y.AST.STRING;
        this.s = s;

        this.className = "ast-string";
        this.nodeChar = "S";
        this.nodeText = s;
    }


    ASTString.prototype.exec = function () {
        return this.s;
    };


    function ASTList(items) {
        this.type = y.AST.LIST;
        this.items = items;

        this.className = "ast-list";
        this.nodeText = "list";
        this.children = items;
    }


    ASTList.prototype.exec = function (env) {
        var items = [];

        this.items.forEach(function (item) {
            items.push(item.exec(env));
        });

        return items;
    };


    function ASTOp2(op, lhs, rhs) {
        if (lhs.type === y.AST.NUMBER && rhs.type === y.AST.NUMBER) {
            var num = runOp(op.lexeme, lhs.num, rhs.num);

            ASTNumber.call(this, num);

            return;
        }

        this.type = y.AST.OP2;
        this.op = op;
        this.left = lhs;
        this.right = rhs;

        this.className = "ast-op2";
        this.nodeChar = op.lexeme;
        this.children = [lhs, rhs];
    }


    ASTOp2.prototype.exec = function (env) {
        var op = this.op.lexeme;
        var right = this.right.exec(env);

        if (op === "=") {
            env.vars(this.left.idName, right);
            return right;
        }

        var left = this.left.exec(env);

        return runOp(op, left, right);
    };


    function ASTVar(idName) {
        this.type = y.AST.VAR;
        this.idName = idName;

        this.className = "ast-var";
        this.nodeChar = "V";
        this.nodeText = idName;
    }


    ASTVar.prototype.exec = function (env) {
        return env.vars(this.idName);
    };


    function ASTCall(idName, args) {
        this.type = y.AST.CALL;
        this.idName = idName;
        this.args = args;

        this.className = "ast-call";
        this.nodeChar = "C";
        this.nodeText = idName;
        this.children = [args];
    }


    ASTCall.prototype.exec = function (env) {
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


    function ASTPass() {
        this.type = y.AST.PASS;

        this.className = "ast-pass";
        this.nodeText = "pass";
    }


    ASTPass.prototype.exec = function () {
    };


    function ASTIf(cond, body, aElse) {
        aElse = aElse || new ASTPass();

        this.type = y.AST.IF;
        this.cond = cond;
        this.body = body;
        this.aElse = aElse;

        this.className = "ast-keyword";
        this.nodeText = "if";
        this.children = [cond, body, aElse];
    }


    ASTIf.prototype.exec = function (env) {
        if (this.cond.exec(env)) {
            this.body.exec(env);
        } else {
            this.aElse.exec(env);
        }
    };


    function ASTFor(aVar, aArray, body) {
        this.type = y.AST.FOR;
        this.aVar = aVar;
        this.aArray = aArray;
        this.body = body;

        this.className = "ast-keyword";
        this.nodeText = "for";
        this.children = [aVar, aArray, body];
    }


    ASTFor.prototype.exec = function (env) {
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


    function ASTWhile(cond, body) {
        this.type = y.AST.WHILE;
        this.cond = cond;
        this.body = body;

        this.className = "ast-keyword";
        this.nodeText = "while";
        this.children = [cond, body];
    }


    ASTWhile.prototype.exec = function (env) {
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


    function ASTReturn(value) {
        this.type = y.AST.RETURN;
        this.value = value;

        this.className = "ast-keyword";
        this.nodeText = "return";
        this.children = [value];
    }


    ASTReturn.prototype.exec = function (env) {
        var ret = this.value.exec(env);
        throw new ReturnException(ret);
    };


    function ReturnException(returnValue) {
        this.returnValue = returnValue;
        this.name = "ReturnException";
    }


    function ASTBreak() {
        this.type = y.AST.BREAK;

        this.className = "ast-keyword";
        this.nodeText = "break";
    }


    ASTBreak.prototype.exec = function () {
        throw new BreakException();
    };


    function BreakException() {
        this.name = "BreakException";
    }


    function ASTContinue() {
        this.type = y.AST.CONTINUE;

        this.className = "ast-keyword";
        this.nodeText = "continue";
    }


    ASTContinue.prototype.exec = function () {
        throw new ContinueException();
    };


    function ContinueException() {
        this.name = "ContinueException";
    }


    function ASTBlock(astList) {
        this.type = y.AST.BLOCK;
        this.astList = astList;

        this.className = "ast-block";
        this.nodeText = "block";
        this.children = astList;
    }


    ASTBlock.prototype.exec = function (env) {
        this.astList.forEach(function (ast) {
            ast.exec(env);
        });
    };


    function ASTDef(funcName, params, body) {
        this.type = y.AST.DEF;
        this.funcName = funcName;
        this.params = params;
        this.body = body;

        this.className = "ast-def";
        this.nodeText = "def";
        this.children = [funcName, params, body];
    }


    ASTDef.prototype.exec = function (env) {
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
