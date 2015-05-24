(function() {
    "use strict";

    window.yaseuma = yaseuma;
    window.stepRun = stepRun;
    window.loadSrc = loadSrc;


    var vt;
    var parser;
    var ast;
    var env;
    var varsTable;
    var myConsole;
    var errMessage;
    var consoleText = "";


    function yaseuma() {
        myConsole = document.getElementById("console");
        varsTable = document.getElementById("vars-table");
        errMessage = document.getElementById("err-message");

        var svg = document.getElementById("ast-svg");

        vt = vtree(svg, 840, 600);

        loadSrc();
    }


    function getSrc() {
        var srcDom = document.getElementById("src");

        return srcDom.value;
    }


    function stepRun() {
        if (ast) {
            ast.exec(env);
        }

        try {
            ast = parser.parse();
        } catch (e) {
            errMessage.innerHTML = e;
        }

        if (ast) {
            vt
                .root(ast)
                .update();
        } else {
            vt
                .root({ nodeText: "EOF" })
                .update();
        }
    }


    function loadSrc() {
        var src = getSrc();

        consoleText = "";
        myConsole.innerHTML = "";

        env = y.createTopLevelEnv();
        env.vars("print", function (s) {
            consoleText += s.toString() + "\n";
            myConsole.innerHTML = consoleText;

            myConsole.scrollTop = myConsole.scrollHeight;
        });

        var top = env;

        // トップレベル環境の組み込み関数を変数テーブルに表示させないために、余分な環境を作る
        env = new y.Env(top);

        top.addNewEnvListener(onNewEnv);
        top.addDeleteEnvListener(onDeleteEnv);
        top.addChangeVarListener(onChangeVar);

        var lex = new y.Lex(src);
        parser = new y.Parser(lex);

        try {
            ast = parser.parse();
        } catch (e) {
            errMessage.innerHTML = e;
        }

        if (ast) {
            vt
                .root(ast)
                .update();
        } else {
            vt
                .root({})
                .update();
        }
    }



    function onNewEnv() {
        for (var i = varsTable.rows.length - 1; i > 0; i--) {
            varsTable.deleteRow(i);
        }
    }


    function onDeleteEnv(e) {
        onNewEnv();

        e.varsForEach(function (varName, varValue) {
            onChangeVar(varName, varValue, true, -1);
        });
    }


    function onChangeVar(varName, varValue, flagNew, index) {
        if (flagNew) {
            index = varsTable.rows.length - 1;
            var tr = varsTable.insertRow(-1);
            tr.className = "vars-" + index;
            tr.insertCell(0);
            tr.insertCell(1);
        } else {
            tr = varsTable.getElementsByClassName("vars-" + index)[0];
        }

        if (varValue.type === y.AST.DEF) {
            var val = "[function " + varValue.funcName.idName + "]";
        } else {
            val = varValue.toString();
        }

        tr.childNodes[0].innerHTML = varName;
        tr.childNodes[1].innerHTML = val;
    }
})();
