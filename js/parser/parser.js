(function() {
    "use strict";

    y.Parser = Parser;


    // class Parser
    function Parser(lex) {
        this.lex = lex;

        this.nextToken();
    }


    Parser.prototype.error = function (msg, token) {
        var a = [];

        if (token) {
            var pos = [token.lineNo, token.col + 1];

            a.push("(lineNo: ");
            a.push(token.lineNo);
            a.push(", column: ");
            a.push(token.col + 1);
            a.push(") token type = ");
            a.push(token.typeStr);
            a.push(" [");
            a.push(token.lexeme);
            a.push("]:   ");
        } else {
            pos = [this.token.lineNo, this.token.col + 1];

            a.push("(lineNo: ");
            a.push(this.token.lineNo);
            a.push(", column: ");
            a.push(this.token.col + 1);
            a.push("):   ");
        }

        a.push(msg);

        throw new ParseException(pos, token, a.join(""));
    };


    function ParseException(pos, token, msg) {
        this.name = "ParseException";
        this.pos = pos;
        this.token = token;
        this.message = msg;
    }


    ParseException.prototype.toString = function () {
        return this.message;
    };


    Parser.prototype.parse = function () {
        this.skipEOL();

        if (this.token.type === y.TOKEN.EOF) {
            return null;
        }

        return this.parseStatement();
    };


    Parser.prototype.nextToken = function () {
        this.token = this.lex.getToken();

        return this.token;
    };


    Parser.prototype.skipEOL = function () {
        while (this.token.type === y.TOKEN.EOL) {
            this.nextToken();
        }
    };
})();
