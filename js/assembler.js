(function() {
    "use strict";

    y.assemble = assemble;


    function assemble(codeObj) {
        setLabels(codeObj);
        replaceBreakAndContinue(codeObj);
        replaceJmpLabel(codeObj);
        inst2num(codeObj);
    }


    var RE_DEF_LABEL = /#def_(.*)/;

    function setLabels(codeObj) {
        codeObj.labels = {};

        codeObj.codeForEach(function (inst, lineNo, index) {
            if (helpers.isArray(inst) && inst[0] === "label") {
                var m = RE_DEF_LABEL.exec(inst[1]);

                if (m) {
                    var def = codeObj.defs[m[1]];
                    def.pos = [lineNo, index];
                } else {
                    codeObj.labels[inst[1]] = [lineNo, index];
                }
            }
        });
    }


    var RE_LABEL_START_LOOP = /#(while|for)/;
    var RE_LABEL_END_LOOP = /#end_(while|for)/;

    function replaceBreakAndContinue(codeObj) {
        var lv = 0;
        var breaks = [[]];
        var continues = [[]];

        codeObj.codeForEach(function (inst) {
            if (helpers.isArray(inst)) {
                if (inst[0] === "break") {
                    breaks[lv].push(inst);
                } else if (inst[0] === "cont") {
                    continues[lv].push(inst);
                } else if (inst[0] === "label") {
                    if (RE_LABEL_START_LOOP.test(inst[1])) {
                        lv++;

                        breaks[lv] = breaks[lv] || [];
                        continues[lv] = continues[lv] || [];
                    } else if (RE_LABEL_END_LOOP.test(inst[1])) {
                        breaks[lv].forEach(function (brk) {
                            brk[1] = inst[1];
                        });

                        breaks[lv] = [];

                        lv--;
                    }
                } else if (inst[0] === "jmp" && continues[lv].length !== 0) {
                    if (RE_LABEL_START_LOOP.test(inst[1])) {
                        continues[lv].forEach(function (cnt) {
                            cnt[1] = inst[1];
                        });

                        continues[lv] = [];
                    }
                }
            }
        });

        if (lv !== 0) {
            throw "ループの開始と終了が釣り合ってない";
        }

        breaks.forEach(function (brk) {
            if (brk.length !== 0) {
                throw "can not break";
            }
        });

        continues.forEach(function (cnt) {
            if (cnt.length !== 0) {
                throw "can not continue";
            }
        });
    }


    /*
    function replaceBreakAndContinue(codeObj) {
        var breaks = [];
        var continues = [];
        var lv = 0;

        codeObj.codeForEach(function (inst) {
            if (helpers.isArray(inst)) {
                if (inst[0] === "break") {
                    breaks.push(inst);
                } else if (inst[0] === "continue") {
                    continues.push(inst);
                } else if (inst[0] === "label" && breaks.length !== 0) {
                    if (RE_LABEL_END_LOOP.test(inst[1])) {
                        breaks.forEach(function (brk) {
                            brk[1] = inst[1];
                        });

                        breaks = [];
                    }
                } else if (inst[0] === "jmp" && continues.length !== 0) {
                    if (RE_LABEL_START_LOOP.test(inst[1])) {
                        continues.forEach(function (cnt) {
                            cnt[1] = inst[1];
                        });

                        continues = [];
                    }
                }
            }
        });


        if (breaks.length !== 0) {
            throw "can not break";
        }


        if (continues.length !== 0) {
            throw "can not continue";
        }
    }
    */


    var RE_HAS_LABEL = /jmp|jmp_f|break|cont/;

    function replaceJmpLabel(codeObj) {
        codeObj.codeForEach(function (inst) {
            if (helpers.isArray(inst)) {
                if (inst[0] === "label") {
                    inst[0] = "nop";
                    inst.splice(1, 1);
                } else if (RE_HAS_LABEL.test(inst[0])) {
                    if (typeof inst[1] !== "number") {
                        if (!(inst[1] in codeObj.labels)) {
                            throw "not found label: " + inst[1];
                        }

                        var label = codeObj.labels[inst[1]];
                        inst[1] = label[0];
                        inst[2] = label[1];
                    }
                }
            }
        });
    }


    function inst2num(codeObj) {
        codeObj.codeForEach(function (inst) {
            codeObj.traverseArray(inst, function (node) {
                if (node[0] in y.inst2numMap) {
                    node[0] = y.inst2numMap[node[0]];
                } else {
                    throw "unknown instruction: " + node[0];
                }
            });
        });
    }
})();
