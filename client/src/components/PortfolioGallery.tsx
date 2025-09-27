import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Plus, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortfolioGalleryProps {
  photos: string[];
  onAddPhoto?: () => void;
  onRemovePhoto?: (index: number) => void;
  maxPhotos?: number;
  editable?: boolean;
  className?: string;
  aspectRatio?: "square" | "portrait" | "landscape";
  showIndicators?: boolean;
  autoScroll?: boolean;
}

export function PortfolioGallery({
  photos,
  onAddPhoto,
  onRemovePhoto,
  maxPhotos = 6,
  editable = false,
  className,
  aspectRatio = "square",
  showIndicators = true,
  autoScroll = false
}: PortfolioGalleryProps) {
  // Be defensive: coerce photos to an array in case a non-array leaks in at runtime
  const photosSafe = Array.isArray(photos) ? photos : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const photoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Update scroll button states
  const updateScrollButtons = () => {
    if (!scrollContainerRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  // Update current index based on which photo is most visible
  const updateCurrentIndex = () => {
    if (!scrollContainerRef.current || photosSafe.length === 0) return;
    
    const container = scrollContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;
    
    let closestIndex = 0;
    let closestDistance = Infinity;
    
    photoRefs.current.forEach((photoRef, index) => {
      if (photoRef && index < photosSafe.length) {
        const photoRect = photoRef.getBoundingClientRect();
        const photoCenter = photoRect.left + photoRect.width / 2;
        const distance = Math.abs(photoCenter - containerCenter);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      }
    });
    
    setCurrentIndex(closestIndex);
  };

  useEffect(() => {
    updateScrollButtons();
    updateCurrentIndex();
    const container = scrollContainerRef.current;
    if (container) {
      const handleScroll = () => {
        updateScrollButtons();
        updateCurrentIndex();
      };
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [photosSafe]);

  const scrollToIndex = (index: number) => {
    if (!scrollContainerRef.current || photosSafe.length === 0 || !photoRefs.current[index]) return;
    
    const container = scrollContainerRef.current;
    const targetPhoto = photoRefs.current[index];
    
    if (targetPhoto) {
      const containerRect = container.getBoundingClientRect();
      const photoRect = targetPhoto.getBoundingClientRect();
      
      // Calculate how much to scroll to center the target photo
      const containerCenter = containerRect.width / 2;
      const photoCenter = photoRect.left - containerRect.left + photoRect.width / 2;
      const scrollOffset = photoCenter - containerCenter;
      
      container.scrollBy({
        left: scrollOffset,
        behavior: 'smooth'
      });
    }
  };

  const scrollLeft = () => {
    if (!scrollContainerRef.current || photosSafe.length === 0) return;
    
    // Find the previous photo to center
    const prevIndex = Math.max(0, currentIndex - 1);
    scrollToIndex(prevIndex);
  };

  const scrollRight = () => {
    if (!scrollContainerRef.current || photosSafe.length === 0) return;
    
    // Find the next photo to center
    const nextIndex = Math.min(photosSafe.length - 1, currentIndex + 1);
    scrollToIndex(nextIndex);
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case "portrait":
        return "aspect-[3/4]";
      case "landscape":
        return "aspect-[4/3]";
      default:
        return "aspect-square";
    }
  };

  if (photosSafe.length === 0 && !editable) {
    return (
      <div className={cn("text-center py-8 text-gray-500", className)}>
        <Upload className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No portfolio photos available</p>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Horizontal scroll container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {photosSafe.map((photo, index) => (
          <div
            key={index}
            ref={(el) => (photoRefs.current[index] = el)}
            className={cn(
              "relative flex-shrink-0 group",
              getAspectRatioClass(),
              "w-64 sm:w-80"
            )}
            style={{ scrollSnapAlign: 'center' }}
          >
            <div className="relative w-full h-full rounded-lg overflow-hidden bg-gray-100">
              <img
                src={photo}
                alt={`Portfolio ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = `https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=400&fit=crop&crop=faces`;
                }}
              />
              
              {/* Remove button for editable mode */}
              {editable && onRemovePhoto && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-8 h-8 p-0"
                  onClick={() => onRemovePhoto(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}

              {/* Photo number indicator */}
              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                {index + 1}
              </div>
            </div>
          </div>
        ))}

        {/* Add photo button for editable mode */}
        {editable && onAddPhoto && photosSafe.length < maxPhotos && (
          <div
            className={cn(
              "relative flex-shrink-0 flex items-center justify-center",
              getAspectRatioClass(),
              "w-64 sm:w-80"
            )}
            style={{ scrollSnapAlign: 'center' }}
          >
            <Button
              variant="outline"
              className="w-full h-full border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-colors duration-200"
              onClick={onAddPhoto}
            >
              <div className="flex flex-col items-center space-y-3">
                <Plus className="h-8 w-8 text-gray-400" />
                <div className="text-center">
                  <div className="font-medium text-gray-700">Add Photo</div>
                  <div className="text-xs text-gray-500">
                    {photosSafe.length}/{maxPhotos}
                  </div>
                </div>
              </div>
            </Button>
          </div>
        )}
      </div>

      {/* Navigation arrows */}
      {photosSafe.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/20 text-white hover:bg-black/40 transition-all duration-200",
              !canScrollLeft && "opacity-50 cursor-not-allowed"
            )}
            onClick={scrollLeft}
            disabled={!canScrollLeft}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/20 text-white hover:bg-black/40 transition-all duration-200",
              !canScrollRight && "opacity-50 cursor-not-allowed"
            )}
            onClick={scrollRight}
            disabled={!canScrollRight}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </>
      )}

      {/* Dot indicators */}
      {showIndicators && photosSafe.length > 1 && (
        <div className="flex justify-center space-x-2 mt-4">
          {photosSafe.map((_, index) => (
            <button
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                index === currentIndex
                  ? "bg-primary scale-125"
                  : "bg-gray-300 hover:bg-gray-400"
              )}
              onClick={() => scrollToIndex(index)}
            />
          ))}
        </div>
      )}

      {/* Photo counter */}
      {photosSafe.length > 0 && (
        <div className="absolute top-4 left-4 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
          {photosSafe.length} photo{photosSafe.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}