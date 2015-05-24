(function() {
    "use strict";


    var precedenceLeft = { "=": 5, "==": 11, "!=": 11, "<": 11, "<=": 11, ">": 11, ">=": 11, "+": 21, "-": 21, "*": 41 };
    var precedenceRight = { "=": 6, "==": 10, "!=": 10, "<": 10, "<=": 10, ">": 10, ">=": 10, "+": 20, "-": 20, "*": 40 };


    y.Parser.prototype.parseExpression = function () {
        var lhs = this.parsePrimary();

        return this.parseOp2RHS({ left: 0, right: 0 }, lhs);
    };


    y.Parser.prototype.parseOp2RHS = function (exprPrec, lhs) {
        for (;;) {
            var tokPrec = this.getPrecedence();

            if (exprPrec.left > tokPrec.right) {
                return lhs;
            }

            var op = this.token;

            this.nextToken();

            var rhs = this.parsePrimary();

            var nextPrec = this.getPrecedence();

            if (tokPrec.left < nextPrec.right) {
                rhs = this.parseOp2RHS(tokPrec, rhs);
            }

            if (lhs.type === y.AST.NUMBER && rhs.type === y.AST.NUMBER) {
                var num = y.runOp(op.lexeme, lhs.num, rhs.num);

                lhs = new y.ast.ASTNumber(num);
            } else {
                lhs = new y.ast.ASTOp2(op, lhs, rhs);
            }
        }
    };


    y.Parser.prototype.getPrecedence = function () {
        var s = this.token.lexeme;

        if (s in precedenceLeft) {
            return { left: precedenceLeft[s], right: precedenceRight[s] };
        }

        return { left: -1, right: -1 };
    };
})();
