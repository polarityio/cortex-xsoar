module.exports = {
  name: "Demisto",
  acronym: "DE",
  description: "TODO",
  entityTypes: ["IPv4", "IPv6", "hash", "domain", "email"],
  styles: ["./styles/styles.less"],
  block: {
    component: {
      file: "./components/block.js"
    },
    template: {
      file: "./templates/block.hbs"
    }
  },
  request: {
    cert: "",
    key: "",
    passphrase: "",
    ca: "",
    proxy: "",
    rejectUnauthorized: false
  },
  logging: {
    level: "trace" //trace, debug, info, warn, error, fatal
  },
  options: [
    {
      key: "url",
      name: "Url",
      description:
        "The base URL for the Demisto API including the schema (i.e., https://)",
      default: "",
      type: "text",
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: "apiKey",
      name: "API Key",
      description: "The API Key found Demisto Dashboard Settings",
      default: "",
      type: "password",
      userCanEdit: true,
      adminOnly: false
    }
  ]
};
