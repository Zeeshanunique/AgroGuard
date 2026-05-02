/**
 * onnxruntime-react-native can ship libreactnative.so alongside RN's copy;
 * mergeDebugNativeLibs fails without pickFirst. Prefer RN's binary.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const TAG = 'onnx-jni-pickfirst-libreactnative';

const withOnnxJniPickFirst = (config) => {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') return config;
    let contents = config.modResults.contents;
    if (contents.includes(TAG)) return config;

    const needle = 'useLegacyPackaging enableLegacyPackaging.toBoolean()';
    if (!contents.includes(needle)) return config;

    contents = contents.replace(
      needle,
      `${needle}
            // ${TAG}
            pickFirsts += [
                'lib/armeabi-v7a/libreactnative.so',
                'lib/arm64-v8a/libreactnative.so',
                'lib/x86/libreactnative.so',
                'lib/x86_64/libreactnative.so',
            ]`
    );
    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withOnnxJniPickFirst;
