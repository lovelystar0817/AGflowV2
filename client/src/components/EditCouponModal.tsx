import { useEffect, useState } from "react";
import type { Coupon } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export type CouponForEditing = {
  id: string;
  discountType: "percent" | "flat";
  discountValue: string;
  conditions: string;
  expiration: string;
};

type EditCouponModalProps = {
  coupon: CouponForEditing;
  onClose: () => void;
  onSave: (coupon: Coupon) => void;
};

export function EditCouponModal({ coupon, onClose, onSave }: EditCouponModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState({
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    conditions: coupon.conditions ?? "",
    expiration: coupon.expiration,
  });

  useEffect(() => {
    setFormState({
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      conditions: coupon.conditions ?? "",
      expiration: coupon.expiration,
    });
  }, [coupon]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        type: formState.discountType,
        amount:
          formState.discountType === "percent"
            ? parseInt(formState.discountValue, 10).toString()
            : parseFloat(formState.discountValue).toString(),
        name: "Discount", // Default name since not available in CouponForEditing
        serviceId: null,   // Default to null since not available in CouponForEditing
        startDate: new Date().toISOString().split("T")[0], // Default to today
        endDate: formState.expiration,
      };

      const response = await apiRequest("PUT", `/api/coupons/${coupon.id}`, payload);
      const updatedCoupon = (await response.json()) as Coupon;
      onSave(updatedCoupon);

      toast({
        title: "Coupon updated",
        description: "Your coupon has been updated successfully.",
      });

      onClose();
    } catch (error) {
      console.error("Failed to update coupon", error);
      toast({
        title: "Failed to update coupon",
        description:
          error instanceof Error ? error.message : "An unexpected error occurred while saving the coupon.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Coupon</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="discountType">Discount Type</Label>
            <Select
              value={formState.discountType}
              onValueChange={(value) =>
                setFormState((prev) => ({
                  ...prev,
                  discountType: value as "percent" | "flat",
                }))
              }
            >
              <SelectTrigger id="discountType">
                <SelectValue placeholder="Select discount type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percentage Off</SelectItem>
                <SelectItem value="flat">Flat Amount Off</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="discountValue">Discount Value</Label>
            <Input
              id="discountValue"
              type="number"
              step="0.01"
              min="0.01"
              value={formState.discountValue}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  discountValue: event.target.value,
                }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="conditions">Conditions</Label>
            <Textarea
              id="conditions"
              placeholder="Add any conditions or notes for this coupon"
              value={formState.conditions}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  conditions: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiration">Expiration Date</Label>
            <Input
              id="expiration"
              type="date"
              value={formState.expiration}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  expiration: event.target.value,
                }))
              }
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
