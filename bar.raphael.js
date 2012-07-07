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
            bar_set: this.set(),

            width: this.width,
            height: this.height,
        }; 

        var def_opts = {
            left_gutter: 20,
            right_gutter: 20,
            bottom_gutter: 20,
            top_gutter: 20,
            axis_width: 2,

            bar_width: 20,
            bar_spacing: 5,
            group_spacing: 10,
        };
        graph_obj.opts = $.extend({}, def_opts, opts);

        var init_graph = function () {
            this.paper.clear();

            // draw axis lines on the paper
            var axis_data = {
                x_left: this.opts.left_gutter,
                x_right: this.paper.width - this.opts.right_gutter,
                x_bottom: this.paper.height - this.opts.bottom_gutter,

                y_left: this.opts.left_gutter,
                y_top: this.opts.top_gutter,
                y_bottom: this.paper.height - this.opts.bottom_gutter,
            }

            // move to (x_left, x_bottom) and draw a HLine to (x_right, x_bottom)
            var x_path_string = r.fullfill("M{x_left},{x_bottom}H{x_right}",
                                           axis_data);
            var y_path_string = r.fullfill("M{y_left},{y_top}V{y_bottom}",
                                           axis_data);
            // draw lines and set their width
            var x_line = this.paper.path(x_path_string),
                y_line = this.paper.path(y_path_string);
            x_line.attr("stroke-width", this.opts.axis_width);
            y_line.attr("stroke-width", this.opts.axis_width);
            this.meta_set.push(x_line, y_line)

            this.draw_surface = this.ds = {
                left: this.opts.left_gutter + this.opts.axis_width + this.opts.group_spacing,
                top: this.opts.top_gutter,
                right: this.width - this.opts.right_gutter,
                bottom: this.height - (this.opts.bottom_gutter + this.opts.axis_width)
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
            this.bar_set.clear();

            var grouped = r.is(data[0], "array");
            if (grouped) {
                var group_width = (this.opts.bar_width * data.length) +
                    (this.opts.bar_spacing * (data.length - 1)) + 
                    this.opts.group_spacing;
            }
            else {
                var total_bar_width = this.opts.bar_width + this.opts.bar_spacing;
            }

            var draw_labels = (labels.length == data.length);
            var yscale = this._get_yscale(data, grouped);

            if (!grouped) {
                for (var i = 0; i < data.length; i++) {
                    var bar_height = data[i] * yscale;
                    var bar_y = this.ds.bottom - bar_height;
                    var bar_x = this.ds.left + (total_bar_width * i + 1) + 
                        this.opts.bar_spacing;
                    var bar = this.paper.rect(bar_x, bar_y, this.opts.bar_width,
                                              bar_height);
                    this.bar_set.push(bar);
                }
            }
        };
        graph_obj.draw = $.proxy(draw, graph_obj);

        var get_yscale = function (data, grouped) {
            var max = 0, min = 0;
            if (!grouped) {
                for (var i = 0; i < data.length; i++) {
                    if (data[i] > max) {
                        max = data[i];
                    }
                    if (data[i] < min) {
                        min = data[i];
                    }
                }
            }

            var diff = max - min,
                y_height = this.ds.bottom - this.ds.top,
                y_scale = y_height / diff;

            return y_scale;
        };
        graph_obj._get_yscale = $.proxy(get_yscale, graph_obj);

        return graph_obj.init();
    };
}(Raphael, jQuery));
