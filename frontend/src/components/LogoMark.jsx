import logoImg from "../../logo/bgremoved.png";

/**
 * LearnLoop logo — uses the uploaded PNG image.
 */
export default function LogoMark({ size = 40, className = "", title }) {
  return (
    <img
      src={logoImg}
      width={size}
      height={size}
      alt={title || "LearnLoop logo"}
      className={`shrink-0 w-auto h-auto max-w-full object-contain ${className}`}
      style={{ maxWidth: `${size}px`, maxHeight: `${size}px` }}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
    />
  );
}
