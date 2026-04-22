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
      alt={title || ""}
      className={`shrink-0 object-contain ${className}`}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
    />
  );
}
