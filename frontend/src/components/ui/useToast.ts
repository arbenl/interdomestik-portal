import { toast } from 'sonner';

type ToastKind = 'success' | 'error' | 'info' | 'warning';
type Payload = { type?: ToastKind; message: string };

export function useToast() {
  return {
    push: ({ type = 'info', message }: Payload) => {
      switch (type) {
        case 'success':
          toast.success(message);
          break;
        case 'error':
          toast.error(message);
          break;
        case 'warning':
          toast.warning(message);
          break;
        default:
          toast(message);
      }
    },
  };
}
