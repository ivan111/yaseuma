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
        default: return this.parseExpression();
        }
    };


    y.Parser.prototype.parseBlock = function () {
        this.nextToken();

        if (this.token.type !== y.TOKEN.EOL) {
            throw "「if 条件:」 のあとは、改行を入れてください";
        }

        this.nextToken();

        var a = [];

        while (this.token.type !== y.TOKEN.END_BLOCK) {
            this.skipEOL();

            if (this.token.type === y.TOKEN.END_BLOCK) {
                break;
            }

            var ast = this.parseStatement();
            a.push(ast);
        }

        this.nextToken();

        return y.ast.createBlockAST(a);
    };


    y.Parser.prototype.parseIf = function () {
        this.nextToken();

        var cond = this.parseExpression();

        if (this.token.type !== y.TOKEN.START_BLOCK) {
            throw "「if 条件」 のあとの':'が抜けています";
        }

        var aIf = this.parseBlock();

        var aElse = null;

        if (this.token.type === y.TOKEN.ELIF) {
            aElse = this.parseIf();
        } else if (this.token.type === y.TOKEN.ELSE) {
            this.nextToken();

            aElse = this.parseBlock();
        }

        return y.ast.createIfAST(cond, aIf, aElse);
    };


    y.Parser.prototype.parseFor = function () {
        this.nextToken();

        if (this.token.type !== y.TOKEN.ID) {
            throw "for のあとは変数名を書いてください";
        }

        var aVar = y.ast.createVarAST(this.token.lexeme);

        this.nextToken();

        if (this.token.type !== y.TOKEN.IN) {
            throw "for に in が見つかりませんでした";
        }

        this.nextToken();

        var aList = this.parseExpression();

        if (this.token.type !== y.TOKEN.START_BLOCK) {
            throw "「for」 のあとの':'が抜けています";
        }

        var body = this.parseBlock();

        return y.ast.createForAST(aVar, aList, body);
    };


    y.Parser.prototype.parseWhile = function () {
        this.nextToken();

        var cond = this.parseExpression();

        if (this.token.type !== y.TOKEN.START_BLOCK) {
            throw "「while 条件」 のあとの':'が抜けています";
        }

        var body = this.parseBlock();

        return y.ast.createWhileAST(cond, body);
    };


    y.Parser.prototype.parseReturn = function () {
        this.nextToken();

        var value = this.parseExpression();

        if (this.token.type !== y.TOKEN.EOL) {
            throw "「return 戻り値」のあとに改行以外の文字があります";
        }

        this.nextToken();

        return y.ast.createReturnAST(value);
    };


    y.Parser.prototype.parseBreak = function () {
        this.nextToken();

        if (this.token.type !== y.TOKEN.EOL) {
            throw "break のあとに改行以外の文字があります";
        }

        this.nextToken();

        return y.ast.createBreakAST();
    };


    y.Parser.prototype.parseContinue = function () {
        this.nextToken();

        if (this.token.type !== y.TOKEN.EOL) {
            throw "continue のあとに改行以外の文字があります";
        }

        this.nextToken();

        return y.ast.createContinueAST();
    };


    y.Parser.prototype.parseDef = function () {
        this.nextToken();

        if (this.token.type !== y.TOKEN.ID) {
            throw "def のあとには関数名を書いてください";
        }

        var funcName = y.ast.createVarAST(this.token.lexeme);

        this.nextToken();

        if (this.token.lexeme !== "(") {
            throw "「def 関数名」 のあとに '(' がありません";
        }

        this.nextToken();

        var params = [];

        if (this.token.lexeme !== ")") {
            for (;;) {
                if (this.token.type !== y.TOKEN.ID) {
                    throw "パラメータには引数名を書いてください";
                }

                var param = y.ast.createVarAST(this.token.lexeme);
                params.push(param);

                this.nextToken();

                if (this.token.lexeme === ")") {
                    break;
                }

                if (this.token.lexeme !== ",") {
                    throw "パラメータリストに ',' が抜けています。";
                }

                this.nextToken();
            }
        }

        this.nextToken();

        var body = this.parseBlock();

        return y.ast.createDefAST(funcName, y.ast.createListAST(params), body);
    };
})();
