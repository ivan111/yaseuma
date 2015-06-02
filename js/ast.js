(function() {
    "use strict";

    y.ast = {
        ASTNumber: ASTNumber,
        ASTString: ASTString,
        ASTList: ASTList,
        ASTDict: ASTDict,
        ASTOp1: ASTOp1,
        ASTOp2: ASTOp2,
        ASTVar: ASTVar,
        ASTSlice: ASTSlice,
        ASTCall: ASTCall,
        ASTPass: ASTPass,
        ASTIf: ASTIf,
        ASTFor: ASTFor,
        ASTWhile: ASTWhile,
        ASTReturn: ASTReturn,
        ASTBreak: ASTBreak,
        ASTContinue: ASTContinue,
        ASTBlock: ASTBlock,
        ASTDef: ASTDef,
        ASTMember: ASTMember,
        ASTNew: ASTNew
    };

    y.AST = {};
    helpers.myEnum(y.AST, 300, "NUMBER", "STRING", "LIST", "DICT", "OP1",
            "OP2", "VAR", "SLICE", "CALL", "IF", "FOR", "WHILE", "RETURN", "BREAK",
            "CONTINUE", "DEF", "PASS", "MEMBER", "NEW");


    function setLineNo(obj, startToken, endToken) {
        if (!endToken) {
            endToken = startToken;
        }

        obj.lineNo = startToken.lineNo;
        if (endToken.endLineNo) {
            obj.endLineNo = endToken.endLineNo;
        } else {
            obj.endLineNo = endToken.lineNo;
        }
    }


    function ASTNumber(token, isFloat) {
        if (isFloat) {
            var num = parseFloat(token.lexeme);
        } else {
            num = parseInt(token.lexeme);
        }

        setLineNo(this, token);

        this.token = token;
        this.num = num;

        this.nodeText = "" + num;
    }

    ASTNumber.prototype.type = y.AST.NUMBER;
    ASTNumber.prototype.className = "ast-number";
    ASTNumber.prototype.nodeChar = "N";


    function ASTString(token) {
        var s = token.lexeme;
        s = s.substr(1, s.length - 2);
        s = s.replace(/\\"/g, "\"");
        s = s.replace(/\\'/g, "'");
        s = s.replace(/\\n/g, "\n");
        s = s.replace(/\\t/g, "    ");

        setLineNo(this, token);

        this.token = token;
        this.s = s;

        this.nodeText = s;
    }

    ASTString.prototype.type = y.AST.STRING;
    ASTString.prototype.className = "ast-string";
    ASTString.prototype.nodeChar = "S";


    function ASTList(startToken, endToken, items) {
        setLineNo(this, startToken, endToken);

        this.startToken = startToken;
        this.endToken = endToken;
        this.items = items;

        this.children = items;
    }

    ASTList.prototype.type = y.AST.LIST;
    ASTList.prototype.className = "ast-list";
    ASTList.prototype.nodeText = "list";


    function ASTDict(startToken, endToken, keys, values) {
        setLineNo(this, startToken, endToken);

        this.startToken = startToken;
        this.endToken = endToken;
        this.keys = keys;
        this.values = values;

        var children = [];

        for (var i = 0; i < keys.length; i++) {
            var pair = {
                nodeText: "pair",
                children: [keys[i], values[i]]
            };

            children.push(pair);
        }

        this.children = children;
    }

    ASTDict.prototype.type = y.AST.DICT;
    ASTDict.prototype.className = "ast-dict";
    ASTDict.prototype.nodeText = "dict";


    function ASTOp1(opToken, right) {
        setLineNo(this, opToken);

        this.opToken = opToken;
        this.op = opToken.lexeme;
        this.right = right;

        this.nodeChar = opToken.lexeme;
        this.children = [right];
    }

    ASTOp1.prototype.type = y.AST.OP1;
    ASTOp1.prototype.className = "ast-op";


    function ASTOp2(opToken, left, right) {
        setLineNo(this, left);

        this.opToken = opToken;
        this.op = opToken.lexeme;
        this.left = left;
        this.right = right;

        this.nodeChar = opToken.lexeme;
        this.children = [left, right];
    }

    ASTOp2.prototype.type = y.AST.OP2;
    ASTOp2.prototype.className = "ast-op";


    function ASTVar(token) {
        setLineNo(this, token);

        this.token = token;

        this.idName = token.lexeme;

        this.nodeText = token.lexeme;
    }

    ASTVar.prototype.type = y.AST.VAR;
    ASTVar.prototype.className = "ast-var";
    ASTVar.prototype.nodeChar = "V";


    function ASTSlice(obj, start, end) {
        setLineNo(this, obj);

        this.obj = obj;
        this.start = start;
        this.end = end;

        if (end) {
            this.children = [obj, start, end];
        } else {
            this.children = [obj, start];
        }
    }

    ASTSlice.prototype.type = y.AST.SLICE;
    ASTSlice.prototype.className = "ast-var";
    ASTSlice.prototype.nodeText = "slice";


    function ASTCall(funcName, args) {
        setLineNo(this, funcName);

        this.funcName = funcName.idName;
        this.args = args;

        this.children = [funcName, args];
    }

    ASTCall.prototype.type = y.AST.CALL;
    ASTCall.prototype.className = "ast-call";
    ASTCall.prototype.nodeText = "call";


    // ASTPass や ASTBreak などは、１つのインスタンスだけで
    // 済むように思えるけど、vtreeで表示するときに困るのでダメ
    function ASTPass() {
    }

    ASTPass.prototype.type = y.AST.PASS;
    ASTPass.prototype.className = "ast-pass";
    ASTPass.prototype.nodeText = "pass";


    function ASTIf(cond, body, aElse) {
        if (aElse) {
            setLineNo(this, cond, aElse);
        } else {
            setLineNo(this, cond, body);
        }

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
        setLineNo(this, aVar, body);

        this.aVar = aVar;
        this.aArray = aArray;
        this.body = body;

        this.children = [aVar, aArray, body];
    }

    ASTFor.prototype.type = y.AST.FOR;
    ASTFor.prototype.className = "ast-keyword";
    ASTFor.prototype.nodeText = "for";


    function ASTWhile(cond, body) {
        setLineNo(this, cond, body);

        this.cond = cond;
        this.body = body;

        this.children = [cond, body];
    }

    ASTWhile.prototype.type = y.AST.WHILE;
    ASTWhile.prototype.className = "ast-keyword";
    ASTWhile.prototype.nodeText = "while";


    function ASTReturn(token, value) {
        setLineNo(this, token);

        this.token = token;
        this.value = value;

        if (value) {
            this.children = [value];
        }
    }

    ASTReturn.prototype.type = y.AST.RETURN;
    ASTReturn.prototype.className = "ast-keyword";
    ASTReturn.prototype.nodeText = "return";


    function ASTBreak(token) {
        setLineNo(this, token);

        this.token = token;
    }

    ASTBreak.prototype.type = y.AST.BREAK;
    ASTBreak.prototype.className = "ast-keyword";
    ASTBreak.prototype.nodeText = "break";


    function ASTContinue(token) {
        setLineNo(this, token);

        this.token = token;
    }

    ASTContinue.prototype.type = y.AST.CONTINUE;
    ASTContinue.prototype.className = "ast-keyword";
    ASTContinue.prototype.nodeText = "continue";


    function ASTBlock(startToken, endToken, astList) {
        setLineNo(this, startToken, endToken);

        this.startToken = startToken;
        this.endToken = endToken;
        this.astList = astList;

        this.children = astList;
    }

    ASTBlock.prototype.type = y.AST.BLOCK;
    ASTBlock.prototype.className = "ast-block";
    ASTBlock.prototype.nodeText = "block";


    function ASTDef(funcName, params, body) {
        setLineNo(this, funcName, body);

        this.funcName = funcName.idName;
        this.params = params;
        this.body = body;

        this.children = [funcName, params, body];
    }

    ASTDef.prototype.type = y.AST.DEF;
    ASTDef.prototype.className = "ast-def";
    ASTDef.prototype.nodeText = "def";


    function ASTMember(obj, idAst) {
        setLineNo(this, obj);

        this.obj = obj;
        this.idAst = idAst;

        this.children = [obj, idAst];
    }

    ASTMember.prototype.type = y.AST.MEMBER;
    ASTMember.prototype.className = "ast-member";
    ASTMember.prototype.nodeText = "member";


    function ASTNew(astCall) {
        setLineNo(this, astCall);

        this.astCall = astCall;

        this.children = [astCall];
    }

    ASTNew.prototype.type = y.AST.NEW;
    ASTNew.prototype.className = "ast-new";
    ASTNew.prototype.nodeText = "new";
})();
