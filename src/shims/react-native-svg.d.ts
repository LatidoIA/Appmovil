declare module 'react-native-svg' {
  import * as React from 'react';
  import { ViewProps, TextProps } from 'react-native';
  export const Svg: React.FC<ViewProps>;
  export const G: React.FC<ViewProps>;
  export const Path: React.FC<ViewProps>;
  export const Circle: React.FC<ViewProps>;
  export const Rect: React.FC<ViewProps>;
  export const Line: React.FC<ViewProps>;
  export const Polyline: React.FC<ViewProps>;
  export const Polygon: React.FC<ViewProps>;
  export const Defs: React.FC<ViewProps>;
  export const LinearGradient: React.FC<ViewProps>;
  export const Stop: React.FC<ViewProps>;
  export const Text: React.FC<TextProps>;
  export const TSpan: React.FC<TextProps>;
  export default Svg;
}
