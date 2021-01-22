polarity.export = PolarityComponent.extend({
  details: Ember.computed.alias('block.data.details'),
  summary: Ember.computed.alias('block.data.summary'),
  incidents: Ember.computed.alias('details.incidents'),
  indicators: Ember.computed.alias('details.indicators'),
  playbooks: Ember.computed.alias('details.playbooks'),
  allowIncidentCreation: Ember.computed.alias('block.userOptions.allowIncidentCreation'),
  allowIndicatorCreation: Ember.computed.alias('block.userOptions.allowIndicatorCreation'),
  baseUrl: Ember.computed.alias('details.baseUrl'),
  entityValue: Ember.computed.alias('block.entity.value'),
  submissionDetails: '',
  indicatorComment: '',
  severity: 0,
  reputation: 0,
  incidentMessage: '',
  incidentErrorMessage: '',
  indicatorMessage: '',
  indicatorErrorMessage: '',
  incidentPlaybookId: null,
  isRunning: false,
  isIndicatorRunning: false,
  expandableTitleStates: {},
  init() {
    if (!this.get('allowIncidentCreation') && !this.get('incidents')) {
      this.set('expandableTitleStates', { 0: true });
    }
    this._super(...arguments);
  },
  searchIncidentTypes: function (term, resolve, reject) {
    const outerThis = this;
    outerThis.setMessage(null, '');
    outerThis.setErrorMessage(null, '');
    outerThis.get('block').notifyPropertyChange('data');

    outerThis
      .sendIntegrationMessage({
        action: 'searchIncidentTypes',
        data: {
          selectedIncidentType: outerThis.get('selectedIncidentType'),
          term
        }
      })
      .then(({ types }) => {
        outerThis.set('foundIncidentTypes', types);
      })
      .catch((err) => {
        outerThis.setErrorMessage(
          null,
          'Search Incident Types Failed: ' +
            (err &&
              (err.detail || err.err || err.message || err.title || err.description)) ||
            'Unknown Reason'
        );
      })
      .finally(() => {
        outerThis.get('block').notifyPropertyChange('data');
        setTimeout(() => {
          outerThis.setMessage(null, '');
          outerThis.setErrorMessage(null, '');
          outerThis.get('block').notifyPropertyChange('data');
        }, 5000);
        resolve();
      });
  },
  searchIndicatorTypes: function (term, resolve, reject) {
    const outerThis = this;
    outerThis.setMessage(null, '');
    outerThis.setErrorMessage(null, '');
    outerThis.get('block').notifyPropertyChange('data');

    outerThis
      .sendIntegrationMessage({
        action: 'searchIndicatorTypes',
        data: {
          selectedIndicatorType: outerThis.get('selectedIndicatorType'),
          term
        }
      })
      .then(({ types }) => {
        outerThis.set('foundIndicatorTypes', types);
      })
      .catch((err) => {
        outerThis.setErrorMessage(
          null,
          'Search Indicator Types Failed: ' +
            (err &&
              (err.detail || err.err || err.message || err.title || err.description)) ||
            'Unknown Reason'
        );
      })
      .finally(() => {
        outerThis.get('block').notifyPropertyChange('data');
        setTimeout(() => {
          outerThis.setMessage(null, '');
          outerThis.setErrorMessage(null, '');
          outerThis.get('block').notifyPropertyChange('data');
        }, 5000);
        resolve();
      });
  },
  actions: {
    toggleExpandableTitle: function (index) {
      const modifiedExpandableTitleStates = Object.assign(
        {},
        this.get('expandableTitleStates'),
        {
          [index]: !this.get('expandableTitleStates')[index]
        }
      );

      this.set('expandableTitleStates', modifiedExpandableTitleStates);
    },
    changeTab: function (incidentIndex, tabName) {
      this.set(`incidents.${incidentIndex}.__activeTab`, tabName);
    },
    searchIncidentTypes: function (term) {
      return new Ember.RSVP.Promise((resolve, reject) => {
        Ember.run.debounce(this, this.searchIncidentTypes, term, resolve, reject, 500);
      });
    },
    searchIndicatorTypes: function (term) {
      return new Ember.RSVP.Promise((resolve, reject) => {
        Ember.run.debounce(this, this.searchIndicatorTypes, term, resolve, reject, 500);
      });
    },
    createIndicator: function () {
      const outerThis = this;

      this.set('indicatorMessage', '');
      this.set('isIndicatorRunning', true);
      this.get('block').notifyPropertyChange('data');

      this.sendIntegrationMessage({
        action: 'createIndicator',
        data: {
          entity: this.block.entity,
          summary: this.get('summary'),
          reputation: this.get('reputation'),
          indicatorComment: this.get('indicatorComment'),
          selectedIndicatorType: this.get('selectedIndicatorType')
        }
      })
        .then(({ newIndicator, newSummary }) => {
          if (newIndicator) outerThis.setIndicator(newIndicator);
          if (newSummary) outerThis.setSummary(newSummary);

          outerThis.setMessage(incidentIndex, 'Successfully Created Indicator');
        })
        .catch((err) => {
          outerThis.set(
            'indicatorErrorMessage',
            `Failed: ${err.detail || err.message || err.title || 'Unknown Reason'}`
          );
        })
        .finally(() => {
          outerThis.set('isIndicatorRunning', false);
          outerThis.get('block').notifyPropertyChange('data');
          setTimeout(() => {
            outerThis.set('indicatorMessage', '');
            outerThis.set('indicatorErrorMessage', '');
            outerThis.get('block').notifyPropertyChange('data');
          }, 5000);
        });
    },
    runPlaybook: function (playbookId, incidentIndex, incidentId) {
      const outerThis = this;

      this.setMessage(incidentIndex, '');
      this.setRunning(incidentIndex, true);
      this.get('block').notifyPropertyChange('data');

      this.sendIntegrationMessage({
        action: 'runPlaybook',
        data: {
          entityValue: this.block.entity.value,
          summary: this.get('summary'),
          incidentId,
          playbookId,
          submissionDetails: this.get('submissionDetails'),
          severity: this.get('severity'),
          selectedType: this.get('selectedType')
        }
      })
        .then(({ pbHistory, newIncident, newSummary }) => {
          if (newIncident) {
            outerThis.setIncident(newIncident);
            incidentIndex = 0;
          }

          if (newSummary) outerThis.setSummary(newSummary);
          if (pbHistory) outerThis.setPlaybookRunHistory(incidentIndex, pbHistory);

          outerThis.setMessage(incidentIndex, 'Successfully Ran Playbook');
        })
        .catch((err) => {
          outerThis.setErrorMessage(
            incidentIndex,
            `Failed: ${err.detail || err.message || err.title || 'Unknown Reason'}`
          );
        })
        .finally(() => {
          outerThis.setRunning(incidentIndex, false);
          outerThis.get('block').notifyPropertyChange('data');
          setTimeout(() => {
            outerThis.setMessage(incidentIndex, '');
            outerThis.setErrorMessage(incidentIndex, '');
            outerThis.get('block').notifyPropertyChange('data');
          }, 5000);
        });
    }
  },

  setMessage(incidentIndex, msg) {
    if (Number.isInteger(incidentIndex)) {
      this.set(`incidents.${incidentIndex}.__message`, msg);
    } else {
      this.set('incidentMessage', msg);
    }
  },

  setSummary(tags) {
    this.set('summary', tags);
  },

  setPlaybookRunHistory(incidentIndex, pbHistory) {
    this.set(`incidents.${incidentIndex}.pbHistory`, pbHistory);
  },

  setIncident(newIncident) {
    this.set(`incidents`, [newIncident]);
  },

  setIndicator(newIndicator) {
    this.set(`indicators`, [newIndicator]);
  },

  setErrorMessage(incidentIndex, msg) {
    if (Number.isInteger(incidentIndex)) {
      this.set(`incidents.${incidentIndex}.__errorMessage`, msg);
    } else {
      this.set('incidentErrorMessage', msg);
    }
  },

  setRunning(incidentIndex, isRunning) {
    if (Number.isInteger(incidentIndex)) {
      this.set(`incidents.${incidentIndex}.__running`, isRunning);
    } else {
      this.set('isRunning', isRunning);
    }
  }
});
