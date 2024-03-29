module.exports = {
  name: 'Cortex XSOAR',
  acronym: 'CX',
  description:
    'Cortex XSOAR provides automation and security orchestration capabilities.',
  entityTypes: ['IPv4', 'IPv6', 'hash', 'domain', 'email'],
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
      name: 'URL',
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
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'allowIndicatorCreation',
      name: 'Allow Indicator Creation',
      description:
        'If checked, users will be able to create Indicators when searching On Demand if there are none currently existing for your searched entity. This setting must be visible to all users.',
      default: true,
      type: 'boolean',
      userCanEdit: false,
      adminOnly: false
    },
    {
      key: 'allowIncidentCreation',
      name: 'Allow Incident Creation',
      description:
        'If checked, users will be able to create incidents when searching On Demand if there are none currently existing for your searched entity. This setting must be visible to all users.',
      default: true,
      type: 'boolean',
      userCanEdit: false,
      adminOnly: false
    },
    {
      key: 'allowEvidenceSubmission',
      name: 'Allow Evidence Submission',
      description:
          'If checked, users will be able to submit data from selected Polarity integrations as Incident evidence.  This setting must be visible to all users.',
      default: true,
      type: 'boolean',
      userCanEdit: false,
      adminOnly: false
    },
  ]
};
