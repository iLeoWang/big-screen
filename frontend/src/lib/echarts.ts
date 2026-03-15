import * as echarts from "echarts/core";
import {
    BarChart,
    EffectScatterChart,
    LineChart,
    MapChart,
    PieChart,
    ScatterChart,
} from "echarts/charts";
import {
    DatasetComponent,
    GeoComponent,
    GridComponent,
    LegendComponent,
    TooltipComponent,
    VisualMapComponent,
} from "echarts/components";
import { LabelLayout, UniversalTransition } from "echarts/features";
import { SVGRenderer } from "echarts/renderers";

echarts.use([
    DatasetComponent,
    GeoComponent,
    GridComponent,
    LegendComponent,
    TooltipComponent,
    VisualMapComponent,
    MapChart,
    PieChart,
    LineChart,
    BarChart,
    EffectScatterChart,
    ScatterChart,
    LabelLayout,
    UniversalTransition,
    SVGRenderer,
]);

export { echarts };
export type { EChartsType as ECharts } from "echarts/core";
