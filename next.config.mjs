/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                net: false,
                tls: false,
                fs: false,
                child_process: false,
            };
        }
        config.externals.push('gaxios');
        config.externals.push('googleapis');


        return config;
    },
};

export default nextConfig;
