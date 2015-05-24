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
        ASTDef: ASTDef,

        runOp: runOp
    };

    y.AST = {};
    helpers.myEnum(y.AST, 300, "NUMBER", "STRING", "LIST", "DICT", "OP2",
            "VAR", "CALL", "IF", "FOR", "WHILE", "RETURN", "BREAK",
            "CONTINUE", "DEF", "PASS");


    function ASTNumber(num) {
        this.num = num;

        this.nodeText = "" + num;
    }

    ASTNumber.prototype.type = y.AST.NUMBER;
    ASTNumber.prototype.className = "ast-number";
    ASTNumber.prototype.nodeChar = "N";

    ASTNumber.prototype.exec = function () {
        return this.num;
    };


    function ASTString(s) {
        this.s = s;

        this.nodeText = s;
    }

    ASTString.prototype.type = y.AST.STRING;
    ASTString.prototype.className = "ast-string";
    ASTString.prototype.nodeChar = "S";

    ASTString.prototype.exec = function () {
        return this.s;
    };


    function ASTList(items) {
        this.items = items;

        this.children = items;
    }

    ASTList.prototype.type = y.AST.LIST;
    ASTList.prototype.className = "ast-list";
    ASTList.prototype.nodeText = "list";

    ASTList.prototype.exec = function (env) {
        var items = [];

        this.items.forEach(function (item) {
            items.push(item.exec(env));
        });

        return items;
    };


    function ASTOp2(op, lhs, rhs) {
        this.op = op;
        this.left = lhs;
        this.right = rhs;

        this.nodeChar = op.lexeme;
        this.children = [lhs, rhs];
    }

    ASTOp2.prototype.type = y.AST.OP2;
    ASTOp2.prototype.className = "ast-op2";

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
        this.idName = idName;

        this.nodeText = idName;
    }

    ASTVar.prototype.type = y.AST.VAR;
    ASTVar.prototype.className = "ast-var";
    ASTVar.prototype.nodeChar = "V";

    ASTVar.prototype.exec = function (env) {
        return env.vars(this.idName);
    };


    function ASTCall(idName, args) {
        this.idName = idName;
        this.args = args;

        this.nodeText = idName;
        this.children = [args];
    }

    ASTCall.prototype.type = y.AST.CALL;
    ASTCall.prototype.className = "ast-call";
    ASTCall.prototype.nodeChar = "C";

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


    // ASTPass や ASTBreak などは、１つのインスタンスだけで
    // 済むように思えるけど、vtreeで表示するときに困るのでダメ
    function ASTPass() {
    }

    ASTPass.prototype.type = y.AST.PASS;
    ASTPass.prototype.className = "ast-pass";
    ASTPass.prototype.nodeText = "pass";
    ASTPass.prototype.exec = function () {};


    function ASTIf(cond, body, aElse) {
        aElse = aElse || new ASTPass();

        this.cond = cond;
        this.body = body;
        this.aElse = aElse;

        this.children = [cond, body, aElse];
    }

    ASTIf.prototype.type = y.AST.IF;
    ASTIf.prototype.className = "ast-keyword";
    ASTIf.prototype.nodeText = "if";

    ASTIf.prototype.exec = function (env) {
        if (this.cond.exec(env)) {
            this.body.exec(env);
        } else {
            this.aElse.exec(env);
        }
    };


    function ASTFor(aVar, aArray, body) {
        this.aVar = aVar;
        this.aArray = aArray;
        this.body = body;

        this.children = [aVar, aArray, body];
    }

    ASTFor.prototype.type = y.AST.FOR;
    ASTFor.prototype.className = "ast-keyword";
    ASTFor.prototype.nodeText = "for";

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
        this.cond = cond;
        this.body = body;

        this.children = [cond, body];
    }

    ASTWhile.prototype.type = y.AST.WHILE;
    ASTWhile.prototype.className = "ast-keyword";
    ASTWhile.prototype.nodeText = "while";

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
        this.value = value;

        this.children = [value];
    }

    ASTReturn.prototype.type = y.AST.RETURN;
    ASTReturn.prototype.className = "ast-keyword";
    ASTReturn.prototype.nodeText = "return";

    ASTReturn.prototype.exec = function (env) {
        var ret = this.value.exec(env);
        throw new ReturnException(ret);
    };


    function ReturnException(returnValue) {
        this.returnValue = returnValue;
        this.name = "ReturnException";
    }


    function ASTBreak() {
    }

    ASTBreak.prototype.type = y.AST.BREAK;
    ASTBreak.prototype.className = "ast-keyword";
    ASTBreak.prototype.nodeText = "break";

    ASTBreak.prototype.exec = function () {
        throw new BreakException();
    };


    function BreakException() {
        this.name = "BreakException";
    }


    function ASTContinue() {
    }

    ASTContinue.prototype.type = y.AST.CONTINUE;
    ASTContinue.prototype.className = "ast-keyword";
    ASTContinue.prototype.nodeText = "continue";

    ASTContinue.prototype.exec = function () {
        throw new ContinueException();
    };


    function ContinueException() {
        this.name = "ContinueException";
    }


    function ASTBlock(astList) {
        this.astList = astList;

        this.children = astList;
    }

    ASTBlock.prototype.type = y.AST.BLOCK;
    ASTBlock.prototype.className = "ast-block";
    ASTBlock.prototype.nodeText = "block";

    ASTBlock.prototype.exec = function (env) {
        this.astList.forEach(function (ast) {
            ast.exec(env);
        });
    };


    function ASTDef(funcName, params, body) {
        this.funcName = funcName;
        this.params = params;
        this.body = body;

        this.children = [funcName, params, body];
    }

    ASTDef.prototype.type = y.AST.DEF;
    ASTDef.prototype.className = "ast-def";
    ASTDef.prototype.nodeText = "def";

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
