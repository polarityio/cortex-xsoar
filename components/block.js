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
  timezone: Ember.computed('Intl', function() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }),
  actions: {
    changeTab: function(incidentIndex, tabName) {
      this.set(`incidents.${incidentIndex}.__activeTab`, tabName);
    },
    runPlaybook: function(incidentIndex, incidentId, playbookId) {
      let self = this;

      if (!playbookId)
        return self.setMessage(incidentIndex, 'Select a playbook to run.');

      this.setMessage(incidentIndex, '');
      this.setRunning(incidentIndex, true);
      this.get('block').notifyPropertyChange('data');

      self
        .sendIntegrationMessage({
          data: { entityValue: this.block.entity.value, incidentId, playbookId }
        })
        .then(({ err, playbooksRan, playbooksRanCount, newIndicator, status }) => {
          if (newIndicator) {
            self.setIndicator(newIndicator);
            incidentIndex = 0;
          } else {
            self.setPlaybookRunHistory(incidentIndex, playbooksRan, playbooksRanCount);
          }

          if (err) {
            self.setMessage(incidentIndex, `Run Failed: ${err.message || err.title}`);
          } else {
            self.setMessage(incidentIndex, `Successfully Ran Playbook: ${status}`);
          }
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

  setPlaybookRunHistory(incidentIndex, playbooksRan, playbooksRanCount) {
    this.set(`incidents.${incidentIndex}.playbooksRan`, playbooksRan);
    this.set(`incidents.${incidentIndex}.playbooksRanCount`, playbooksRanCount);
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
