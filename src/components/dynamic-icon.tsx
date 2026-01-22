import type { FC, SVGProps } from "react";

type DynamicIconProps = {
  /** Width of the icon */
  width?: number | string;
  /** Height of the icon */
  height?: number | string;
  /** Additional CSS classes */
  className?: string;
};

/**
 * Dynamic Icon Component
 *
 * Displays the Dynamic icon (logo without text) with customizable size.
 *
 * @example
 * ```tsx
 * <DynamicIcon width={32} height={32} />
 * ```
 */
export const DynamicIcon: FC<DynamicIconProps> = ({
  width = 32,
  height = 32,
  className = "",
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 102 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Dynamic"
    >
      <mask
        id="dynamic-icon-mask"
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="102"
        height="100"
        style={{ maskType: "luminance" }}
      >
        <path d="M101.871 0H0V99.5491H101.871V0Z" fill="white" />
      </mask>
      <g mask="url(#dynamic-icon-mask)">
        <path
          d="M43.9405 14.1966C42.0577 15.899 40.2184 17.587 38.3791 19.2462C29.8198 27.0081 21.2461 34.7845 12.6868 42.5464C10.7172 44.321 8.68962 46.0379 6.21308 47.0766C3.27309 48.3174 1.5931 47.5383 0.651729 44.4509C-0.666195 40.1226 0.0434567 36.0974 2.57793 32.3751C4.75033 29.2155 7.47307 26.5753 10.2827 24.0216C14.7579 19.9387 19.262 15.899 23.824 11.9315C25.8226 10.1857 28.0095 8.59873 30.6743 8.06492C38.6688 6.49233 43.7522 13.9802 43.9549 14.1966H43.9405Z"
          fill="#4779FF"
        />
        <path
          d="M5.50342 53.7132C10.3696 52.3426 14.0048 49.3273 17.553 46.1533C28.8785 36.0541 40.175 25.9549 51.5439 15.9279C54.0494 13.7205 56.6852 11.5996 59.4804 9.7385C63.0286 7.38683 66.881 7.04057 70.69 9.29125C72.0658 10.0992 73.4127 11.037 74.5279 12.1623C78.3947 16.0721 82.2327 20.0541 85.9547 24.1082C89.923 28.4076 93.8188 32.7791 97.6133 37.2227C98.9167 38.752 99.9884 40.5266 100.857 42.33C102.494 45.6772 102.074 48.9955 100.075 52.1262C98.2939 54.9252 95.8898 57.2191 93.4278 59.3976C83.7678 67.9243 74.1224 76.4509 64.3465 84.862C61.7252 87.1271 58.8431 89.147 55.8597 90.936C50.2549 94.312 44.6356 93.8936 39.5232 89.8972C36.5543 87.5744 33.7446 84.963 31.1957 82.2074C22.9695 73.2913 14.8882 64.2597 6.74893 55.257C6.34342 54.8097 5.96687 54.3192 5.47446 53.7277L5.50342 53.7132Z"
          fill="#4779FF"
        />
      </g>
    </svg>
  );
};
