const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");
const path = require("path");

const commonRules = [
  {
    test: /\.m?js$/,
    exclude: /node_modules/,
    use: {
      loader: "babel-loader",
      options: {
        presets: ["@babel/preset-env"],
      },
    },
  },
];

const commonOptimization = (isMinified) => ({
  minimize: isMinified,
  minimizer: isMinified ? [new TerserPlugin({ parallel: true })] : [],
});

const isDebug = process.env.DEBUG_BUILD === "true"; // Optional flag

module.exports = [
  {
    name: "cjs-build",
    mode: isDebug ? "development" : "production",
    entry: "./src/index.js",
    devtool: "source-map", // enables mapping to src/
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "mapbox-gl-draw-snap-mode.cjs.js",
      library: "mapboxGlDrawSnapMode",
      libraryTarget: "umd",
      globalObject: "this",
    },
    optimization: commonOptimization(!isDebug),
    module: {
      rules: commonRules,
    },
  },
  {
    name: "esm-build",
    mode: isDebug ? "development" : "production",
    entry: "./src/index.js",
    devtool: "source-map",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "mapbox-gl-draw-snap-mode.esm.js",
      library: {
        type: "module",
      },
    },
    optimization: commonOptimization(!isDebug),
    module: {
      rules: commonRules,
    },
    experiments: {
      outputModule: true,
    },
  },
];
