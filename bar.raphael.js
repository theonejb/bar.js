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
            tick_set: this.set(), // holds tick labels for y-axis
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
                top_gutter: 50, // added to max value in data to get highest axis tick
                auto: true // automatically calculate new y-scale on each update
            }
        };
        graph_obj.opts = $.extend(true, {}, def_opts, opts);

        var init_graph = function () {
            this.paper.clear();
            this.meta_set.clear();
            this.label_set.clear();
            this.bar_set.clear();

            this.draw_axis();

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
         * data: [1, 2, 3] or [[1, 2, 3], [4, 5, 6]] series. see docs for more info
         * lables: array of strings. labels.length == data.length
         */
        var draw = function (data, labels) {
            this.init();

            var grouped = this.grouped(data);
            var yscale = this.get_yscale(data, grouped);
            if (!grouped) {
                var draw_labels = (labels.length == data.length),
                    label_pos = [];
            } else {
                // seperate to allow changes to series format in future
                var draw_labels = (labels.length == data.length),
                    label_pos = [];
                var bars_in_group = data[0].length;
            }

            this.draw_axis(yscale);

            if (this.opts.auto_size) {
                if (!grouped) {
                    this.opts.spacing = this.auto_space(data.length, grouped);
                } else {
                    this.opts.spacing = this.auto_space(data.length*data[0].length, grouped, data[0].length);
                }
            }

            var el_width = 0;
            if (grouped) {
                el_width = this.opts.spacing.group + this.opts.bar.width*bars_in_group;
            }
            else {
                el_width = this.opts.spacing.bar + this.opts.bar.width;
            }

            if (!grouped) {
                for (var i = 0; i < data.length; i++) {
                    var bar_data = this.get_bar_params(data[i]);
                    var bar_x = this.ds.left + (el_width * i) + 
                        this.opts.spacing.bar;
                    var bar = this.paper.rect(bar_x, bar_data.y, this.opts.bar.width,
                                              bar_data.height).attr(bar_data.attr);
                    this.bar_set.push(bar);

                    if (draw_labels) {
                        var bar_bbox = bar.getBBox();
                        var bar_midx = bar_bbox.x + 
                            Math.round((bar_bbox.x2-bar_bbox.x)/2);
                        label_pos.push(bar_midx);
                    }
                }
            } else {
                for (var i = 0; i < data.length; i++) {
                    var group_data = this.get_group_params(data[i]);
                    var group_x = this.ds.left + (el_width*i) + this.opts.spacing.group;
                    var group = this.draw_group(group_data, group_x);
                    this.bar_set.push.apply(this.bar_set, group);

                    if (draw_labels) {
                        var group_startx = group[0].getBBox().x;
                        var group_endx = group[group.length-1].getBBox().x2;
                        var group_midx = group_startx + Math.round((group_endx-group_startx)/2);
                        label_pos.push(group_midx);
                    }
                }
            }

            if (draw_labels) {
                this.draw_labels(labels, label_pos);
            }
        };
        graph_obj.draw = $.proxy(draw, graph_obj);

        var update = function (data, animate) {
            if (r.is(animate, "undefined")) {
                animate = true;
            }
            var grouped = this.grouped(data);

            var yscale = this.get_yscale(data, grouped);
            this.draw_axis(yscale);

            if (!grouped) {
                var bar_attr = [];
                for (var i = 0; i < data.length; i++) {
                    var bar_params = this.get_bar_params(data[i]);
                    bar_params = $.extend({
                        y: bar_params.y,
                        height: bar_params.height
                    }, bar_params.attr);
                        
                    bar_attr.push(bar_params);
                }
                // set heights. with animation if required
                for (var i = 0; i < this.bar_set.length; i++) {
                    if (!animate) {
                        this.bar_set[i].attr(bar_attr[i]);
                    } else {
                        this.bar_set[i].animate(bar_attr[i], 500);
                    }
                }
            } else {
                // convert data to a single series format
                var s_data = [];
                for (var i = 0; i < data.length; i++) {
                    s_data = s_data.concat(data[i]);
                }
                this.update(s_data);
            }
        };
        graph_obj.update = $.proxy(update, graph_obj);

        /*
         * draw_group ([] data, int x)
         *
         * @param data: data points objects. see get_group_params([] data)
         * @param x: starting x-axis position
         */
        var draw_group = function (data, x) {
            var bars = [];
            var cur_x_pos = x;
            for (var i = 0; i < data.length; i++) {
                var bar = this.paper.rect(cur_x_pos, data[i].y, data[i].w, data[i].h);
                bar.attr(data[i].attr);
                bars.push(bar);
                cur_x_pos = bar.getBBox().x2;
            }

            return bars;
        };
        graph_obj.draw_group = $.proxy(draw_group, graph_obj);

        var get_group_params = function (data) {
            var data_points = [];
            for (var i = 0; i < data.length; i++) {
                var data_point = this.get_bar_params(data[i]);
                data_point.w = this.opts.bar.width;
                data_point.h = data_point.height;
                data_points.push(data_point);
            }

            return data_points;
        };
        graph_obj.get_group_params = $.proxy(get_group_params, graph_obj);

        /*
         * get_bar_params (array data)
         *
         * @param data: an array containing series data. data format:
         * int
         * OR
         * {
         *  val,
         *  fill,
         *  stroke_width,
         *  title
         * }
         *
         * @returns: {height, y, attr}
         */
        var get_bar_params = function (data) {
            bar_data = this.get_data_point(data);
            $.extend(bar_data, {
                height: bar_data.val * this.opts.yscale.scale,
                y: this.ds.bottom - (bar_data.val * this.opts.yscale.scale),
            });

            var fill = bar_data.attr.fill;
            if (r.is(fill, "string")) {
                bar_data.attr.fill = r.color(fill);
            }
            return bar_data;
        };
        graph_obj.get_bar_params = $.proxy(get_bar_params, graph_obj);

        var draw_labels = function (labels, pos) {
            var font = this.paper.getFont(this.opts.labels.font);
            for (var i = 0; i < labels.length; i++) {
                var x = pos[i],
                    y = (this.height - this.opts.graph.bottom_gutter +
                         this.opts.axis.width) + Math.floor(this.opts.labels.font_size/2);
                var label = this.paper.text(x, y, labels[i]).attr(
                    "font-size", this.opts.labels.font_size
                );

                this.label_set.push(label);
            }
        };
        graph_obj.draw_labels = $.proxy(draw_labels, graph_obj);

        /*
         * draw_axis ([] data, bool grouped)
         *
         * @param data:
         *  if data == "undefined" draws axis lines
         *  else checks if the scale needs to be recalculated. if yes, then draws
         *  ticks as well. returns yscale provided
         */
        var draw_axis = function (yscale) {
            var axis_data = {
                x_left: this.opts.graph.left_gutter,
                x_right: this.paper.width - this.opts.graph.right_gutter,
                x_bottom: this.paper.height - this.opts.graph.bottom_gutter,

                y_left: this.opts.graph.left_gutter,
                y_top: this.opts.graph.top_gutter,
                y_bottom: this.paper.height - this.opts.graph.bottom_gutter
            };

            if (r.is(yscale, "undefined")) {
                // move to (x_left, x_bottom) and draw a HLine to x_right
                var x_path_string = r.fullfill("M{x_left},{x_bottom}H{x_right}", axis_data);
                // move to (y_left, y_top) and draw VLINE to y_bottomh
                var y_path_string = r.fullfill("M{y_left},{y_top}V{y_bottom}", axis_data);
                // draw lines and set their width
                var x_line = this.paper.path(x_path_string),
                y_line = this.paper.path(y_path_string);
                x_line.attr("stroke-width", this.opts.axis.width);
                y_line.attr("stroke-width", this.opts.axis.width);
                this.meta_set.push(x_line, y_line);
            } else {
                if (this.tick_set.length == 0 || // if no ticks have yet been drawn
                    r.is(this.opts.yscale.max, "undefined") || // or yscale.max has not been calculated
                    (yscale.max !== this.opts.yscale.max) // or yscale.max has changed
                   ) {
                    this.opts.yscale = $.extend({}, this.opts.yscale, yscale);

                    this.tick_set.remove().clear();
                    this.tick_set.push(
                        this.paper.print(
                            axis_data.y_left, 
                            axis_data.y_top, 
                            Math.round((axis_data.y_bottom-axis_data.y_top)/yscale.scale), 
                            this.paper.getFont("Terminal Grotesque")
                    ));
                }
            }
        };
        graph_obj.draw_axis = $.proxy(draw_axis, graph_obj);

        /*
         * get_yscale ([] data, bool grouped)
         *
         * @param grouped: if grouped, the min/max calc. is done differently
         *
         * @returns {scale, min, max}
         */
        var get_yscale = function (data, grouped) {
            // see if the scale is to be set automatically
            if (!this.opts.yscale.auto && !r.is(this.opts.yscale.scale, "number")) {
                // calculate scale automatically from min and max vals
                var diff = (this.opts.yscale.max+this.opts.yscale.top_gutter) - 
                    this.opts.yscale.min,
                    y_height = this.ds.bottom - this.ds.top,
                    y_scale = y_height / diff;
                this.opts.yscale.scale = y_scale;
                return this.opts.yscale;
            }

            var min = 0, max = -1;
            if (!grouped) {
                //min = Math.min.apply(null, data);
                for (var i = 0; i < data.length; i++) {
                    var n;
                    if (r.is(data[i], "number")) {
                        n = data[i];
                    } else {
                        n = data[i].val;
                    }
                    if (n > max) {
                        max = n;
                    }
                }
            } else {
                var max = -1;
                for (var i = 0; i < data.length; i++) {
                    for (var j = 0; j < data[i].length; j++) {
                        var data_obj = this.get_data_point(data[i][j]);
                        max = data_obj.val > max ? data_obj.val : max;
                    }
                }
            }

            // check if new scale not required
            if (!r.is(this.opts.yscale, "undefined")) {
                if ((max < this.opts.yscale.max) &&
                    (max > (this.opts.yscale.max - this.opts.yscale.top_gutter))
                   ) {
                    return this.opts.yscale;
                }
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
         * @param data_len: total data elements
         * @param grouped: is data single series or grouped
         * @param num_gelements: if grouped, then number of elements per group
         * @returns null
         */
        var auto_space = function (data_len, grouped, num_gelements) {
            var ds_width = this.ds.right - this.ds.left;
            var spacing = {};

            if (!grouped) {
                var total_bars_width = data_len * this.opts.bar.width,
                    free_space = ds_width - total_bars_width,
                    bar_spacing = Math.floor(free_space/(data_len+1));

                return {bar: bar_spacing};
            } else {
                var total_bars_width = this.opts.bar.width * data_len,
                    free_space = ds_width - total_bars_width,
                    group_spacing = Math.floor(free_space/(data_len/num_gelements+1));
                return {group: group_spacing};
            }
        };
        graph_obj.auto_space = $.proxy(auto_space, graph_obj);

        var grouped = function (data) {
            return (r.is(data[0], "array"))
        }
        graph_obj.grouped = grouped;

        var get_data_point = function (data) {
            if (r.is(data, "number")) {
                return {val: data, attr: {}};
            } else {
                var d_val = data.val;
                var attrs = $.extend({}, data);
                delete data.val;
                return {val: d_val, attr: attrs};
            }
        };
        graph_obj.get_data_point = get_data_point;

        return graph_obj.init();
    };
}(Raphael, jQuery));
