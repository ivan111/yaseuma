(function() {
    "use strict";

    y.generate = generate;


    function generate(src) {
        var lex = new y.Lex(src);
        var parser = new y.Parser(lex);

        var env = new y.CodeEnv();

        var ast = parser.parse();
        var astList = [];
        var defs = {};

        while (ast) {
            astList.push(ast);

            setDef(defs, ast);

            ast = parser.parse();
        }

        env.prevDefs = defs;

        astList.forEach(function (a) {
            env.curTmpNo = 0;
            var numCalls = a.getNumCalls(env);
            if (numCalls <= 1) {
                env.noTmpVar = true;
            } else {
                env.noTmpVar = false;
            }

            var result = a.generate(env);

            appendResult(env, a, result);
        });

        env.fill();

        env.code[0].push(["exec", "setup", []]);

        env.prevDefs = undefined;

        return env;
    }


    function setDef(defs, ast) {
        if (ast.type !== y.AST.DEF) {
            return;
        }

        var funcName = ast.funcName;
        defs[funcName] = true;

        ast.body.astList.forEach(function (a) {
            setDef(defs, a);
        });
    }


    function appendResult(env, ast, result) {
        if (result && helpers.isArray(result)) {
            if (result[0] === "exec" || result[0] === "method") {
                env.appendInst(ast.lineNo, result);
            }
        }
    }


    y.ast.ASTNumber.prototype.generate = function () {
        return this.num;
    };


    y.ast.ASTNumber.prototype.getNumCalls = function () {
        return 0;
    };


    y.ast.ASTString.prototype.generate = function () {
        return this.s;
    };


    y.ast.ASTString.prototype.getNumCalls = function () {
        return 0;
    };


    y.ast.ASTList.prototype.generate = function (env) {
        var items = ["list"];

        this.items.forEach(function (item) {
            items.push(item.generate(env));
        });

        return items;
    };


    y.ast.ASTList.prototype.getNumCalls = function (env) {
        var n = 0;

        this.items.forEach(function (item) {
            n += item.getNumCalls(env);
        });

        return n;
    };


    y.ast.ASTDict.prototype.generate = function (env) {
        var pairs = ["dict"];

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

            pairs.push([key, this.values[i].generate(env)]);
        }

        return pairs;
    };


    y.ast.ASTDict.prototype.getNumCalls = function (env) {
        var n = 0;

        this.values.forEach(function (value) {
            n += value.getNumCalls(env);
        });

        return n;
    };


    y.ast.ASTOp1.prototype.generate = function (env) {
        var op = this.op;
        var right = this.right.generate(env);

        return [op, right];
    };


    y.ast.ASTOp1.prototype.getNumCalls = function (env) {
        return this.right.getNumCalls(env);
    };


    y.ast.ASTOp2.prototype.generate = function (env) {
        var op = this.op;
        var left = this.left.generate(env);
        var right = this.right.generate(env);

        if (op === "=") {
            if (this.left.type === y.AST.VAR) {
                env.appendInst(this.lineNo, [op, left, right]);
                return ["var", this.left.idName];
            }

            // field = right
            env.appendInst(this.lineNo, [op, left, right]);
            return left;
        }

        return [op, left, right];
    };


    y.ast.ASTOp2.prototype.getNumCalls = function (env) {
        return this.left.getNumCalls(env) + this.right.getNumCalls(env);
    };


    y.ast.ASTVar.prototype.generate = function () {
        return ["var", this.idName];
    };


    y.ast.ASTVar.prototype.getNumCalls = function () {
        return 0;
    };


    y.ast.ASTSlice.prototype.generate = function (env) {
        var obj = this.obj.generate(env);
        var start = this.start.generate(env);

        if (this.end) {
            return ["slice", obj, start, this.end.generate(env)];
        }

        return ["slice", obj, start];
    };


    y.ast.ASTSlice.prototype.getNumCalls = function (env) {
        var n = this.start.getNumCalls(env);

        if (this.end) {
            n += this.end.getNumCalls(env);
        }

        return n;
    };


    y.ast.ASTCall.prototype.generate = function (env) {
        var args = [];

        this.args.items.forEach(function (arg) {
            args.push(arg.generate(env));
        });

        var funcName = this.funcName;

        if (!env.prevDefs[funcName]) {
            return ["exec", funcName, args];
        }

        var inst = ["call", funcName, args];
        env.appendInst(this.lineNo, inst);

        if (env.noTmpVar) {
            return ["ret_val"];
        }

        var tmp = env.createTmp();

        env.appendInst(this.lineNo, ["=", tmp, ["ret_val"]]);

        return ["var", tmp];
    };


    y.ast.ASTCall.prototype.getNumCalls = function (env) {
        var n = 0;

        this.args.items.forEach(function (arg) {
            n += arg.getNumCalls(env);
        });

        if (!env.prevDefs[this.funcName]) {
            return n;
        }

        return n + 1;
    };


    y.ast.ASTPass.prototype.generate = function () {
        return ["nop"];
    };


    y.ast.ASTPass.prototype.getNumCalls = function () {
        return 0;
    };


    y.ast.ASTIf.prototype.generate = function (env) {
        var id = env.getIfId();

        var cond = this.cond.generate(env);
        env.appendInst(this.lineNo, cond);
        env.appendInst(this.lineNo, ["jmp_f", "#else" + id]);

        this.body.generate(env);

        var elseLineNo = this.body.endLineNo;
        env.appendInst(elseLineNo, ["jmp", "#end_if" + id]);
        env.appendInst(elseLineNo, ["label", "#else" + id]);

        this.aElse.generate(env);

        env.appendInst(this.endLineNo, ["label", "#end_if" + id]);
    };


    y.ast.ASTIf.prototype.getNumCalls = function (env) {
        var n = this.cond.getNumCalls(env);
        n += this.body.getNumCalls(env);
        n += this.aElse.getNumCalls(env);

        return n;
    };


    y.ast.ASTFor.prototype.generate = function (env) {
        var tmp = env.createTmp();

        var arr = this.aArray.generate(env);
        env.appendInst(this.lineNo, ["=", tmp, ["method", arr, "slice", [0]]]);

        var id = env.getForId();

        env.appendInst(this.lineNo, ["label", "#for" + id]);

        env.appendInst(this.lineNo, ["for", this.aVar.generate(env), tmp]);
        env.appendInst(this.lineNo, ["jmp_f", "#end_for" + id]);

        this.body.generate(env);

        env.appendInst(this.endLineNo, ["jmp", "#for" + id]);
        env.appendInst(this.endLineNo, ["label", "#end_for" + id]);
    };


    y.ast.ASTFor.prototype.getNumCalls = function (env) {
        return this.aArray.getNumCalls(env) + this.body.getNumCalls(env);
    };


    y.ast.ASTWhile.prototype.generate = function (env) {
        var id = env.getWhileId();

        env.appendInst(this.lineNo, ["label", "#while" + id]);

        var cond = this.cond.generate(env);
        env.appendInst(this.lineNo, cond);
        env.appendInst(this.lineNo, ["jmp_f", "#end_while" + id]);

        this.body.generate(env);

        env.appendInst(this.endLineNo, ["jmp", "#while" + id]);
        env.appendInst(this.endLineNo, ["label", "#end_while" + id]);
    };


    y.ast.ASTWhile.prototype.getNumCalls = function (env) {
        return this.cond.getNumCalls(env) + this.body.getNumCalls(env);
    };


    y.ast.ASTReturn.prototype.generate = function (env) {
        if (this.value) {
            env.appendInst(this.lineNo, ["ret", this.value.generate(env)]);
        } else {
            env.appendInst(this.lineNo, ["ret"]);
        }
    };


    y.ast.ASTReturn.prototype.getNumCalls = function (env) {
        if (this.value) {
            return this.value.getNumCalls(env);
        }

        return 0;
    };


    y.ast.ASTBreak.prototype.generate = function (env) {
        env.appendInst(this.lineNo, ["break"]);
    };


    y.ast.ASTBreak.prototype.getNumCalls = function () {
        return 0;
    };


    y.ast.ASTContinue.prototype.generate = function (env) {
        env.appendInst(this.lineNo, ["cont"]);
    };


    y.ast.ASTContinue.prototype.getNumCalls = function () {
        return 0;
    };


    y.ast.ASTBlock.prototype.generate = function (env) {
        this.astList.forEach(function (ast) {
            var result = ast.generate(env);

            appendResult(env, ast, result);
        });
    };


    y.ast.ASTBlock.prototype.getNumCalls = function (env) {
        var n = 0;

        this.astList.forEach(function (ast) {
            n += ast.getNumCalls(env);
        });

        return n;
    };


    y.ast.ASTDef.prototype.generate = function (env) {
        var funcName = this.funcName;

        var params = [];

        this.params.items.forEach(function (param) {
            params.push(param.idName);
        });

        env.defs[funcName] = {
            params: params
        };

        env.appendInst(this.lineNo, ["jmp", "#end_def_" + funcName]);
        env.appendInst(this.lineNo, ["label", "#def_" + funcName]);

        this.body.generate(env);

        env.appendInst(this.endLineNo, ["skip", ["ret"]]);
        env.appendInst(this.endLineNo, ["label", "#end_def_" + funcName]);
    };


    y.ast.ASTDef.prototype.getNumCalls = function (env) {
        return this.body.getNumCalls(env);
    };


    y.ast.ASTMember.prototype.generate = function (env) {
        var obj = this.obj.generate(env);

        if (this.idAst.type === y.AST.VAR) {
            return ["field", obj, this.idAst.idName];
        }

        var args = [];

        this.idAst.args.items.forEach(function (arg) {
            args.push(arg.generate(env));
        });

        return ["method", obj, this.idAst.funcName, args];
    };


    y.ast.ASTMember.prototype.getNumCalls = function (env) {
        var n = this.obj.getNumCalls(env);

        if (this.idAst.type !== y.AST.VAR) {
            this.idAst.args.items.forEach(function (arg) {
                n += arg.getNumCalls(env);
            });
        }

        return n;
    };


    y.ast.ASTNew.prototype.generate = function (env) {
        return ["new", this.astCall.generate(env)];
    };


    y.ast.ASTNew.prototype.getNumCalls = function (env) {
        return this.astCall.getNumCalls(env);
    };
})();
