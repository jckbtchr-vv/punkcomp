"use client";

import Image from "next/image";

interface OpepenVoteImageProps {
  src: string;
  alt: string;
  onLoad?: () => void;
  onError?: () => void;
  className?: string;
  loaded?: boolean;
}

export default function OpepenVoteImage({
  src,
  alt,
  onLoad,
  onError,
  className,
  loaded = false,
}: OpepenVoteImageProps) {
  // Use Next.js Image for optimization (resizing, WebP conversion)
  return (
    <Image
      src={src}
      alt={alt}
      width={256}
      height={256}
      quality={75}
      priority
      className={`object-cover transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"} ${className || ""}`}
      onLoad={onLoad}
      onError={onError}
      unoptimized={false}
    />
  );
}
