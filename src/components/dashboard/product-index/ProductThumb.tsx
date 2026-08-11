interface ProductThumbProps {
  src: string;
  alt: string;
  size?: number;
}

export function ProductThumb({ src, alt, size = 56 }: ProductThumbProps) {
  return <img src={src} alt={alt} className="product-thumb" width={size} height={size} />;
}
