/** Loading skeleton con efecto shimmer — mismas proporciones que CarCard */
export default function SkeletonCard() {
  return (
    <div className="skeleton-card-wrap">
      <div className="skeleton skeleton-media" />
      <div className="skeleton-body">
        <div className="skeleton skeleton-brand" />
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-price" />
        <div className="skeleton skeleton-specs" />
        <div className="skeleton skeleton-btns" />
      </div>
    </div>
  );
}

/** Grilla de N skeletons */
export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="cards-grid">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}
