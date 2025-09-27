import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ServiceButtonProps {
  name: string;
  price: number;
  duration?: number;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  theme?: {
    serviceButton: string;
    serviceSelected: string;
  };
}

export function ServiceButton({
  name,
  price,
  duration,
  selected = false,
  onClick,
  className,
  theme
}: ServiceButtonProps) {
  return (
    <Button
      variant={selected ? "default" : "outline"}
      onClick={onClick}
      className={cn(
        "flex justify-between items-center h-auto p-4 text-left",
        selected ? theme?.serviceSelected : theme?.serviceButton,
        className
      )}
    >
      <div>
        <div className="font-medium">{name}</div>
        {duration && (
          <div className="text-sm opacity-75">{duration} min</div>
        )}
      </div>
      <div className="font-bold">${price}</div>
    </Button>
  );
}