(function() {
    "use strict";


    y.Parser.prototype.parsePrimary = function () {
        var obj;

        switch (this.token.type) {
        case y.TOKEN.NUMBER:
            obj = this.parseNumber();
            break;

        case y.TOKEN.STRING:
            obj = this.parseString();
            break;

        case y.TOKEN.ID:
            obj = this.parseID();
            break;

        case "[".charCodeAt(0):
            obj = this.parseList("]");
            break;

        case "{".charCodeAt(0):
            obj = this.parseMap();
            break;

        case "(".charCodeAt(0):
            obj = this.parseParen();
            break;

        case "-".charCodeAt(0):
        case "not".charCodeAt(0):
            obj = this.parseOp1();
            break;

        case y.TOKEN.FLOAT:
            obj = this.parseFloat();
            break;

        case y.TOKEN.NEW:
            obj = this.parseNew();
            break;

        default:
            this.error("予期しないトークン (in parsePrimary)", this.token);
            return null;
        }

        while (this.token.lexeme === ".") {
            obj = this.parseMember(obj);
        }

        while (this.token.lexeme === "[") {
            obj = this.parseSlice(obj);
        }

        return obj;
    };


    // obj.length や obj.method(1, 2) など。
    // 実行時に、指定したメンバーが存在しない場合は、
    // 単純にオブジェクトが第一引数の関数呼び出しになる。
    // (Ex) obj.method(a, b, c)  ==>  method(obj, a, b, c)
    y.Parser.prototype.parseMember = function (obj) {
        this.nextToken();  // skip '.'

        if (this.token.type !== y.TOKEN.ID) {
            this.error("'.' のうしろに予期しないトークンがあります", this.token);
        }

        var id = this.parseID();

        return new y.ast.ASTMember(obj, id);
    };


    y.Parser.prototype.parseNumber = function () {
        var ast = new y.ast.ASTNumber(this.token);

        this.nextToken();

        return ast;
    };


    y.Parser.prototype.parseFloat = function () {
        var ast = new y.ast.ASTNumber(this.token, true);

        this.nextToken();

        return ast;
    };


    y.Parser.prototype.parseString = function () {
        var ast = new y.ast.ASTString(this.token);

        this.nextToken();

        return ast;
    };


    y.Parser.prototype.parseOp1 = function () {
        var startToken = this.token;
        this.nextToken();

        var right = this.parseExpression();
        return new y.ast.ASTOp1(startToken, right);
    };


    y.Parser.prototype.parseParen = function () {
        this.nextToken();

        var ast = this.parseExpression();

        if (this.token.lexeme !== ")") {
            this.error("閉じカッコ ')' が抜けています");
        }

        this.nextToken();

        return ast;
    };


    y.Parser.prototype.parseID = function () {
        var idName = new y.ast.ASTVar(this.token);

        this.nextToken();

        if (this.token.lexeme !== "(") {
            // 変数の参照
            return idName;
        }

        // 関数コール
        var args = this.parseList(")");

        return new y.ast.ASTCall(idName, args);
    };


    y.Parser.prototype.parseList = function (closeChar) {
        var startToken = this.token;
        this.nextToken();

        var items = [];

        if (this.token.lexeme !== closeChar) {
            for (;;) {
                var item = this.parseExpression();
                items.push(item);

                if (this.token.lexeme === closeChar) {
                    break;
                }

                if (this.token.lexeme !== ",") {
                    this.error("',' が抜けています");
                }

                this.nextToken();  // skip ','
            }
        }

        if (this.token.lexeme !== closeChar) {
            this.error(closeChar + " が来るはず", this.token);
        }

        var endToken = this.token;
        this.nextToken();

        return new y.ast.ASTList(startToken, endToken, items);
    };


    y.Parser.prototype.parseMap = function () {
        var startToken = this.token;
        this.nextToken();

        var keys = [];
        var vals = [];

        if (this.token.lexeme !== "}") {
            for (;;) {
                var key = this.parseExpression();
                keys.push(key);

                if (this.token.lexeme !== ":") {
                    this.error("':' が抜けています");
                }

                this.nextToken();  // skip ':'

                var val = this.parseExpression();
                vals.push(val);

                if (this.token.lexeme === "}") {
                    break;
                }

                if (this.token.lexeme !== ",") {
                    this.error("',' が抜けています");
                }

                this.nextToken();  // skip ','
            }
        }

        if (this.token.lexeme !== "}") {
            this.error("'}' が来るはず", this.token);
        }

        var endToken = this.token;
        this.nextToken();

        return new y.ast.ASTDict(startToken, endToken, keys, vals);
    };


    y.Parser.prototype.parseSlice = function (obj) {
        this.nextToken();  // skip '['

        var start = this.parseExpression();
        var end;

        if (this.token.lexeme === ":") {
            this.nextToken();  // skip ':'
            end = this.parseExpression();
        }

        if (this.token.lexeme !== "]") {
            this.error("']' が抜けています", this.token);
        }

        this.nextToken();  // skip ']'

        return new y.ast.ASTSlice(obj, start, end);
    };


    y.Parser.prototype.parseNew = function () {
        this.nextToken();  // skip "new"

        var ast = this.parseID();

        if (ast.type !== y.AST.CALL) {
            this.error("'new' のあとには関数呼び出し形式が来るはず");
        }

        return new y.ast.ASTNew(ast);
    };
})();
