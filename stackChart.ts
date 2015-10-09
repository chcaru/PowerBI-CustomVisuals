/*
The MIT License (MIT)

Copyright (c) 2015 Chris Caruso

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

module powerbi.visuals {

	export interface StreamChartDataPoint extends LineChartDataPoint {
        stackedValue: number;
        stackedValueBelow: number;
    }

    export class StackChart extends LineChart {

        protected dataView: DataView;
        protected previousInterpolationMode: string;

        constructor(options: CartesianVisualConstructorOptions) {

            var streamOptions: LineChartConstructorOptions = options;

            this.previousInterpolationMode = null;

            super(streamOptions);

			this.initialize();
        }

        public setData(dataViews: DataView[]): void {
            super.setData(dataViews);

            this.dataView = dataViews[0];

            var stack = d3.layout.stack()
                .values((d: LineChartSeries) => d.data)
                .x((d: LineChartDataPoint) => (<any>this).getXValue(d))
                .y((d: LineChartDataPoint) => d.value)
                .out((d: StreamChartDataPoint, y0: number, y: number) => {
                    d.stackedValueBelow = y0;
                    d.stackedValue = y0 + y;
                    d.value = d.stackedValue;
                });

            (<any>this).data.series = stack((<any>this).data.series);
        }

		private initialize() {

			var superRenderNew = (<any>this).renderNew;

			(<any>this).renderNew = (duration: number) => {
	            var data = (<any>this).clippedData ? (<any>this).clippedData : (<any>this).data;
	            if (!data)
	                return;

	            var margin = (<any>this).margin;
	            var viewport = (<any>this).currentViewport;
	            var height = viewport.height - (margin.top + margin.bottom);

	            var xScale = (<any>this).xAxisProperties.scale;
	            var yScale = (<any>this).yAxisProperties.scale;

	            var hasSelection = data.hasSelection;

	            var area = d3.svg.area()
	                .x((d: StreamChartDataPoint) => xScale((<any>this).getXValue(d)))
	                .y0((d: StreamChartDataPoint) => {
	                    var y0 = yScale(d.stackedValueBelow);
	                    return y0 <= height ? y0 : height;
	                })
	                .y1((d: StreamChartDataPoint) => yScale(d.stackedValue))
	                .defined((d: StreamChartDataPoint) => d.stackedValue !== null)
	                .interpolate('cardinal');


	            var line = d3.svg.line()
	                .x((d: StreamChartDataPoint) => xScale((<any>this).getXValue(d)))
	                .y((d: StreamChartDataPoint) => {
	                    var y0 = yScale(d.stackedValue);
	                    return y0 <= height ? y0 : height;
	                })
	                .defined((d: StreamChartDataPoint) => d.stackedValue !== null)
	                .interpolate('cardinal');

	            var extraLineShift = (<any>this).extraLineShift();

	            (<any>this).mainGraphicsContext
	                .attr('transform', SVGUtil.translate(extraLineShift, 0));

	            (<any>this).mainGraphicsContext
	                .attr('height', (<any>this).getAvailableHeight())
	                .attr('width', (<any>this).getAvailableWidth());

	            (<any>this).toolTipContext
	                .attr('transform', SVGUtil.translate(extraLineShift, 0));

	            var areas = (<any>this).mainGraphicsContext.selectAll('.catArea').data(data.series, (d: LineChartSeries) => d.identity.getKey());
	            areas.enter()
	                .append('path')
	                .classed('catArea', true);

	            areas
	                .style('fill', (d: LineChartSeries) => d.color)
	                .style('fill-opacity', (d: LineChartSeries) => (hasSelection && !d.selected) ? LineChart.DimmedAreaFillOpacity : LineChart.AreaFillOpacity)
	                .transition()
	                .ease('linear')
	                .duration(duration)
	                .attr('d', (d: LineChartSeries) => area(d.data));

	            areas.exit()
	                .remove();

	            var lineSeries = data.series.slice();

	            var bottomSeries = <any>_.min(lineSeries, s => _.reduce((<any>s).data, (i, d) => i + (<StreamChartDataPoint>d).stackedValueBelow, 0));

	            var bottomLineSeries: LineChartSeries = {
	                key: bottomSeries.key + bottomSeries.key,
	                lineIndex: lineSeries.length,
	                color: bottomSeries.color,
	                xCol: bottomSeries.xCol,
	                yCol: bottomSeries.yCol,
	                identity: bottomSeries.identity,
	                selected: bottomSeries.selected,
	                data: _.map(bottomSeries.data, (d: any) => <StreamChartDataPoint>{
	                    categoryValue: d.categoryValue,
	                    value: (<StreamChartDataPoint>d).stackedValueBelow,
	                    stackedValue: (<StreamChartDataPoint>d).stackedValueBelow,
	                    stackedValueBelow: (<StreamChartDataPoint>d).stackedValueBelow,
	                    categoryIndex: d.categoryIndex,
	                    seriesIndex: lineSeries.length,
	                    key: d.key + d.key
	                })
	            };

	            var lines = (<any>this).mainGraphicsContext.selectAll(".line").data(lineSeries, (d: LineChartSeries) => d.key === bottomLineSeries.key ? d.key : d.identity.getKey());
	            lines.enter()
	                .append('path')
	                .classed('line', true);
	            lines
	                .style('stroke', (d: LineChartSeries) => d.color)
	                .style('stroke-opacity', (d: LineChartSeries) => ColumnUtil.getFillOpacity(d.selected, false, hasSelection, false))
	                .transition()
	                .ease('linear')
	                .duration(duration)
	                .attr('d', (d: LineChartSeries) => line(d.data));
	            lines.exit()
	                .remove();

	            var interactivityLines;
	            if ((<any>this).interactivityService) {
	                interactivityLines = (<any>this).mainGraphicsContext.selectAll(".interactivity-line").data(lineSeries, (d: LineChartSeries) => d.key === bottomLineSeries.key ? d.key : d.identity.getKey());
	                interactivityLines.enter()
	                    .append('path')
	                    .classed('interactivity-line', true);
	                interactivityLines
	                    .attr('d', (d: LineChartSeries) => {
	                        return line(d.data);
	                    });
	                interactivityLines.exit()
	                    .remove();
	            }

	            var dotGroups = (<any>this).mainGraphicsContext.selectAll('.cat')
	                .data(data.series, (d: LineChartSeries) => d.identity.getKey());

	            dotGroups.enter()
	                .append('g')
	                .classed('cat', true);

	            dotGroups.exit()
	                .remove();

	            var dots = dotGroups.selectAll('.dot')
	                .data((series: LineChartSeries) => {
	                    return series.data.filter((value: LineChartDataPoint, i: number) => {
	                        return (<any>this).shouldDrawCircle(series, i);
	                    });
	                }, (d: LineChartDataPoint) => d.key);
	            dots.enter()
	                .append('circle')
	                .classed('dot', true);
	            dots
	                .style('fill', function () {
	                    var lineSeries = d3.select(this.parentNode).datum();
	                    return lineSeries.color;
	                })
	                .style('fill-opacity', function () {
	                    var lineSeries = d3.select(this.parentNode).datum();
	                    return ColumnUtil.getFillOpacity(lineSeries.selected, false, hasSelection, false);
	                })
	                .transition()
	                .duration(duration)
	                .attr({
	                    cx: (d: LineChartDataPoint, i: number) => xScale((<any>this).getXValue(d)),
	                    cy: (d: LineChartDataPoint, i: number) => yScale(d.value),
	                    r: 4
	                });
	            dots.exit()
	                .remove();
	
	            if (data.dataLabelsSettings.show) {
	                var layout = dataLabelUtils.getLineChartLabelLayout(xScale, yScale, data.dataLabelsSettings, data.isScalar, (<any>this).yAxisProperties.formatter);
	                var dataPoints: LineChartDataPoint[] = [];

	                for (var i = 0, ilen = data.series.length; i < ilen; i++) {
	                    Array.prototype.push.apply(dataPoints, data.series[i].data);
	                }

	                dataLabelUtils.drawDefaultLabelsForDataPointChart(dataPoints, (<any>this).mainGraphicsSVG, layout, (<any>this).currentViewport, duration > 0, duration);
	                (<any>this).mainGraphicsSVG.select('.labels').attr('transform', SVGUtil.translate(extraLineShift, 0));
	            }
	            else {
	                dataLabelUtils.cleanDataLabels((<any>this).mainGraphicsSVG);
	            }

				var behaviorOptions = undefined;
				var dataPointsToBind = undefined;

	            if ((<any>this).interactivityService) {
	                var seriesTooltipApplier = (tooltipEvent: TooltipEvent) => {
	                    var pointX: number = tooltipEvent.elementCoordinates[0];
	                    return LineChart.getTooltipInfoByPointX(this, tooltipEvent.data, pointX);
	                };
	                TooltipManager.addTooltip(interactivityLines, seriesTooltipApplier, true);
	                TooltipManager.addTooltip(areas, seriesTooltipApplier, true);
	                TooltipManager.addTooltip(dots, (tooltipEvent: TooltipEvent) => tooltipEvent.data.tooltipInfo, true);

	                dataPointsToBind = lineSeries.slice();
	                for (var i = 0, ilen = data.series.length; i < ilen; i++) {
	                    dataPointsToBind = dataPointsToBind.concat(lineSeries[i].data);
	                }
	                behaviorOptions = {
	                    dataPoints: dataPointsToBind,
	                    lines: lines,
	                    interactivityLines: interactivityLines,
	                    dots: dots,
	                    areas: areas,
	                    background: d3.selectAll((<any>this).element.toArray())
	                };
	            }

				return { dataPoints: dataPointsToBind, behaviorOptions: behaviorOptions };
	        }
		}
    }

	export class StackCartesianChart extends CartesianChart implements IVisual {

		public update(options: VisualUpdateOptions) {

            if ((<any>this).layers.length === 0)
			    (<any>this).layers = this.createLayers(options.dataViews);

			super.update(options);
		}

		protected createLayers(dataViews: DataView[]) {
			var layers = [];

			var objects: DataViewObjects;
            if (dataViews && dataViews.length > 0) {
                var dataViewMetadata = dataViews[0].metadata;
                if (dataViewMetadata)
                    objects = dataViewMetadata.objects;
            }

			var cartesianOptions: CartesianVisualConstructorOptions = {
                isScrollable: (<any>this).isScrollable,
                animator: (<any>this).animator,
                interactivityService: (<any>this).interactivityService,
            };

			var stackChart = new StackChart(cartesianOptions);

			layers.push(stackChart);

			var cartesianInitOptions = <CartesianVisualInitOptions>Prototype.inherit((<any>this).visualInitOptions);
            cartesianInitOptions.svg = (<any>this).axisGraphicsContextScrollable;
            cartesianInitOptions.cartesianHost = {
                updateLegend: data => (<any>this).legend.drawLegend(data, (<any>this).currentViewport),
                getSharedColors: () => (<any>this).sharedColorPalette,
            };

			stackChart.init(cartesianInitOptions);

			return layers;
		}
	}
}

module powerbi.visuals.plugins {

	export var _StackChart: IVisualPlugin = {
        name: '_StackChart',
        class: '_StackChart',
        capabilities: capabilities.lineChart,
        create: () => new StackCartesianChart({
			chartType: <any>'Stack',
			isScrollable: true,
			animator: new BaseAnimator(),
			behavior: new CartesianChartBehavior([new LineChartWebBehavior()]),
			seriesLabelFormattingEnabled: true
            })
    };

}
