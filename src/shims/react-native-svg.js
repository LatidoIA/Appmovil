// src/shims/react-native-svg.js
import React from 'react';
import { View, Text as RNText } from 'react-native';

const passthrough = (Base = View) =>
  React.forwardRef((props, ref) => <Base ref={ref} {...props}>{props.children}</Base>);

export const Svg = passthrough(View);
export const G = passthrough(View);
export const Path = passthrough(View);
export const Circle = passthrough(View);
export const Rect = passthrough(View);
export const Line = passthrough(View);
export const Polyline = passthrough(View);
export const Polygon = passthrough(View);
export const Defs = passthrough(View);
export const LinearGradient = passthrough(View);
export const Stop = passthrough(View);
export const Text = passthrough(RNText);
export const TSpan = passthrough(RNText);

export default Svg;
