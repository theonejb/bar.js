/*
 * bar.raphael.js
 * a raphael.js plugin to draw bar graphs with an extremely simple API and some
 * very specific requirements. see README.md for details
 */

(function (r, $) {
    r.fn.bar = function (opts) {
        // all globals for this particular graph plot are kept here
        // all functions are called with this as their context.
        var graph_obj = {
            paper: this,
            meta_set: this.set(), // holds meta graph objects, like axis lines...
            label_set: this.set(),
            bar_set: this.set(),

            width: this.width,
            height: this.height,
        }; 

        var def_opts = {
            graph: {
                top_gutter: 20,
                right_gutter: 20,
                bottom_gutter: 20,
                left_gutter: 20,
            },

            axis: {
                width: 2
            },

            labels: {
                font: "Terminal Grotesque",
                font_size: 12
            },

            auto_size: true, // auto calculate bar size and spacing b/w elements

            bar: {
                width: 20
            },

            spacing:{
                bar: 5,
                group: 10
            },

            yscale: {
                top_gutter: 50 // added to max value in data to get highest axis tick
            }
        };
        graph_obj.opts = $.extend({}, def_opts, opts);

        var init_graph = function (grouped) {
            if (r.is(grouped, "undefined")) {
                gouped = false;
            }

            this.paper.clear();
            this.meta_set.clear();
            this.label_set.clear();
            this.bar_set.clear();

            // draw axis lines on the paper
            var axis_data = {
                x_left: this.opts.graph.left_gutter,
                x_right: this.paper.width - this.opts.graph.right_gutter,
                x_bottom: this.paper.height - this.opts.graph.bottom_gutter,

                y_left: this.opts.graph.left_gutter,
                y_top: this.opts.graph.top_gutter,
                y_bottom: this.paper.height - this.opts.graph.bottom_gutter,
            }

            // move to (x_left, x_bottom) and draw a HLine to (x_right, x_bottom)
            var x_path_string = r.fullfill("M{x_left},{x_bottom}H{x_right}",
                                           axis_data);
            var y_path_string = r.fullfill("M{y_left},{y_top}V{y_bottom}",
                                           axis_data);
            // draw lines and set their width
            var x_line = this.paper.path(x_path_string),
                y_line = this.paper.path(y_path_string);
            x_line.attr("stroke-width", this.opts.axis.width);
            y_line.attr("stroke-width", this.opts.axis.width);
            this.meta_set.push(x_line, y_line)

            this.draw_surface = this.ds = {
                left: this.opts.graph.left_gutter + this.opts.axis.width,
                top: this.opts.graph.top_gutter,
                right: this.width - this.opts.graph.right_gutter,
                bottom: this.height - (this.opts.graph.bottom_gutter + this.opts.axis.width)
            };

            return this;
        };
        graph_obj.init = $.proxy(init_graph, graph_obj);

        /*
         * draw (data, labels)
         * data: [1, 2, 3] or [[1, 2, 3], [4, 5, 6]] series
         * lables: array of strings. labels.length == data.length
         */
        var draw = function (data, labels) {
            var grouped = r.is(data[0], "array");
            var yscale = $.extend(this.opts.yscale, this.get_yscale(data, grouped));
            if (!grouped) {
                var draw_labels = (labels.length == data.length),
                    label_pos = [];
            }

            this.init(grouped);

            if (this.opts.auto_size) {
                this.opts.spacing = this.auto_space(data.length, grouped);
            }

            var el_width = 0;
            if (grouped) {
                // TODO: calculate group width here
            }
            else {
                el_width = this.opts.spacing.bar + this.opts.bar.width;
            }


            if (!grouped) {
                for (var i = 0; i < data.length; i++) {
                    var bar_height = data[i] * yscale.scale;
                    var bar_y = this.ds.bottom - bar_height;
                    var bar_x = this.ds.left + (el_width * i) + 
                        this.opts.spacing.bar;
                    var bar = this.paper.rect(bar_x, bar_y, this.opts.bar.width,
                                              bar_height);
                    this.bar_set.push(bar);

                    if (draw_labels) {
                        var bar_bbox = bar.getBBox();
                        var bar_midx = bar_bbox.x + 
                            Math.round((bar_bbox.x2-bar_bbox.x)/2);
                        label_pos.push(bar_midx);
                    }
                }
            }

            if (draw_labels) {
                this.draw_labels(labels, label_pos);
            }
        };
        graph_obj.draw = $.proxy(draw, graph_obj);

        var draw_labels = function (labels, pos) {
            var font = this.paper.getFont(this.opts.labels.font);
            for (var i = 0; i < labels.length; i++) {
                var x = pos[i],
                    y = (this.height - this.opts.graph.bottom_gutter +
                         this.opts.axis.width) + Math.floor(this.opts.labels.font_size/2);
                var label = this.paper.text(x, y, labels[i]).attr(
                    "font-size", this.opts.labels.font_size
                );
                /*
                var label = this.paper.print(x, y, labels[i], font);

                // calculate new center position and move label to there
                var bb = label.getBBox();
                var w = bb.x2 - bb.x;
                var x_diff =  -1 * (w/2);
                label.transform("t" + x_diff + ",0");
                */

                this.label_set.push(label);
            }
        };
        graph_obj.draw_labels = $.proxy(draw_labels, graph_obj);

        /*
         * get_yscale ([] data, bool grouped)
         *
         * @param grouped: if grouped, the min/max calc. is done differently
         *
         * @returns {scale, min, max}
         */
        var get_yscale = function (data, grouped) {
            var min, max;
            if (!grouped) {
                min = Math.min.apply(null, data);
                max = Math.max.apply(null, data);
            }

            var diff = (max+this.opts.yscale.top_gutter) - min,
                y_height = this.ds.bottom - this.ds.top,
                y_scale = y_height / diff;

            return {
                scale: y_scale,
                min: min,
                max: (max+this.opts.yscale.top_gutter)
            };
        };
        graph_obj.get_yscale = $.proxy(get_yscale, graph_obj);

        /*
         * auto_sapce (int data_len, bool grouped)
         *
         * @returns null
         */
        var auto_space = function (data_len, grouped) {
            var ds_width = this.ds.right - this.ds.left;
            var spacing = {};

            if (!grouped) {
                var total_bars_width = data_len * this.opts.bar.width,
                    free_space = ds_width - total_bars_width,
                    bar_spacing = Math.floor(free_space/(data_len+1));

                return {bar: bar_spacing};
            }
        };
        graph_obj.auto_space = $.proxy(auto_space, graph_obj);

        return graph_obj.init();
    };
}(Raphael, jQuery));
