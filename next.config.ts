
/** @type {import('next').NextConfig} */
const nextConfig = {
  // This helps prevent caching issues between deployments by giving each build a unique ID.
  generateBuildId: async () => {
    return new Date().getTime().toString();
  },
  async headers() {
    return [
      {
        source: '/:all*(.woff|.woff2|.eot|.ttf|.otf)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Type, Authorization',
          },
        ],
      },
    ]
  },
  experimental: {
    // This is the proposed fix to prevent Genkit from being bundled on the client.
    serverComponentsExternalPackages: [
      '@genkit-ai/core',
      'genkit',
      'googleapis',
      '@opentelemetry/api',
      '@opentelemetry/sdk-node',
      '@opentelemetry/exporter-jaeger',
      '@opentelemetry/instrumentation',
    ],
  },
  // Adding swcPlugins to handle server-side packages correctly.
  swcMinify: true,
};

export default nextConfig;
