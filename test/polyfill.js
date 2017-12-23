global.window = global;

global.browser = {
  storage: {
    local: {
      get() {
        return Promise.resolve({
          version: '1',
        });
      },
      set() {
        return Promise.resolve();
      },
    },
  },
  runtime: {
    getManifest() {
      return { version: '1' };
    },
  },
  i18n: {
    getMessage(...args) {
      return args.join(',');
    },
  },
  __send() {},
};
