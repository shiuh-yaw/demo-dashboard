/**
 * Flow wordmark - inline SVG so a home link works without an image fetch.
 *
 * Promoted here from apps/flow because connections presents under the same brand
 * and the two must not drift. Pass it to `buildScenarioChrome`'s `siteLogo` (or
 * `SiteHeader`'s `logo`) to replace the default Dynamic mark.
 *
 * `#192A4D` is baked in rather than tokenised: this is a fixed brand mark, not a
 * themeable surface, so a prospect palette must not recolour it.
 */

export function FlowMark() {
  return (
    <svg
      width="120"
      height="34"
      viewBox="0 0 491 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="block"
    >
      <path
        d="M195.152 124V17.44H270.04V34.608H214.392V63.616H265.008V80.044H214.392V124H195.152ZM274.182 17.44H292.534V124H274.182V17.44ZM335.506 125.776C310.79 125.776 296.582 108.46 296.582 85.52C296.582 62.58 310.79 45.264 335.506 45.264C360.222 45.264 374.43 62.58 374.43 85.52C374.43 108.46 360.222 125.776 335.506 125.776ZM335.506 111.124C349.418 111.124 355.634 100.32 355.634 85.52C355.634 70.572 349.418 59.768 335.506 59.768C321.594 59.768 315.23 70.572 315.23 85.52C315.23 100.32 321.594 111.124 335.506 111.124ZM443.399 124L430.967 64.356L418.387 124H390.711L372.507 47.04H391.155L405.215 111.716L418.535 47.04H443.251L456.571 111.716L470.631 47.04H489.279L471.075 124H443.399Z"
        fill="#192A4D"
      />
      <path
        d="M119.583 0.478149H20.4167C9.14376 0.478149 0 9.6219 0 20.8948V120.061C0 131.334 9.14376 140.478 20.4167 140.478H119.583C130.856 140.478 140 131.334 140 120.061V20.8948C140 9.6219 130.856 0.478149 119.583 0.478149ZM95.5647 99.6448H44.4355C38.7917 99.6448 35.2917 93.5198 38.1501 88.6636L63.8315 44.9281C66.6605 40.1156 73.6167 40.1302 76.4165 44.9573L101.865 88.6927C104.694 93.549 101.18 99.6448 95.5647 99.6448Z"
        fill="#192A4D"
      />
    </svg>
  );
}
