(function() {
    "use strict";


    y.Parser.prototype.parsePrimary = function () {
        switch (this.token.type) {
        case y.TOKEN.NUMBER: return this.parseNumber();
        case y.TOKEN.STRING: return this.parseString();
        case "-".charCodeAt(0): return this.parseMinus();
        case "(".charCodeAt(0): return this.parseParen();
        case y.TOKEN.ID: return this.parseID();
        case "[".charCodeAt(0): return this.parseList();
        default: throw "こんなトークンが来るとは思ってませんでした: " + this.token.lexeme;
        }
    };


    y.Parser.prototype.parseNumber = function () {
        var num = parseInt(this.token.lexeme);
        var ast = y.ast.createNumberAST(num);

        this.nextToken();

        return ast;
    };


    y.Parser.prototype.parseString = function () {
        var s = this.token.lexeme;
        s = s.substr(1, s.length - 2);
        s = s.replace(/\\"/g, "\"");
        s = s.replace(/\\'/g, "'");
        s = s.replace(/\\n/g, "\n");
        s = s.replace(/\\t/g, "    ");
        var ast = y.ast.createStringAST(s);

        this.nextToken();

        return ast;
    };


    y.Parser.prototype.parseMinus = function () {
        this.nextToken();

        if (this.token.type !== y.TOKEN.NUMBER) {
            throw "-のあとだから、数値が来ると思ってました";
        }

        var num = parseInt(this.token.lexeme);
        var ast = y.ast.createNumberAST(-num);

        this.nextToken();

        return ast;
    };


    y.Parser.prototype.parseParen = function () {
        this.nextToken();

        var ast = this.parseExpression();

        if (this.token.lexeme !== ")") {
            throw "閉じカッコ ')' が抜けています。";
        }

        this.nextToken();

        return ast;
    };


    y.Parser.prototype.parseID = function () {
        var idName = this.token.lexeme;

        this.nextToken();

        if (this.token.lexeme !== "(") {
            // 変数の参照
            return y.ast.createVarAST(idName);
        }

        // 関数コール
        this.nextToken();
        var args = [];

        if (this.token.lexeme !== ")") {
            for (;;) {
                var arg = this.parseExpression();
                args.push(arg);

                if (this.token.lexeme === ")") {
                    break;
                }

                if (this.token.lexeme !== ",") {
                    throw "引数リストに ',' が抜けています。";
                }

                this.nextToken();
            }
        }

        this.nextToken();

        return y.ast.createCallAST(idName, y.ast.createListAST(args));
    };


    y.Parser.prototype.parseList = function () {
        this.nextToken();

        var items = [];

        if (this.token.lexeme !== "]") {
            for (;;) {
                var item = this.parseExpression();
                items.push(item);

                if (this.token.lexeme === "]") {
                    break;
                }

                if (this.token.lexeme !== ",") {
                    throw "配列アイテムに ',' が抜けています。";
                }

                this.nextToken();
            }
        }

        this.nextToken();

        return y.ast.createListAST(items);
    };
})();
