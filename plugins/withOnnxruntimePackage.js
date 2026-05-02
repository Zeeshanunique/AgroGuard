/**
 * Ensures OnnxruntimePackage is registered in MainApplication.kt (not only Gradle).
 */
const { withMainApplication } = require('@expo/config-plugins');

const withOnnxruntimePackage = (config) => {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    const importLine = 'import ai.onnxruntime.reactnative.OnnxruntimePackage';
    if (!contents.includes(importLine)) {
      const lastImportIndex = contents.lastIndexOf('import ');
      const endOfLastImport = contents.indexOf('\n', lastImportIndex);
      contents =
        contents.slice(0, endOfLastImport + 1) +
        importLine +
        '\n' +
        contents.slice(endOfLastImport + 1);
    }

    const packageLine = 'add(OnnxruntimePackage())';
    if (!contents.includes(packageLine)) {
      const applyRegex = /\.packages\.apply\s*\{[^}]*\}/;
      const match = contents.match(applyRegex);
      if (match) {
        const original = match[0];
        const closingBrace = original.lastIndexOf('}');
        const patched =
          original.slice(0, closingBrace) +
          '\n              add(OnnxruntimePackage())\n            ' +
          original.slice(closingBrace);
        contents = contents.replace(original, patched);
      }
    }

    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withOnnxruntimePackage;
