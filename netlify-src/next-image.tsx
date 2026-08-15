import type { ImgHTMLAttributes } from "react";

type ImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fill?: boolean;
  priority?: boolean;
};

export default function NetlifyImage({
  fill,
  priority,
  loading,
  alt,
  style,
  ...props
}: ImageProps) {
  return (
    // Netlify serves this already-compressed local artwork as a static asset.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt={alt ?? ""}
      loading={priority ? "eager" : loading}
      fetchPriority={priority ? "high" : undefined}
      style={fill ? { position: "absolute", inset: 0, ...style } : style}
    />
  );
}
