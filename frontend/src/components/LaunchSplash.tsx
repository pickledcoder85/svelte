import { StatusBar } from 'expo-status-bar';
import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { Image, type ImageSourcePropType, Platform, View, useWindowDimensions } from 'react-native';

import { launchSplashSize } from '../lib/launch-splash';
import { dismissLaunchSplash } from '../lib/launch-splash-dom';
import { styles } from '../screens/shared/styles';

// Native builds draw the splash image here; on web the HTML layer in public/index.html shows it.
export const launchSplashSource: ImageSourcePropType = require('../../public/splash.jpg');

export function LaunchSplash(): ReactElement {
  const { width } = useWindowDimensions();
  const size = launchSplashSize(width);
  // On web the HTML splash layer (public/index.html) stays on top the whole time; this only
  // keeps the background behind it. When the app stops rendering LaunchSplash (its first real
  // screen is ready), the layer fades out.
  useEffect(() => () => {
    dismissLaunchSplash();
  }, []);
  if (Platform.OS === 'web') {
    return <View style={styles.launchSplash} />;
  }
  return (
    <View style={styles.launchSplash} accessibilityLabel="Relish is loading">
      <StatusBar style="dark" />
      <Image source={launchSplashSource} style={size} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}
