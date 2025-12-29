import './Map.css';

interface MapSkeletonProps {
  height?: string | number;
  width?: string | number;
}

/**
 * Loading skeleton for the Map component
 */
export function MapSkeleton({ height = '400px', width = '100%' }: MapSkeletonProps) {
  const style = {
    height: typeof height === 'number' ? `${height}px` : height,
    width: typeof width === 'number' ? `${width}px` : width,
  };

  return (
    <div className="acb-map-wrapper" style={style}>
      <div className="acb-map-skeleton">
        <div className="acb-map-skeleton-content">
          <div className="acb-map-skeleton-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <span className="acb-map-skeleton-text">Loading map...</span>
        </div>
      </div>
    </div>
  );
}
