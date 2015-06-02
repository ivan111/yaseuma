(function() {
    "use strict";

    y.Env = Env;
    y.createTopLevelEnv = createTopLevelEnv;


    function Env(parent) {
        this.parent = parent;
        this.varsMap = {};
        this.varsList = [];

        if (parent) {
            var top = this.getTopLevelEnv();
        } else {
            top = this;
        }

        if (top.notifyNewEnv) {
            top.notifyNewEnv();
        }
    }


    function createTopLevelEnv() {
        var env = new Env();

        helpers.createEvent(env, "ChangeVar");
        helpers.createEvent(env, "NewEnv");
        helpers.createEvent(env, "DeleteEnv");

        return env;
    }



    Env.prototype.vars = function (varName, varValue) {
        if (arguments.length <= 1) {
            return this.refVar(varName);
        }

        if (varName in this.varsMap) {
            var flagNew = false;
        } else {
            flagNew = true;
            this.varsList.push(varName);
        }

        this.varsMap[varName] = varValue;
        var i = this.varsList.indexOf(varName);

        var top = this.getTopLevelEnv();

        if (top.notifyChangeVar) {
            top.notifyChangeVar(varName, varValue, flagNew, i);
        }

        return this;
    };


    Env.prototype.varsForEach = function (callback) {
        var varsMap = this.varsMap;

        this.varsList.forEach(function (varName) {
            callback(varName, varsMap[varName]);
        });
    };


    Env.prototype.refVar = function (varName) {
        if (varName in this.varsMap) {
            return this.varsMap[varName];
        }

        if (this.parent) {
            return this.parent.refVar(varName);
        }

        throw "undefined variable: " + varName;
    };


    Env.prototype.getTopLevelEnv = function () {
        if (!this.parent) {
            return this;
        }

        return this.parent.getTopLevelEnv();
    };
})();
