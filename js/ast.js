(function() {
    "use strict";

    y.ast = {
        ASTNumber: ASTNumber,
        ASTString: ASTString,
        ASTList: ASTList,
        ASTOp2: ASTOp2,
        ASTVar: ASTVar,
        ASTCall: ASTCall,
        ASTPass: ASTPass,
        ASTIf: ASTIf,
        ASTFor: ASTFor,
        ASTWhile: ASTWhile,
        ASTReturn: ASTReturn,
        ASTBreak: ASTBreak,
        ASTContinue: ASTContinue,
        ASTBlock: ASTBlock,
        ASTDef: ASTDef
    };

    y.AST = {};
    helpers.myEnum(y.AST, 300, "NUMBER", "STRING", "LIST", "DICT", "OP2",
            "VAR", "CALL", "IF", "FOR", "WHILE", "RETURN", "BREAK",
            "CONTINUE", "DEF", "PASS");


    function ASTNumber(num) {
        this.num = num;

        this.nodeText = "" + num;
    }

    ASTNumber.prototype.type = y.AST.NUMBER;
    ASTNumber.prototype.className = "ast-number";
    ASTNumber.prototype.nodeChar = "N";


    function ASTString(s) {
        this.s = s;

        this.nodeText = s;
    }

    ASTString.prototype.type = y.AST.STRING;
    ASTString.prototype.className = "ast-string";
    ASTString.prototype.nodeChar = "S";


    function ASTList(items) {
        this.items = items;

        this.children = items;
    }

    ASTList.prototype.type = y.AST.LIST;
    ASTList.prototype.className = "ast-list";
    ASTList.prototype.nodeText = "list";


    function ASTOp2(op, lhs, rhs) {
        this.op = op;
        this.left = lhs;
        this.right = rhs;

        this.nodeChar = op.lexeme;
        this.children = [lhs, rhs];
    }

    ASTOp2.prototype.type = y.AST.OP2;
    ASTOp2.prototype.className = "ast-op2";


    function ASTVar(idName) {
        this.idName = idName;

        this.nodeText = idName;
    }

    ASTVar.prototype.type = y.AST.VAR;
    ASTVar.prototype.className = "ast-var";
    ASTVar.prototype.nodeChar = "V";


    function ASTCall(idName, args) {
        this.idName = idName;
        this.args = args;

        this.nodeText = idName;
        this.children = [args];
    }

    ASTCall.prototype.type = y.AST.CALL;
    ASTCall.prototype.className = "ast-call";
    ASTCall.prototype.nodeChar = "C";


    // ASTPass や ASTBreak などは、１つのインスタンスだけで
    // 済むように思えるけど、vtreeで表示するときに困るのでダメ
    function ASTPass() {
    }

    ASTPass.prototype.type = y.AST.PASS;
    ASTPass.prototype.className = "ast-pass";
    ASTPass.prototype.nodeText = "pass";


    function ASTIf(cond, body, aElse) {
        aElse = aElse || new ASTPass();

        this.cond = cond;
        this.body = body;
        this.aElse = aElse;

        this.children = [cond, body, aElse];
    }

    ASTIf.prototype.type = y.AST.IF;
    ASTIf.prototype.className = "ast-keyword";
    ASTIf.prototype.nodeText = "if";


    function ASTFor(aVar, aArray, body) {
        this.aVar = aVar;
        this.aArray = aArray;
        this.body = body;

        this.children = [aVar, aArray, body];
    }

    ASTFor.prototype.type = y.AST.FOR;
    ASTFor.prototype.className = "ast-keyword";
    ASTFor.prototype.nodeText = "for";


    function ASTWhile(cond, body) {
        this.cond = cond;
        this.body = body;

        this.children = [cond, body];
    }

    ASTWhile.prototype.type = y.AST.WHILE;
    ASTWhile.prototype.className = "ast-keyword";
    ASTWhile.prototype.nodeText = "while";


    function ASTReturn(value) {
        this.value = value;

        this.children = [value];
    }

    ASTReturn.prototype.type = y.AST.RETURN;
    ASTReturn.prototype.className = "ast-keyword";
    ASTReturn.prototype.nodeText = "return";


    function ASTBreak() {
    }

    ASTBreak.prototype.type = y.AST.BREAK;
    ASTBreak.prototype.className = "ast-keyword";
    ASTBreak.prototype.nodeText = "break";


    function ASTContinue() {
    }

    ASTContinue.prototype.type = y.AST.CONTINUE;
    ASTContinue.prototype.className = "ast-keyword";
    ASTContinue.prototype.nodeText = "continue";


    function ASTBlock(astList) {
        this.astList = astList;

        this.children = astList;
    }

    ASTBlock.prototype.type = y.AST.BLOCK;
    ASTBlock.prototype.className = "ast-block";
    ASTBlock.prototype.nodeText = "block";


    function ASTDef(funcName, params, body) {
        this.funcName = funcName;
        this.params = params;
        this.body = body;

        this.children = [funcName, params, body];
    }

    ASTDef.prototype.type = y.AST.DEF;
    ASTDef.prototype.className = "ast-def";
    ASTDef.prototype.nodeText = "def";
})();
