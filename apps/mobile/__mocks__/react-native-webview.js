/**
 * Mock Jest de react-native-webview : WebView rendue comme une simple View.
 * Placé dans __mocks__/ car le plugin Babel NativeWind interdit les factories
 * inline de jest.mock référençant des variables hors scope.
 */
const React = require('react');
const { View } = require('react-native');

const MockWebView = React.forwardRef(function MockWebView(props, ref) {
  React.useImperativeHandle(ref, () => ({
    injectJavaScript: () => {},
    reload: () => {},
  }));
  return React.createElement(View, { ...props, testID: props.testID ?? 'webview' });
});

module.exports = {
  __esModule: true,
  default: MockWebView,
  WebView: MockWebView,
};
