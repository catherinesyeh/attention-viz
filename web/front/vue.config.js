module.exports = {
    css: {
        loaderOptions: {
            less: {
                lessOptions: {
                    javascriptEnabled: true,
                }
            },
        },
    },
    publicPath: "./",
    devServer: {
        port: 8561,
        disableHostCheck: true,
        compress: true,
        host: "0.0.0.0",
        hot: true
    },
    configureWebpack: {
        plugins: [
        ]
    }
}