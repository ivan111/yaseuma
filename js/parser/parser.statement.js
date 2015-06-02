(function() {
    "use strict";


    y.Parser.prototype.parseStatement = function () {
        switch (this.token.type) {
        case y.TOKEN.IF: return this.parseIf();
        case y.TOKEN.FOR: return this.parseFor();
        case y.TOKEN.WHILE: return this.parseWhile();
        case y.TOKEN.DEF: return this.parseDef();
        case y.TOKEN.RETURN: return this.parseReturn();
        case y.TOKEN.BREAK: return this.parseBreak();
        case y.TOKEN.CONTINUE: return this.parseContinue();
        default:
            var ast = this.parseExpression();

            if (this.token.lexeme === "=") {
                if (!isAssignable(ast)) {
                    this.error("代入の左側は変数でないといけません");
                }

                return this.parseAssign(ast);
            }

            this.checkEndStatement();
            return ast;
        }
    };


    // 代入できるASTか？
    function isAssignable(ast) {
        if (ast.type === y.AST.VAR) {
            return true;
        } else if (ast.type === y.AST.SLICE && !ast.end) {
            return true;
        } else if (ast.type === y.AST.MEMBER && ast.idAst.type === y.AST.VAR) {
            return true;
        }

        return false;
    }


    // parseBlock を呼び出したあとは、この関数を呼ばなくていい。
    // ブロックの中のステートメントでそれぞれチェックしてますから。
    y.Parser.prototype.checkEndStatement = function () {
        var type = this.token.type;

        if (type === y.TOKEN.EOF || type === y.TOKEN.EOL || type === y.TOKEN.COMMENT) {
            return;
        }

        this.error("予期しないトークン", this.token);
    };


    y.Parser.prototype.parseBlock = function () {
        var startToken = this.token;
        this.nextToken();

        if (this.token.type !== y.TOKEN.EOL) {
            this.error("':'  のあとには、改行を入れてください");
        }

        this.nextToken();

        this.skipEOL();

        if (this.token.type === y.TOKEN.END_BLOCK) {
            this.error("ブロックの中が空です");
        }

        var a = [];

        while (this.token.type !== y.TOKEN.END_BLOCK) {
            this.skipEOL();

            if (this.token.type === y.TOKEN.END_BLOCK) {
                break;
            }

            var ast = this.parseStatement();
            a.push(ast);
        }

        var endToken = this.token;
        this.nextToken();

        return new y.ast.ASTBlock(startToken, endToken, a);
    };


    y.Parser.prototype.parseIf = function () {
        this.nextToken();

        var cond = this.parseExpression();

        if (this.token.type !== y.TOKEN.START_BLOCK) {
            if (this.token.lexeme === "=") {
                this.error("if条件 の中で代入はできません");
            } else {
                this.error("「if 条件」 のあとの ':' が抜けています");
            }
        }

        var aIf = this.parseBlock();

        this.skipEOL();

        var aElse = null;

        if (this.token.type === y.TOKEN.ELIF) {
            aElse = this.parseIf();
        } else if (this.token.type === y.TOKEN.ELSE) {
            this.nextToken();

            aElse = this.parseBlock();
        }

        return new y.ast.ASTIf(cond, aIf, aElse);
    };


    y.Parser.prototype.parseFor = function () {
        this.nextToken();

        var aVar = this.parseExpression();

        if (!isAssignable(aVar)) {
            this.error("for のあとには変数名を書いてください");
        }

        if (this.token.type !== y.TOKEN.IN) {
            this.error("for に in が見つかりませんでした");
        }

        this.nextToken();

        var aList = this.parseExpression();

        if (this.token.type !== y.TOKEN.START_BLOCK) {
            this.error("「for」 のあとの ':' が抜けています");
        }

        var body = this.parseBlock();

        return new y.ast.ASTFor(aVar, aList, body);
    };


    y.Parser.prototype.parseWhile = function () {
        this.nextToken();

        var cond = this.parseExpression();

        if (this.token.type !== y.TOKEN.START_BLOCK) {
            if (this.token.lexeme === "=") {
                this.error("while条件 の中で代入はできません");
            } else {
                this.error("「while 条件」 のあとの ':' が抜けています");
            }
        }

        var body = this.parseBlock();

        return new y.ast.ASTWhile(cond, body);
    };


    y.Parser.prototype.parseReturn = function () {
        var token = this.token;
        this.nextToken();

        if (this.token.type !== y.TOKEN.EOL &&
                this.token.type !== y.TOKEN.EOF) {
            var value = this.parseExpression();
        }

        this.checkEndStatement();

        return new y.ast.ASTReturn(token, value);
    };


    y.Parser.prototype.parseBreak = function () {
        var token = this.token;
        this.nextToken();

        this.checkEndStatement();

        return new y.ast.ASTBreak(token);
    };


    y.Parser.prototype.parseContinue = function () {
        var token = this.token;
        this.nextToken();

        this.checkEndStatement();

        return new y.ast.ASTContinue(token);
    };


    y.Parser.prototype.parseDef = function () {
        this.nextToken();

        if (this.token.type !== y.TOKEN.ID) {
            this.error("def のあとには関数名を書いてください", this.token);
        }

        var funcName = new y.ast.ASTVar(this.token);

        this.nextToken();

        if (this.token.lexeme !== "(") {
            this.error("「def 関数名」 のあとに '(' がありません", this.token);
        }

        var params = this.parseList(")");

        var parser = this;

        params.items.forEach(function (item) {
            if (item.type !== y.AST.VAR) {
                parser.error("パラメータには引数名を書いてください", item.token);
            }
        });

        var body = this.parseBlock();

        return new y.ast.ASTDef(funcName, params, body);
    };


    y.Parser.prototype.parseAssign = function (left) {
        var op = this.token;
        this.nextToken();  // skip "="

        var right = this.parseExpression();

        this.checkEndStatement();

        return new y.ast.ASTOp2(op, left, right);
    };
})();
