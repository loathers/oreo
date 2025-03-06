// @ts-check
/* globals module */

/**
 * @returns {import("@babel/core").TransformOptions}
 */
module.exports = function (api) {
  api.cache(true);

  const presetEnvConfig = {
    targets: { rhino: "1.7.15" },
  };

  return {
    exclude: [],
    presets: ["@babel/preset-typescript", ["@babel/preset-env", presetEnvConfig]],
  };
}
