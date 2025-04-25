const withTM = require('next-transpile-modules')(['monaco-editor', 'react-monaco-editor']);

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // This signals to Next.js to use Webpack
    return config;
  },
};

module.exports = withTM(nextConfig);
