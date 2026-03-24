import adapter from '@sveltejs/adapter-static';

const config = {
  kit: {
    adapter: adapter({
      pages: 'dist',
      assets: 'dist',
      fallback: 'index.html'
    }),
  prerender: {
      handleUnseenRoutes: 'ignore'
    }
  }
};

export default config;