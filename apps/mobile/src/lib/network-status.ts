import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export function useNetworkStatus(): { isOnline: boolean; isReady: boolean } {
  const [isOnline, setIsOnline] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void NetInfo.fetch().then((state) => {
      if (!isMounted) {
        return;
      }
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
      setIsReady(true);
    });
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
      setIsReady(true);
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return { isOnline, isReady };
}
