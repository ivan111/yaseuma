(function() {
    "use strict";

    y.Parser = Parser;


    // class Parser
    function Parser(lex) {
        this.lex = lex;

        this.nextToken();
    }


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
