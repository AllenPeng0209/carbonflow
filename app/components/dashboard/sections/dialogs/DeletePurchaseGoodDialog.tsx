import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/dashboard/ui/alert-dialog';
import { cn } from '~/lib/utils';

type DeletePurchaseGoodDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  backgroundColor?: string;
};

export function DeleteDialog({ open, onOpenChange, onConfirm, backgroundColor }: DeletePurchaseGoodDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn(backgroundColor)}>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="py-4">确定要删除该采购商品吗？</div>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>确认</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
