module.exports = {
  name: 'Cortex XSOAR',
  acronym: 'CX',
  description:
    'Cortex XSOAR provides automation and security orchestration capabilities.',
  entityTypes: ['IPv4', 'IPv6', 'hash', 'domain', 'email'],
  customTypes: [
    {
      key: 'allText',
      regex: /\S[\s\S]{2,50}\S/
    }
  ],
  styles: ['./styles/styles.less'],
  onDemandOnly: true,
  defaultColor: 'light-purple',
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
    proxy: ''
  },
  logging: {
    level: 'info' //trace, debug, info, warn, error, fatal
  },
  options: [
    {
      key: 'url',
      name: 'Url',
      description:
        'The base URL for the Cortex XSOAR API which should include the schema (i.e., https://)',
      default: '',
      type: 'text',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'apiKey',
      name: 'API Key',
      description:
        'A valid Cortex XSOAR API Key which can be found in your Cortex XSOAR Dashboard Settings',
      default: '',
      type: 'password',
      userCanEdit: true,
      adminOnly: false
    },
    {
      key: 'allowIndicatorCreation',
      name: 'Allow Indicator Creation',
      description:
        'If checked, users will be able create Indicators when searching On Demand if there are none currently existing for your searched entity.',
      default: false,
      type: 'boolean',
      userCanEdit: true,
      adminOnly: false
    },
    {
      key: 'allowIncidentCreation',
      name: 'Allow Incident Creation',
      description:
        'If checked, users will be able create incidents when searching On Demand if there are none currently existing for your searched entity.',
      default: false,
      type: 'boolean',
      userCanEdit: true,
      adminOnly: false
    }
  ]
};
