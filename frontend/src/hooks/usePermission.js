import { useEffect, useState, useCallback } from 'react';

// usePermission: small hook to check and request browser permissions
// - Supports: 'camera' and 'notifications'
// - Uses Permissions API when available; falls back to best-effort checks
export default function usePermission(name) {
  const [state, setState] = useState('prompt'); // 'granted' | 'denied' | 'prompt' | 'unsupported'

  const queryStatus = useCallback(async () => {
    try {
      if (!('permissions' in navigator) || !navigator.permissions?.query) {
        // Fallbacks: try to infer
        if (name === 'notifications') {
          if (!('Notification' in window)) return setState('unsupported');
          setState(Notification.permission);
          return;
        }
        // No reliable fallback for camera
        setState('unsupported');
        return;
      }
      const result = await navigator.permissions.query({ name });
      setState(result.state);
      result.onchange = () => setState(result.state);
    } catch {
      // Some browsers throw for unknown permissions
      if (name === 'notifications' && 'Notification' in window) {
        setState(Notification.permission);
      } else {
        setState('unsupported');
      }
    }
  }, [name]);

  const request = useCallback(async () => {
    try {
      if (name === 'camera') {
        // Request via getUserMedia; if allowed once on HTTPS, it typically persists per origin
        await navigator.mediaDevices.getUserMedia({ video: true });
        await queryStatus();
        return true;
      }
      if (name === 'notifications') {
        if (!('Notification' in window)) {
          setState('unsupported');
          return false;
        }
        const perm = await Notification.requestPermission();
        setState(perm);
        return perm === 'granted';
      }
      return false;
    } catch {
      await queryStatus();
      return false;
    }
  }, [name, queryStatus]);

  useEffect(() => {
    queryStatus();
  }, [queryStatus]);

  return { state, request, refresh: queryStatus };
}
