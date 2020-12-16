polarity.export = PolarityComponent.extend({
  details: Ember.computed.alias('block.data.details'),
  summary: Ember.computed.alias('block.data.summary'),
  incidents: Ember.computed.alias('details.incidents'),
  indicators: Ember.computed.alias('details.indicators'),
  playbooks: Ember.computed.alias('details.playbooks'),
  baseUrl: Ember.computed.alias('details.baseUrl'),
  entityValue: Ember.computed.alias('block.entity.value'),
  onDemand: Ember.computed('block.entity.requestContext.requestType', function () {
    return this.block.entity.requestContext.requestType === 'OnDemand';
  }),
  submissionDetails: '',
  severity: 0,
  incidentMessage: '',
  incidentErrorMessage: '',
  incidentPlaybookId: null,
  isRunning: false,
  searchTypes: function (term, resolve, reject) {
    const outerThis = this;
    outerThis.setMessage(null, '');
    outerThis.setErrorMessage(null, '');
    outerThis.get('block').notifyPropertyChange('data');

    outerThis
      .sendIntegrationMessage({
        action: 'searchTypes',
        data: {
          selectedType: outerThis.get('selectedType'),
          term
        }
      })
      .then(({ types }) => {
        outerThis.set('foundTypes', types);
      })
      .catch((err) => {
        outerThis.setErrorMessage(
          null,
          'Search Types Failed: ' +
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
    changeTab: function (incidentIndex, tabName) {
      this.set(`incidents.${incidentIndex}.__activeTab`, tabName);
    },
    searchTypes: function (term) {
      return new Ember.RSVP.Promise((resolve, reject) => {
        Ember.run.debounce(this, this.searchTypes, term, resolve, reject, 500);
      });
    },
    runPlaybook: function (playbookId, incidentIndex, incidentId) {
      const outerThis = this;
      if (!playbookId)
        return this.setErrorMessage(incidentIndex, 'Must select a playbook to run.');

      this.setMessage(incidentIndex, '');
      this.setRunning(incidentIndex, true);
      this.get('block').notifyPropertyChange('data');

      this.sendIntegrationMessage({
        action: 'runPlaybook',
        data: {
          entityValue: this.block.entity.value,
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
