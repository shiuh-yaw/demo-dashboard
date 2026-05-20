/**
 * Custom SVG Icons
 *
 * Reusable icon components for the payment widget.
 */

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

/**
 * Thumbs up / like icon.
 * Used in the review payment screen header.
 */
export function ThumbsUpIcon({
  size = 18,
  color = "currentColor",
  className,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.0104 13.8667C4.71861 13.8667 4.45186 13.7019 4.32136 13.4409L1.62506 8.04826C1.36895 7.53604 1.74142 6.93337 2.3141 6.93337H7.52485C7.95032 6.93337 8.29522 6.58846 8.29522 6.163C8.29522 5.73753 7.95032 5.39262 7.52485 5.39262H6.75448V2.31113C6.75448 1.88567 7.09939 1.54076 7.52485 1.54076C7.53884 2.21743 7.74636 2.87665 8.12236 3.44064L10.6063 7.16662V13.2652L8.29239 13.8437C8.23129 13.859 8.16854 13.8667 8.10555 13.8667H5.0104ZM12.1471 13.0964V6.93337H12.9175C13.3429 6.93337 13.6878 7.27828 13.6878 7.70374V12.326C13.6878 12.7514 13.3429 13.0964 12.9175 13.0964H12.1471ZM11.2754 5.39262L9.40434 2.58599C9.18346 2.25468 9.0656 1.8654 9.0656 1.46721C9.0656 0.656899 8.40871 1.33514e-05 7.5984 1.33514e-05H7.52485C6.24845 1.33514e-05 5.21373 1.03474 5.21373 2.31113V5.39262H2.3141C0.596056 5.39262 -0.521359 7.20064 0.246973 8.73731L2.94328 14.1299C3.33476 14.9129 4.13502 15.4075 5.0104 15.4075H8.10555C8.29451 15.4075 8.48276 15.3843 8.66608 15.3385L11.4716 14.6371H12.9175C14.1939 14.6371 15.2286 13.6024 15.2286 12.326V7.70374C15.2286 6.42735 14.1939 5.39262 12.9175 5.39262H11.2754Z"
        fill={color}
      />
    </svg>
  );
}

/**
 * Animated clock icon with rotating hour hand.
 * Used to indicate an active/in-progress step.
 */
export function AnimatedClockIcon({
  size = 18,
  color = "#46B463",
  className,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line
        x1="12"
        y1="12"
        x2="12"
        y2="6"
        className="origin-center animate-[spin_3s_linear_infinite]"
        style={{ transformOrigin: "12px 12px" }}
      />
      <line x1="12" y1="12" x2="16" y2="12" />
    </svg>
  );
}

/**
 * Arrow right icon.
 * Used to show conversion direction between tokens.
 */
