import { toast } from 'sonner';

export const useToast = () => {
  return {
    push: toast,
  };
};
