module.exports = {
  presets: [
    '@vue/cli-plugin-babel/preset'
  ],
  plugins: [
    ["import", { "libraryName": "ant-design-vue", "libraryDirectory": "es", "style": true }] //ref: https://2x.antdv.com/docs/vue/introduce
  ]
}
