// shim-reanimated.js
// No-op para evitar compilar el nativo de Reanimated.
// Provee lo mínimo para que el código que lo importa no crashee.

const identity = (v) => v;
const noop = () => {};
const emptyObj = {};
const emptyArray = [];

const useSharedValue = (initial) => ({ value: initial });
const useDerivedValue = (fn, deps) => ({ value: typeof fn === 'function' ? fn() : undefined });
const useAnimatedStyle = (fn) => (typeof fn === 'function' ? fn() : {});
const useAnimatedReaction = noop;
const runOnJS = (fn) => fn || noop;
const runOnUI = (fn) => fn || noop;

const withTiming = identity;
const withSpring = identity;
const withDecay = identity;
const cancelAnimation = noop;

const Easing = new Proxy({}, { get: () => identity });
const Layout = {};
const FadeIn = {};
const FadeOut = {};
const FlipInXDown = {};
const FlipOutXDown = {};
const ZoomIn = {};
const ZoomOut = {};

const createAnimatedComponent = (Component) => Component;
const Animated = { createAnimatedComponent };

module.exports = {
  // hooks
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  useAnimatedReaction,

  // helpers
  runOnJS,
  runOnUI,
  withTiming,
  withSpring,
  withDecay,
  cancelAnimation,

  // primitives
  Easing,
  Layout,
  FadeIn,
  FadeOut,
  FlipInXDown,
  FlipOutXDown,
  ZoomIn,
  ZoomOut,
  Animated,

  // defaults
  default: {}
};