export function ArrowRightIcon({
  size = 16,
  color = "currentColor",
  className,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
    >
      <path
        d="M3.33337 8H12.6667M12.6667 8L8.00004 3.33333M12.6667 8L8.00004 12.6667"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Pending step icon.
 * Gray filled circle with lighter gray ring.
 * Used to indicate a pending/not-started step.
 */
export function PendingStepIcon({
  size = 18,
  className,
}: Omit<IconProps, "color">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 19 19"
      fill="none"
      className={className}
    >
      {/* Inner filled circle */}
      <path
        d="M12.9425 9.24442C12.9425 11.2867 11.2869 12.9422 9.24466 12.9422C7.20243 12.9422 5.54688 11.2867 5.54688 9.24442C5.54688 7.20219 7.20243 5.54663 9.24466 5.54663C11.2869 5.54663 12.9425 7.20219 12.9425 9.24442Z"
        fill="#ACACAC"
      />
      {/* Outer ring */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.7916 9.24444C14.7916 12.3078 12.3083 14.7911 9.24493 14.7911C6.18158 14.7911 3.69824 12.3078 3.69824 9.24444C3.69824 6.18109 6.18158 3.69775 9.24493 3.69775C12.3083 3.69775 14.7916 6.18109 14.7916 9.24444ZM9.24493 12.9422C11.2872 12.9422 12.9427 11.2867 12.9427 9.24444C12.9427 7.20221 11.2872 5.54665 9.24493 5.54665C7.20269 5.54665 5.54714 7.20221 5.54714 9.24444C5.54714 11.2867 7.20269 12.9422 9.24493 12.9422Z"
        fill="#EDEDED"
      />
    </svg>
  );
}

/**
 * Dollar sign inside a circle.
 * Used in the header of payment/deposit screens.
 */
export function DollarCircleIcon({
  size = 18,
  color = "currentColor",
  className,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.70373 1.54075C4.30001 1.54075 1.54075 4.30001 1.54075 7.70373C1.54075 11.1074 4.30001 13.8667 7.70373 13.8667C11.1074 13.8667 13.8667 11.1074 13.8667 7.70373C13.8667 4.30001 11.1074 1.54075 7.70373 1.54075ZM0 7.70373C0 3.44908 3.44908 0 7.70373 0C11.9584 0 15.4075 3.44908 15.4075 7.70373C15.4075 11.9584 11.9584 15.4075 7.70373 15.4075C3.44908 15.4075 0 11.9584 0 7.70373ZM7.70373 3.08149C8.12919 3.08149 8.4741 3.4264 8.4741 3.85186V3.92301C9.1986 4.05921 9.8542 4.38833 10.2875 4.88773C10.5664 5.20908 10.5319 5.69563 10.2105 5.97447C9.88919 6.25331 9.40264 6.21885 9.1238 5.8975C8.99861 5.75322 8.77532 5.60655 8.4741 5.50874L8.47411 7.00423C8.95297 7.09415 9.39588 7.26775 9.76527 7.51401C10.3212 7.88465 10.7852 8.48129 10.7852 9.24447C10.7852 10.0077 10.3212 10.6043 9.76528 10.9749C9.39588 11.2212 8.95297 11.3948 8.4741 11.4847L8.4741 11.5556C8.47409 11.9811 8.12918 12.326 7.70371 12.326C7.27825 12.326 6.93335 11.981 6.93336 11.5556L6.93336 11.4844C6.20886 11.3482 5.55327 11.0191 5.11995 10.5197C4.84111 10.1984 4.87557 9.71182 5.19693 9.43298C5.51828 9.15414 6.00484 9.18861 6.28368 9.50996C6.40886 9.65424 6.63215 9.80091 6.93337 9.89871L6.93337 8.40323C6.4545 8.31331 6.01159 8.13971 5.64219 7.89344C5.08623 7.5228 4.62224 6.92617 4.62224 6.16298C4.62224 5.3998 5.08623 4.80316 5.64219 4.43252C6.01159 4.18626 6.45449 4.01266 6.93336 3.92273V3.85186C6.93336 3.4264 7.27826 3.08149 7.70373 3.08149ZM6.93336 5.50894C6.76341 5.56394 6.6161 5.635 6.49685 5.7145C6.21635 5.9015 6.16298 6.07524 6.16298 6.16298C6.16298 6.25073 6.21635 6.42447 6.49685 6.61147C6.6161 6.69097 6.76341 6.76203 6.93336 6.81702L6.93336 5.50894ZM8.47411 8.59044L8.47412 9.89851C8.64407 9.84352 8.79138 9.77246 8.91063 9.69296C9.19113 9.50596 9.24449 9.33222 9.24449 9.24447C9.24449 9.15673 9.19113 8.983 8.91062 8.79599C8.79137 8.71649 8.64406 8.64544 8.47411 8.59044Z"
        fill={color}
      />
    </svg>
  );
}

/**
 * Wallet icon with card slot.
 * Used in the connected wallets screen header.
 */
export function WalletIcon({
  size = 18,
  color = "currentColor",
  className,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      className={className}
    >
      <path
        d="M40,56V184a16,16,0,0,0,16,16H216a8,8,0,0,0,8-8V80a8,8,0,0,0-8-8H56A16,16,0,0,1,40,56h0A16,16,0,0,1,56,40H192"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
      <circle cx="180" cy="132" r="12" fill={color} />
    </svg>
  );
}

export function CashIcon({
  size = 18,
  color = "currentColor",
  className,
}: IconProps) {
  // Scale factor to fit the 16x13 viewBox into the desired size
  const width = size;
  const height = (size * 13) / 16;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 13"
      fill="none"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 2.31112C0 1.03472 1.03472 0 2.31112 0H10.0148C11.2912 0 12.326 1.03472 12.326 2.31112V3.08149H13.0963C14.3727 3.08149 15.4075 4.11621 15.4075 5.39261V10.0148C15.4075 11.2912 14.3727 12.326 13.0963 12.326H5.39261C4.11621 12.326 3.08149 11.2912 3.08149 10.0148V9.24447H2.31112C1.03472 9.24447 0 8.20975 0 6.93336V2.31112ZM4.62224 10.0148C4.62224 10.4403 4.96714 10.7852 5.39261 10.7852H13.0963C13.5218 10.7852 13.8667 10.4403 13.8667 10.0148V5.39261C13.8667 4.96714 13.5218 4.62224 13.0963 4.62224H5.39261C4.96714 4.62224 4.62224 4.96714 4.62224 5.39261V10.0148ZM10.7852 3.08149H5.39261C4.11621 3.08149 3.08149 4.11621 3.08149 5.39261V7.70373H2.31112C1.88565 7.70373 1.54075 7.35882 1.54075 6.93336V2.31112C1.54075 1.88565 1.88565 1.54075 2.31112 1.54075H10.0148C10.4403 1.54075 10.7852 1.88565 10.7852 2.31112V3.08149ZM9.24447 6.93336C8.81901 6.93336 8.4741 7.27826 8.4741 7.70373C8.4741 8.12919 8.81901 8.4741 9.24447 8.4741C9.66994 8.4741 10.0148 8.12919 10.0148 7.70373C10.0148 7.27826 9.66994 6.93336 9.24447 6.93336ZM6.93336 7.70373C6.93336 6.42733 7.96808 5.39261 9.24447 5.39261C10.5209 5.39261 11.5556 6.42733 11.5556 7.70373C11.5556 8.98012 10.5209 10.0148 9.24447 10.0148C7.96808 10.0148 6.93336 8.98012 6.93336 7.70373Z"
        fill={color}
      />
    </svg>
  );
}
