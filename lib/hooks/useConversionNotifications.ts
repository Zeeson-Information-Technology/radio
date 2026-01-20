import { useToast } from '@/lib/contexts/ToastContext';

interface ConversionNotification {
  id: string;
  type: 'conversion_complete';
  recordId: string;
  title: string;
  timestamp: string;
}

interface UseConversionNotificationsOptions {
  onConversionComplete?: (notification: ConversionNotification) => void;
  enabled?: boolean;
}

export function useConversionNotifications({
  onConversionComplete,
  enabled = true
}: UseConversionNotificationsOptions = {}) {
  const { showSuccess } = useToast();

  // No polling - user specifically requested to avoid polling for cost reasons
  // Conversions will be visible after manual page refresh
  // Gateway will attempt to notify but it's not critical for functionality
  
  return {};
}