(function() {
    "use strict";

    y.ast = {
        createNumberAST: createNumberAST,
        createStringAST: createStringAST,
        createListAST: createListAST,
        createOp2AST: createOp2AST,
        createVarAST: createVarAST,
        createCallAST: createCallAST,
        createIfAST: createIfAST,
        createForAST: createForAST,
        createWhileAST: createWhileAST,
        createReturnAST: createReturnAST,
        createBreakAST: createBreakAST,
        createContinueAST: createContinueAST,
        createBlockAST: createBlockAST,
        createDefAST: createDefAST,

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


    function createNumberAST(num) {
        return {
            type: y.ast.NUMBER,
            number: num,
            exec: execNumber,

            className: "ast-number",
            nodeChar: "N",
            nodeText: "" + num
        };
    }


    function execNumber() {
        return this.number;
    }


    function createStringAST(s) {
        return {
            type: y.ast.STRING,
            s: s,
            exec: execString,

            className: "ast-string",
            nodeChar: "S",
            nodeText: s
        };
    }


    function execString() {
        return this.s;
    }


    function createListAST(items) {
        return {
            type: y.ast.LIST,
            items: items,
            exec: execList,

            className: "ast-list",
            nodeText: "list",
            children: items
        };
    }


    function execList(env) {
        var items = [];

        this.items.forEach(function (item) {
            items.push(item.exec(env));
        });

        return items;
    }


    function createOp2AST(op, lhs, rhs) {
        if (lhs.type === y.ast.NUMBER && rhs.type === y.ast.NUMBER) {
            var num = runOp(op.lexeme, lhs.number, rhs.number);

            return createNumberAST(num);
        }

        return {
            type: y.ast.OP2,
            op: op,
            left: lhs,
            right: rhs,
            exec: execOp2,

            className: "ast-op2",
            nodeChar: op.lexeme,
            children: [lhs, rhs]
        };
    }


    function execOp2(env) {
        var op = this.op.lexeme;
        var right = this.right.exec(env);

        if (op === "=") {
            env.vars(this.left.idName, right);
            return right;
        }

        var left = this.left.exec(env);

        return runOp(op, left, right);
    }


    function createVarAST(idName) {
        var ast = {
            type: y.ast.VAR,
            idName: idName,
            exec: execVar,

            className: "ast-var",
            nodeChar: "V",
            nodeText: idName
        };

        return ast;
    }


    function execVar(env) {
        return env.vars(this.idName);
    }


    function createCallAST(idName, args) {
        return {
            type: y.ast.CALL,
            idName: idName,
            args: args,
            exec: execCall,

            className: "ast-call",
            nodeChar: "C",
            nodeText: idName,
            children: [args]
        };
    }


    function execCall(env) {
        var f = env.vars(this.idName);
        var args = [];

        this.args.items.forEach(function (arg) {
            args.push(arg.exec(env));
        });

        // 組み込み関数
        if (typeof f === "function") {
            return f.apply(null, args);
        }

        if (f.type !== y.ast.DEF) {
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
    }


    function createPassAST() {
        return {
            type: y.ast.PASS,
            exec: execPass,

            className: "ast-pass",
            nodeText: "pass"
        };
    }


    function execPass() {
    }


    function createIfAST(cond, aIf, aElse) {
        aElse = aElse || createPassAST();

        return {
            type: y.ast.IF,
            cond: cond,
            aIf: aIf,
            aElse: aElse,
            exec: execIf,

            className: "ast-keyword",
            nodeText: "if",
            children: [cond, aIf, aElse]
        };
    }


    function execIf(env) {
        if (this.cond.exec(env)) {
            this.aIf.exec(env);
        } else {
            this.aElse.exec(env);
        }
    }


    function createForAST(aVar, aArray, body) {
        return {
            type: y.ast.FOR,
            aVar: aVar,
            aArray: aArray,
            body: body,
            exec: execFor,

            className: "ast-keyword",
            nodeText: "for",
            children: [aVar, aArray, body]
        };
    }


    function execFor(env) {
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
    }


    function createWhileAST(cond, body) {
        return {
            type: y.ast.WHILE,
            cond: cond,
            body: body,
            exec: execWhile,

            className: "ast-keyword",
            nodeText: "while",
            children: [cond, body]
        };
    }


    function execWhile(env) {
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
    }


    function createReturnAST(value) {
        return {
            type: y.ast.RETURN,
            value: value,
            exec: execReturn,

            className: "ast-keyword",
            nodeText: "return",
            children: [value]
        };
    }


    function execReturn(env) {
        var ret = this.value.exec(env);
        throw new ReturnException(ret);
    }


    function ReturnException(returnValue) {
        this.returnValue = returnValue;
        this.name = "ReturnException";
    }


    function createBreakAST() {
        return {
            type: y.ast.BREAK,
            exec: execBreak,

            className: "ast-keyword",
            nodeText: "break"
        };
    }


    function execBreak() {
        throw new BreakException();
    }


    function BreakException() {
        this.name = "BreakException";
    }


    function createContinueAST() {
        return {
            type: y.ast.CONTINUE,
            exec: execContinue,

            className: "ast-keyword",
            nodeText: "continue"
        };
    }


    function execContinue() {
        throw new ContinueException();
    }


    function ContinueException() {
        this.name = "ContinueException";
    }


    function createBlockAST(astList) {
        return {
            type: y.ast.BLOCK,
            astList: astList,
            exec: execBlock,

            className: "ast-block",
            nodeText: "block",
            children: astList
        };
    }


    function execBlock(env) {
        this.astList.forEach(function (ast) {
            ast.exec(env);
        });
    }


    function createDefAST(funcName, params, body) {
        return {
            type: y.ast.DEF,
            funcName: funcName,
            params: params,
            body: body,
            exec: execDef,

            className: "ast-def",
            nodeText: "def",
            children: [funcName, params, body]
        };
    }


    function execDef(env) {
        env.vars(this.funcName.idName, this);
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
