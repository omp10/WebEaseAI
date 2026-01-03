/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['lh3.googleusercontent.com']
    },
    // Explicitly configure turbopack to use webpack instead
    turbopack: {},
    experimental: {
        // Keep webpack as the default bundler
    },
    webpack: (config, { isServer, webpack }) => {
        // Ensure server-only packages are not bundled on the client
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                '@google/generative-ai': false,
                'groq-sdk': false,
                'openai': false,
                fs: false,
                net: false,
                tls: false,
                crypto: false,
            };
            
            // Ignore these modules on client side
            config.plugins.push(
                new webpack.IgnorePlugin({
                    resourceRegExp: /^@google\/generative-ai$/,
                }),
                new webpack.IgnorePlugin({
                    resourceRegExp: /^groq-sdk$/,
                }),
                new webpack.IgnorePlugin({
                    resourceRegExp: /^openai$/,
                })
            );
        }
        
        // For server-side builds, these packages should be available via require()
        // No need to externalize them as they're already server-only
        
        return config;
    },
};

export default nextConfig;
