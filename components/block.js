polarity.export = PolarityComponent.extend({
  details: Ember.computed.alias('block.data.details'),
  incidents: Ember.computed.alias('details.incidents'),
  playbooks: Ember.computed.alias('details.playbooks'),
  baseUrl: Ember.computed.alias('details.baseUrl'),
  onDemand: Ember.computed('block.entity.requestContext.requestType', function() {
    return this.block.entity.requestContext.requestType === 'OnDemand';
  }),
  newEventMessage: '',
  newEventPlaybookId: null,
  isRunning: false,
  actions: {
    changeTab: function(incidentIndex, tabName) {
      this.set(`incidents.${incidentIndex}.__activeTab`, tabName);
    },
    runPlaybook: function(incidentIndex, incidentId, playbookId) {
      let self = this;

      if (!playbookId) return self.setMessage(incidentIndex, 'Select a playbook to run.');

      this.setMessage(incidentIndex, '');
      this.setRunning(incidentIndex, true);
      this.get('block').notifyPropertyChange('data');

      self
        .sendIntegrationMessage({
          data: { entityValue: this.block.entity.value, incidentId, playbookId }
        })
        .then(({ err, pbHistory, newIndicator }) => {
          if (newIndicator) {
            self.setIndicator(newIndicator);
            incidentIndex = 0;
          } else {
            self.setPlaybookRunHistory(incidentIndex, pbHistory);
          }

          self.setMessage(
            incidentIndex,
            err
              ? `Run Failed: ${err.message || err.title}`
              : 'Successfully Ran Playbook'
          );
        })
        .catch((err) => {
          self.setErrorMessage(incidentIndex, err.message || err.title);
        })
        .finally(() => {
          self.setRunning(incidentIndex, false);
          self.get('block').notifyPropertyChange('data');
        });
    }
  },

  setMessage(incidentIndex, msg) {
    if (Number.isInteger(incidentIndex)) {
      this.set(`incidents.${incidentIndex}.__message`, msg);
    } else {
      this.set('newEventMessage', msg);
    }
  },

  setPlaybookRunHistory(incidentIndex, pbHistory) {
    this.set(`incidents.${incidentIndex}.pbHistory`, pbHistory);
  },

  setIndicator(newIndicator) {
    this.set(`incidents`, [newIndicator]);
  },

  setErrorMessage(incidentIndex, msg) {
    if (Number.isInteger(incidentIndex)) {
      this.set(`incidents.${incidentIndex}.__errorMessage`, msg);
    } else {
      this.set('newEventErrorMessage', msg);
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
