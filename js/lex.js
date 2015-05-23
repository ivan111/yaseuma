(function() {
    "use strict";

    window.y = {};

    y.Lex = Lex;

    y.TOKEN = {
        EOF: 256,
        EOL: 257,
        ID: 258,
        NUMBER: 259,
        STRING: 260,

        START_BLOCK: 270,
        END_BLOCK: 271,
        IF: 272,
        ELIF: 273,
        ELSE: 274,
        FOR: 275,
        IN: 276,
        WHILE: 277,
        DEF: 278,
        RETURN: 279,
        BREAK: 280,
        CONTINUE: 281,

        OP_EQ: 300,  // ==
        OP_NOT_EQ: 301,  // !=
        OP_LE: 302,  // <=
        OP_GE: 303   // >=
    };


    var TK = y.TOKEN;

    var RE_SPACE = /^([ \t]+|[ \t]*#.*)/;

    var TOKEN_REGS = [
        { type: TK.START_BLOCK, re: /^(:)/, on: onStartBlock },
        { type: TK.OP_EQ, re: /^(==)/ },
        { type: TK.OP_NOT_EQ, re: /^(!=)/ },
        { type: TK.OP_LE, re: /^(<=)/ },
        { type: TK.OP_GE, re: /^(>=)/ },
        { re: /^([=\+\-\*\/\(\),\[\]<>])/ },  // １文字
        { type: TK.STRING, re: /^("(?:[^"\\]|\\.)*")/ },
        { type: TK.STRING, re: /^('(?:[^'\\]|\\.)*')/ },

        // keywords
        { type: TK.IF, re: /^(if)/ },
        { type: TK.ELIF, re: /^(elif)/ },
        { type: TK.ELSE, re: /^(else)/ },
        { type: TK.FOR, re: /^(for)/ },
        { type: TK.IN, re: /^(in)/ },
        { type: TK.WHILE, re: /^(while)/ },
        { type: TK.DEF, re: /^(def)/ },
        { type: TK.RETURN, re: /^(return)/ },
        { type: TK.BREAK, re: /^(break)/ },
        { type: TK.CONTINUE, re: /^(continue)/ },

        { type: TK.NUMBER, re: /^(\d+)/ },
        { type: TK.ID, re: /^([a-zA-Z_]\w*)/ }
    ];


    // class Lex
    function Lex(src) {
        this.src = src;
        this.lines = src.split("\n");

        this.reset();
    }


    Lex.prototype.reset = function () {
        this.col = 0;
        this.row = 0;
        this.line = this.lines[0];
        this.lv = 0;
    };


    function onEOL(lex) {
        lex.isLineStart = true;
        lex.col = 0;
        lex.row++;
        lex.line = lex.lines[lex.row];

        if (!lex.line) {
            lex.line = "";
        }
    }


    function onStartBlock(lex) {
        //window.console.debug("[LEX] START BLOCK: lv = ", lex.lv + 1);
        lex.lv++;
    }


    function onEndBlock(lex) {
        //window.console.debug("[LEX] END BLOCK: lv = ", lex.lv - 1);
        lex.lv--;
    }


    Lex.prototype.getLv = function () {
        var numSpace = 0;
        var m = this.line.match("^( *)");

        if (m) {
            numSpace = m[1].length;
        }

        if (numSpace % 4 !== 0) {
            throw "LV4 ERROR";
        }

        return numSpace / 4;
    };


    Lex.prototype.getRemain = function () {
        return this.line.substr(this.col);
    };


    Lex.prototype.getChar = function () {
        return this.line.substr(this.col, 1);
    };


    Lex.prototype.skipSpace = function () {
        var m = this.getRemain().match(RE_SPACE);

        if (m) {
            var s = m[1];
            //window.console.debug("[LEX] skip: ", s.length, " (", this.row, ", ", this.col, ")");
            this.col += s.length;
        }
    };


    Lex.prototype.createToken = function (type, lexeme, f) {
        if (typeof type === "undefined") {
            type = lexeme[0].charCodeAt(0);
        }

        var token = {
            type: type,
            lexeme: lexeme,
            col: this.col,
            row: this.row
        };

        this.col += lexeme.length;

        /*
        var s = lexeme;

        if (s === "\n") {
            s = "newline";
        }

        var space = Array(this.lv * 4).join(" ");
        window.console.debug("[LEX]" + space + " type:", token.type, "token:", s, " (", token.row, ", ", token.col, ")");
        */

        if (f) {
            f(this);
        }

        return token;
    };


    Lex.prototype.getToken = function () {
        this.skipSpace();

        if (this.row >= this.lines.length) {
            if (this.lv > 0) {
                return this.createToken(TK.END_BLOCK, "", onEndBlock);
            }

            return this.createToken(TK.EOF, "");
        }

        if (this.col >= this.line.length) {
            return this.createToken(TK.EOL, "\n", onEOL);
        }

        if (this.isLineStart) {
            var lv = this.getLv();

            if (lv > this.lv) {
                throw ["LV ERROR [curLv: ", this.lv, ", newLv:", lv, "]"].join("");
            } else if (lv < this.lv) {
                return this.createToken(TK.END_BLOCK, "", onEndBlock);
            }

            this.isLineStart = false;
        }

        for (var i = 0; i < TOKEN_REGS.length; i++) {
            var d = TOKEN_REGS[i];
            var m = this.getRemain().match(d.re);

            if (m) {
                return this.createToken(d.type, m[1], d.on);
            }
        }

        return this.createToken(TK.EOF, "");
    };
})();
