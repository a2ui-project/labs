/*
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export {
  createProcessor,
  markComponentSubmitted,
  clearSubmittedState,
  type ActionHandler,
  type DispatchedActionDetails,
} from './processor.js';
export {
  installButtonStateRenderer,
  isOneShotButton,
  isComponentSubmitted,
  type ButtonComponentModelLike,
  type SurfaceDataModelLike,
  type ButtonOneShotConfig,
} from './button-state.js';
export {
  LineApplier,
  type AppliedListener,
  type LineApplyError,
  type ResetListener,
} from './line-applier.js';
export {
  A2uiPaneView,
  type SurfaceChangedDetail,
  type SurfaceSubmissionChangedDetail,
  type SurfaceDismissedDetail,
  type A2uiLinkClickDetail,
} from './a2ui-pane-view.js';
export {openLink, type LinkRouterDeps, type LinkRouteResult} from './link-router.js';
export {
  renderRichMarkdown,
  renderLatexToMathMl,
  renderMermaidSvg,
  escapeHtml,
  type RichMarkdownOptions,
} from './markdown-renderer.js';
export {
  escapeSvgText,
  wrapNodeLabel,
  parseFlowchartLines,
  parseStateDiagramLines,
  renderFlowchartGraphSvg,
  type FlowNode,
  type FlowEdge,
  type FlowSubgraph,
  type ParsedFlowchart,
  type MermaidLayoutOptions,
} from './mermaid-flowchart.js';
export {
  ICON_SVG_PATHS,
  resolveIconSvgPath,
  installIconSvgRenderer,
  installRichTextVariantRenderer,
} from './icon-paths.js';
export {A2uiChartElement, type ChartResolvedProps} from './a2ui-chart.js';
export {
  CHARTS_CATALOG_ID,
  ChartApi,
  ChartPointSchema,
  ChartSeriesSchema,
  DynamicChartSeriesListSchema,
  A2uiChart,
  chartsCatalog,
  chartsSchemaCatalog,
} from './charts-catalog.js';
export {
  A2uiBadgeElement,
  STATUS_TONES,
  normalizeStatusTone,
  type StatusTone,
  type BadgeResolvedProps,
} from './a2ui-badge.js';
export {
  A2uiProgressBarElement,
  computeProgressSegments,
  type ProgressSegmentInput,
  type StatusItemInput,
  type ProgressLegendItem,
  type NormalizedProgressSegment,
  type ProgressBarResolvedProps,
} from './a2ui-progress-bar.js';
export {A2uiCollapsibleElement, type CollapsibleResolvedProps} from './a2ui-collapsible.js';
export {
  A2uiTableElement,
  TABLE_COLUMN_KINDS,
  normalizeTableColumns,
  normalizeTableRows,
  sortTableRows,
  tableSortValue,
  type TableColumn,
  type TableColumnKind,
  type TableColumnAlign,
  type TableRow,
  type TableResolvedProps,
  type TableSortDirection,
  type TableIndexedRow,
} from './a2ui-table.js';
export {
  A2uiStepperElement,
  STEPPER_ORIENTATIONS,
  normalizeStepperSteps,
  clampStepperIndex,
  type StepperOrientation,
  type StepperStep,
  type StepperResolvedProps,
} from './a2ui-stepper.js';
export {
  A2uiChoiceCardsElement,
  CHOICE_CARDS_VARIANTS,
  CHOICE_CARDS_DIRECTIONS,
  normalizeChoiceCardOptions,
  nextChoiceValue,
  type ChoiceCardsVariant,
  type ChoiceCardsDirection,
  type ChoiceCardOption,
  type ChoiceCardsResolvedProps,
} from './a2ui-choice-cards.js';
export {
  STATUS_CATALOG_ID,
  DynamicStatusToneSchema,
  ProgressSegmentSchema,
  DynamicProgressSegmentListSchema,
  StatusItemSchema,
  DynamicStatusItemListSchema,
  TableColumnSchema,
  DynamicTableRowListSchema,
  StepperStepSchema,
  DynamicStepperStepListSchema,
  ChoiceCardOptionSchema,
  DynamicChoiceCardListSchema,
  BadgeApi,
  ProgressBarApi,
  CollapsibleApi,
  TableApi,
  StepperApi,
  ChoiceCardsApi,
  A2uiBadge,
  A2uiProgressBar,
  A2uiCollapsible,
  A2uiTable,
  A2uiStepper,
  A2uiChoiceCards,
  statusCatalog,
  statusSchemaCatalog,
} from './status-catalog.js';
export {
  type ChartVariant,
  type ChartScatterPoint,
  type ChartPointInput,
  type ChartSeriesInput,
  type NormalizedPoint,
  type NormalizedSeries,
  type ChartSelection,
  type NiceScale,
  DEFAULT_CHART_COLORS,
  resolveSeriesColor,
  formatTickNumber,
  computeNiceTicks,
  polarToCartesian,
  describeSectorPath,
  normalizeChartSeries,
} from './chart-math.js';
