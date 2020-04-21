module.exports = {
  name: 'Demisto',
  acronym: 'DE',
  description: 'Demisto provides automation and security orchestration capabilities.',
  entityTypes: ['IPv4', 'IPv6', 'hash', 'domain', 'email'],
  styles: ['./styles/styles.less'],
  onDemandOnly: true,
  block: {
    component: {
      file: './components/block.js'
    },
    template: {
      file: './templates/block.hbs'
    }
  },
  request: {
    cert: '',
    key: '',
    passphrase: '',
    ca: '',
    proxy: '',
    rejectUnauthorized: true
  },
  logging: {
    level: 'info' //trace, debug, info, warn, error, fatal
  },
  options: [
    {
      key: 'url',
      name: 'Url',
      description:
        'The base URL for the Demisto API which should include the schema (i.e., https://)',
      default: '',
      type: 'text',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'apiKey',
      name: 'API Key',
      description: 'A valid Demisto API Key which can be found in your Demisto Dashboard Settings',
      default: '',
      type: 'password',
      userCanEdit: true,
      adminOnly: false
    }
  ]
};
