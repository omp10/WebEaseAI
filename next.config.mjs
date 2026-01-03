/** @type {import('next').NextConfig} */
const nextConfig = {
    images:{
        domains:['lh3.googleusercontent.com']
    },
    webpack: (config, { isServer, webpack }) => {
        // Ensure server-only packages are not bundled on client
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                '@google/generative-ai': false,
                'groq-sdk': false,
                'openai': false,
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
        return config;
    },
};

export default nextConfig;
