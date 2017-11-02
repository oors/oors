export default {
  type: 'object',
  properties: {
    srcDir: {
      type: 'string',
      default: 'src',
    },
    buildDir: {
      type: 'string',
      default: 'build',
    },
    packagesDir: {
      type: 'string',
    },
    ignoredPackages: {
      type: 'array',
      items: {
        type: 'string',
      },
      default: [],
    },
    babelConfig: {
      type: 'object',
    },
    watchGlob: {
      type: 'array',
      items: {
        type: 'string',
      },
      default: [],
    },
  },
  required: ['packagesDir', 'babelConfig'],
};
