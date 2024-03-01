module.exports = {
  name: 'Cortex XSOAR',
  acronym: 'CX',
  description:
    'Cortex XSOAR provides automation and security orchestration capabilities.',
  entityTypes: ['IPv4', 'IPv6', 'hash', 'domain', 'email'],
  customTypes: [
    {
      key: 'SSOID',
      regex: /\b[\d]{9}\b/
    },
    {
      key: 'hostname',
      regex: /\b(desktop-)[A-z,\d]{7}\b/
    },
    {
      key: 'hostname2',
      regex: /\b[A-z,0-9]{13}[\d]{2}\b/
    },
    {
      key: 'HPA',
      regex: /\b[hH][pP][aA]-[a-zA-Z0-9]{1,20}\b/
    },
    {
      key: 'SCTASK',
      regex: /\b[sS][cC][tT][aA][sS][kK][0-9]{6,8}\b/
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
    level: 'trace' //trace, debug, info, warn, error, fatal
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
        'If checked, users will be able create Indicators when searching On Demand if there are none currently existing for your searched entity. This setting must be visible to all users.',
      default: false,
      type: 'boolean',
      userCanEdit: false,
      adminOnly: false
    },
    {
      key: 'allowIncidentCreation',
      name: 'Allow Incident Creation',
      description:
        'If checked, users will be able create incidents when searching On Demand if there are none currently existing for your searched entity. This setting must be visible to all users.',
      default: false,
      type: 'boolean',
      userCanEdit: false,
      adminOnly: false
    }
  ]
};
