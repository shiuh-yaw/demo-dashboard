// The Spark lightning-bolt lifted from the SPARK26 logo (spark-26-main.svg),
// with the rounded-square container stripped so only the glyph remains.
// Used as a brand-expressive loader in place of a generic ring spinner.

type SparkBoltProps = {
  size?: number;
  className?: string;
  animated?: boolean;
};

export function SparkBolt({
  size = 36,
  className = "",
  animated = false,
}: SparkBoltProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 85 85"
      fill="none"
      aria-hidden
      className={[
        animated ? "spark-bolt-pulse" : "",
        "block",
        className,
      ].join(" ")}
    >
      <path
        d="M58.6229 42.6L43.5356 68.6923C42.272 70.8769 38.9432 69.9846 38.9432 67.4615V49.1692C38.9432 47.4769 37.5717 46.0923 35.861 46.0923H27.8782C25.9827 46.0923 24.7961 44.0462 25.7515 42.4L40.8387 16.3077C42.1024 14.1231 45.4312 15.0154 45.4312 17.5385V35.8308C45.4312 37.5231 46.8027 38.9077 48.5134 38.9077H56.4962C58.3917 38.9077 59.5783 40.9538 58.6229 42.6Z"
        fill="currentColor"
      />
    </svg>
  );
}
