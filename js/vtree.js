(function() {
    "use strict";

    window.vtree = vtree;


    var MARGIN = { top: 30, right: 20, bottom: 20, left: 20 };
    var DURATION = 400;

    var lastId = 0;


    function vtree(svg, width, height) {
        var root = null;

        var w = width - (MARGIN.left + MARGIN.right);
        var h = height - (MARGIN.top + MARGIN.bottom);

        var $svg = d3.select(svg);

        my.tree = d3.layout.tree()
            .size([w, h]);

        my.diagonal = d3.svg.diagonal()
            .projection(function(d) { return [d.x, d.y]; });

        my.g = $svg.append("g")
            .attr("transform", tranStr(MARGIN.left, MARGIN.top));

        var zoomListener = d3.behavior.zoom()
            .scaleExtent([0.5, 2])
            .on("zoom", createZoomFunc(my.g));

        $svg
            .classed("vtree", true)
            .style("width", width + "px")
            .style("height", height + "px")
            .call(zoomListener);


        function my() {
        }


        my.root = function (aRoot) {
            if (!arguments.length) {
                return root;
            }

            root = aRoot;

            // transitionの開始位置
            root.x0 = w / 2;
            root.y0 = h / 2;

            return my;
        };


        my.update = update;


        return my;
    }


    // src は更新するときに、基準となる位置
    function update(src) {
        if (!src) {
            src = this.root();
        }

        var nodes = this.tree.nodes(this.root()).reverse();
        var links = this.tree.links(nodes);

        nodes.forEach(function (d) { d.y = d.depth * 50; });

        createNodes(this.g, src, nodes);
        createLinks(this.g, this.diagonal, src, links);

        // transitionのために古い位置を隠しておく
        nodes.forEach(function (d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });

        return this;
    }


    function createNodes(g, src, nodes) {
        var node = g.selectAll("g.node")
            .data(nodes, function (d) { return d.id || (d.id = ++lastId); });


        var nodeEnter = node.enter().append("g")
            .attr("class", getNodeClassName)
            .attr("transform", function () { return tranStr(src.x0, src.y0); })
            .style("opacity", 0);

        nodeEnter.append("circle")
            .attr("r", 10);

        nodeEnter.append("text")
            .attr("dy", ".35em")
            .text(function (d) { return d.nodeChar; });

        nodeEnter.append("text")
            .attr("y", function (d) { return d.children ? -18 : 18; })
            .attr("dy", ".35em")
            .text(function (d) { return d.nodeText; });


        node.transition()
            .duration(DURATION)
            .attr("class", getNodeClassName)
            .attr("transform", function (d) { return tranStr(d.x, d.y); })
            .style("opacity", 1);


        node.exit().transition()
            .duration(DURATION)
            .attr("transform", function () { return tranStr(src.x, src.y); })
            .style("opacity", 0)
            .remove();
    }


    function createLinks(g, diagonal, src, links) {
        var link = g.selectAll("path.link")
            .data(links, function (d) { return d.target.id; });


        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", function () {
                var o = { x: src.x0, y: src.y0 };

                return diagonal({ source: o, target: o });
            })
            .style("opacity", 0);


        link.transition()
            .duration(DURATION)
            .attr("d", diagonal)
            .style("opacity", 1);


        link.exit().transition()
            .duration(DURATION)
            .attr("d", function () {
                var o = { x: src.x, y: src.y };

                return diagonal({ source: o, target: o });
            })
            .style("opacity", 0)
            .remove();
    }


    function getNodeClassName(d) {
        if (!d.className) {
            return "node";
        }

        return "node " + d.className;
    }


    function createZoomFunc(g) {
        return function () {
            var transform = ["translate(", d3.event.translate, ")scale(", d3.event.scale, ")"].join("");

            g.attr("transform", transform);
        };
    }


    function tranStr(x, y) {
         return ["translate(", x, ",", y, ")"].join("");
    }
})();
