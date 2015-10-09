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

    export class VoronoiMapDataPointRenderer extends MapBubbleDataPointRenderer {

        public updateInternal(data: MapData, viewport: IViewport, dataChanged: boolean): MapBehaviorOptions {

            if ((<any>this).svg) {
                (<any>this).svg
                    .style("width", viewport.width.toString() + "px")
                    .style("height", viewport.height.toString() + "px");
            }
            if ((<any>this).clearSvg) {
                (<any>this).clearSvg
                    .style("width", viewport.width.toString() + "px")
                    .style("height", viewport.height.toString() + "px");
            }

            var hasSelection = (<any>this).interactivityService && (<any>this).interactivityService.hasSelection();

            var voronoi = d3.geom.voronoi()
                .x((d: MapBubble) => d.x)
                .y((d: MapBubble) => d.y)
                .clipExtent([[0, 0], [viewport.width, viewport.height]]);

            var voronoiPolygons = voronoi(data.bubbleData);

            var maxRadius = _.max(data.bubbleData, d => d.radius).radius;

            var line = d3.svg.line()
                .x(d => d[0])
                .y(d => d[1]);

            var polyPath = (<any>this).bubbleGraphicsContext
                .selectAll("path")
                .data(voronoiPolygons, d => line(d));

            polyPath.enter().append("path")
                .style({
                    'stroke-width': '2px',
                    'stroke': d => d.point.fill,
                    'fill': d => d.point.fill,
                    'fill-opacity': d => d.point.radius / maxRadius * ColumnUtil.getFillOpacity(d.point.selected, false, hasSelection, false)
                })
                .attr('d', d => line(d));

            polyPath.order();

            polyPath.exit().remove();

            var markers = (<any>this).bubbleGraphicsContext
                .selectAll(".bubble")
                .data(data.bubbleData, (d: MapBubble) => d.identity.getKey());

            markers.enter()
                .append('circle')
                .classed('bubble', true);

            markers
                .style({
                    'fill': (d: MapBubble) => d.fill,
                    'fill-opacity': (d: MapBubble) => ColumnUtil.getFillOpacity(d.selected, false, hasSelection, false),
                    'cursor': 'default'
                })
                .attr({
                    r: d => d.radius / 2,
                    cx: d => d.x,
                    cy: d => d.y,
                });

            markers.exit().remove();

            TooltipManager.addTooltip(markers, (tooltipEvent: TooltipEvent) => tooltipEvent.data.tooltipInfo);

            var behaviorOptions: MapBehaviorOptions = {
                bubbles: markers,
                slices: (<any>this).sliceGraphicsContext.selectAll("path"),
                clearCatcher: (<any>this).clearCatcher,
                dataPoints: data.bubbleData.slice(),
            };
            return behaviorOptions;
        }
    }

    export class VoronoiMap extends Map implements IVisual {

        constructor(options) {
            super(options);

            (<any>this).dataPointRenderer = new VoronoiMapDataPointRenderer();
            (<any>this).enableGeoShaping = false;
        }
    }
}

module powerbi.visuals.plugins {

    export var _VoronoiMap: IVisualPlugin = {
        name: '_VoronoiMap',
        class: '_VoronoiMap',
        capabilities: mapCapabilities,
        create: () => new VoronoiMap({
            behavior: new MapBehavior()
        })
    };

}
