const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

// Custom plugin to inline JS and CSS into the HTML (required by Figma — single file UI)
class InlineChunksHtmlPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('InlineChunksHtmlPlugin', (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapAsync(
        'InlineChunksHtmlPlugin',
        (data, cb) => {
          const assets = compilation.assets;

          // Inline <script src="..."> tags
          data.html = data.html.replace(
            /<script\s+[^>]*src="([^"?#]+)[^"]*"[^>]*><\/script>/g,
            (_match, src) => {
              const key = src.replace(/^.*\//, '');
              const asset = assets[key];
              if (asset) {
                return `<script>${asset.source()}</script>`;
              }
              return _match;
            }
          );

          // Inline <link rel="stylesheet" href="..."> tags
          data.html = data.html.replace(
            /<link[^>]+rel="stylesheet"[^>]+href="([^"?#]+)[^"]*"[^>]*\/?>/g,
            (_match, href) => {
              const key = href.replace(/^.*\//, '');
              const asset = assets[key];
              if (asset) {
                return `<style>${asset.source()}</style>`;
              }
              return _match;
            }
          );

          cb(null, data);
        }
      );
    });
  }
}

module.exports = (env, argv) => ({
  mode: argv.mode === 'production' ? 'production' : 'development',
  devtool: argv.mode === 'production' ? false : 'inline-source-map',

  entry: {
    code: './src/code.ts',
    ui: './src/ui/index.tsx',
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },

  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './src/ui/index.html',
      filename: 'ui.html',
      chunks: ['ui'],
      inject: 'body',
    }),
    new InlineChunksHtmlPlugin(),
  ],
});
