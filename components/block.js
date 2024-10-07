polarity.export = PolarityComponent.extend({
  timezone: Ember.computed('Intl', function () {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }),
  playbooksByEntityTypeLoaded: false,
  notificationsData: Ember.inject.service('notificationsData'),
  state: Ember.computed.alias('block._state'),
  details: Ember.computed.alias('block.data.details'),
  summary: Ember.computed.alias('block.data.summary'),
  incidents: Ember.computed.alias('details.incidents'),
  indicators: Ember.computed.alias('details.indicators'),
  evidence: Ember.computed.alias('details.evidence'),
  playbooks: Ember.computed.alias('details.playbooks'),
  allowIncidentCreation: Ember.computed.alias('block.userOptions.allowIncidentCreation'),
  allowIndicatorCreation: Ember.computed.alias(
    'block.userOptions.allowIndicatorCreation'
  ),
  numSelectedWriteIntegrations: Ember.computed(
    'state.integrations.@each.selected',
    function () {
      let selectedCount = 0;
      let integrations = this.get('state.integrations');
      if (integrations) {
        integrations.forEach((integration) => {
          if (integration.selected) {
            selectedCount++;
          }
        });
      }
      return selectedCount;
    }
  ),
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

    if (!this.get('block._state')) {
      this.set('block._state', {});
      this.set('state.missingIncidentId', false);
      this.set('state.missingIntegrations', false);
      if (this.get('indicators.length')) {
        this.set('state.activeTab', 'indicators');
      } else if (this.get('incidents.length')) {
        this.set('state.activeTab', 'incidents');
      } else if (this.get('evidence.length')) {
        this.set('state.activeTab', 'evidence');
      } else if (this.get('allowIndicatorCreation')) {
        this.set('state.activeTab', 'indicators');
      } else {
        this.set('state.activeTab', 'incidents');
      }
    }

    if (
      this.get('state.activeTab') === 'incidents' &&
      this.get('playbooksByEntityTypeLoaded') === false
    ) {
      this.set('loadingPlaybooksByEntityType', true);
      this.getPlaybooksByEntityType().then(() => {
        this.set('playbooksByEntityTypeLoaded', true);
      }).finally(() => {
        this.set('loadingPlaybooksByEntityType', false);
      });
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
          if (!this.isDestroyed) {
            outerThis.setMessage(null, '');
            outerThis.setErrorMessage(null, '');
            outerThis.get('block').notifyPropertyChange('data');
          }
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
          if (!this.isDestroyed) {
            outerThis.setMessage(null, '');
            outerThis.setErrorMessage(null, '');
            outerThis.get('block').notifyPropertyChange('data');
          }
        }, 5000);
        resolve();
      });
  },
  getPlaybooksByEntityType: function () {
    return new Ember.RSVP.Promise((resolve, reject) => {
      const payload = {
        action: 'getPlaybooksByEntityType',
        data: {
          entity: this.get('block.entity')
        }
      };

      this.sendIntegrationMessage(payload)
        .then((result) => {
          this.set('playbooks', result.playbooks);
          resolve();
        })
        .catch((err) => {
          console.error(err);
          this.setErrorMessage(
            null,
            'Get Playbooks for Entity Failed: ' +
              (err &&
                (err.detail || err.err || err.message || err.title || err.description)) ||
              'Unknown Reason'
          );
          reject();
        })
        .finally(() => {
          setTimeout(() => {
            if (!this.isDestroyed) {
              this.setMessage(null, '');
              this.setErrorMessage(null, '');
            }
          }, 5000);
        });
    });
  },

  getPlaybookRunHistoryForIncident: function (incidentIndex) {
    return new Ember.RSVP.Promise((resolve, reject) => {
      this.set(`incidents.${incidentIndex}.__playbookRunHistoryLoading`, true);
      const incidentId = this.get(`incidents.${incidentIndex}.incident.id`);
      const payload = {
        action: 'getPlaybookRunHistoryForIncident',
        data: {
          incidentId
        }
      };

      this.sendIntegrationMessage(payload)
        .then((result) => {
          this.set(`incidents.${incidentIndex}.incident.pbHistory`, result.pbHistory);
          resolve();
        })
        .catch((err) => {
          this.setErrorMessage(
            null,
            'Get Playbooks for Incident Failed: ' +
              (err &&
                (err.detail || err.err || err.message || err.title || err.description)) ||
              'Unknown Reason'
          );
          reject();
        })
        .finally(() => {
          this.set(`incidents.${incidentIndex}.__playbookRunHistoryLoading`, false);
          setTimeout(() => {
            if (!this.isDestroyed) {
              this.setMessage(null, '');
              this.setErrorMessage(null, '');
            }
          }, 5000);
        });
    });
  },

  actions: {
    getPlaybooksByEntityType: function (incidentIndex) {
      if (this.get('playbooksByEntityTypeLoaded') === false) {
        this.set(`incidents.${incidentIndex}.__loadingPlaybooksByEntityType`, true);
        return this.getPlaybooksByEntityType(incidentIndex).then(() => {
          this.set('playbooksByEntityTypeLoaded', true);
          this.set(`incidents.${incidentIndex}.__loadingPlaybooksByEntityType`, false);
        });
      }
    },
    toggleAllIntegrations: function () {
      const hasUnSelected = this.get('state.integrations').some(
        (integration) => !integration.selected
      );
      if (hasUnSelected) {
        // toggle all integrations on if at least one integration is not selected
        this.get('state.integrations').forEach((integration, index) => {
          this.set(`state.integrations.${index}.selected`, true);
        });
      } else {
        // all integrations are selected so toggle them all off
        this.get('state.integrations').forEach((integration, index) => {
          this.set(`state.integrations.${index}.selected`, false);
        });
      }
    },
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
      if (
        tabName === 'history' &&
        !this.get(`incidents.${incidentIndex}.__playbookRunHistoryLoaded`)
      ) {
        this.getPlaybookRunHistoryForIncident(incidentIndex).then(() => {
          this.set(`incidents.${incidentIndex}.__playbookRunHistoryLoaded`, true);
        });
      }

      this.set(`incidents.${incidentIndex}.__activeTab`, tabName);
    },
    changeTopTab: function (tabName) {
      this.set('state.activeTab', tabName);
      if (tabName === 'write' && !Array.isArray(this.get('state.integrations'))) {
        this.setIntegrationSelection();
      }
      if (tabName === 'incidents' && this.get('playbooksByEntityTypeLoaded') === false) {
        this.set('loadingPlaybooksByEntityType', true);
        return this.getPlaybooksByEntityType().then(() => {
          this.set('playbooksByEntityTypeLoaded', true);
        }).finally(() => {
          this.set('loadingPlaybooksByEntityType', false);
        });
      }
    },

    refreshIntegrations: function () {
      this.set('state.spinRefresh', true);
      this.setIntegrationSelection();
      setTimeout(() => {
        if (!this.isDestroyed) {
          this.set('state.spinRefresh', false);
        }
      }, 1000);
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
    addEvidence: function (incidentId) {
      this.set('state.showStatusMessage', false);
      this.set('state.statusMessageType', '');
      this.set('state.success', false);
      this.set('state.xsoarIncidentId', incidentId);
      this.set('state.missingIncidentId', false);
      this.setIntegrationSelection();
      this.set('state.activeTab', 'write');
    },
    evidenceIncidentIdChanged: function (incidentId) {
      if (incidentId === 'custom_id') {
        this.set('state.showCustomIncidentId', true);
        this.set('state.xsoarIncidentId', '');
      } else {
        this.set('state.xsoarIncidentId', incidentId);
        this.set('state.showCustomIncidentId', false);
      }

      this.set('state.success', false);
    },
    // This method submits evidence for the selected `state.xsoarIncidentId`
    writeIntegrationData: function () {
      this.set('state.missingIncidentId', false);
      this.set('state.missingIntegrations', false);
      const integrationData = this.get('state.integrations');
      const xsoarIncidentId = this.get('state.xsoarIncidentId');
      this.set('state.writeErrorMessage', '');

      const selectedIntegrations = this.get('state.integrations').filter(
        (integration) => integration.selected
      );

      if (typeof xsoarIncidentId === 'undefined') {
        this.set('state.missingIncidentId', true);
      }

      if (selectedIntegrations.length === 0) {
        this.set('state.missingIntegrations', true);
      }

      if (this.get('state.missingIntegrations') || this.get('state.missingIncidentId')) {
        return;
      }

      this.set('state.success', false);
      this.set('state.isWriting', true);

      const payload = {
        action: 'writeToIncident',
        data: {
          entityValue: this.get('block.entity.value'),
          incidentId: xsoarIncidentId,
          integrations: selectedIntegrations
        }
      };

      this.sendIntegrationMessage(payload)
        .then((response) => {
          this.set('state.success', true);
          this.set('state.writeStatus', 'Results pushed successfully');
          this.set('state.successIncidentId', xsoarIncidentId);
          this.set('state.statusMessageType', '');
          this.set('state.statusMessage', 'Evidence submitted');
        })
        .catch((err) => {
          if (err.meta && err.meta.detail) {
            this.set('state.writeErrorMessage', err.meta.detail);
          } else if (err.meta) {
            this.set('state.writeErrorMessage', JSON.stringify(err.meta, null, 2));
          } else {
            this.set('state.writeErrorMessage', JSON.stringify(err, null, 2));
          }

          this.set('state.success', false);
          this.set('state.statusMessage', 'Error adding evidence');
          this.set('state.statusMessageType', 'error');
        })
        .finally(() => {
          this.set('state.isWriting', false);
          this.set('state.showStatusMessage', true);
          setTimeout(() => {
            if (!this.isDestroyed) {
              this.set('state.showStatusMessage', false);
            }
          }, 3000);
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
            if (!this.isDestroyed) {
              outerThis.set('indicatorMessage', '');
              outerThis.set('indicatorErrorMessage', '');
              outerThis.get('block').notifyPropertyChange('data');
            }
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
          outerThis.setRunning(null, false);
          outerThis.get('block').notifyPropertyChange('data');
          setTimeout(() => {
            if (!this.isDestroyed) {
              outerThis.setMessage(incidentIndex, '');
              outerThis.setErrorMessage(incidentIndex, '');
              outerThis.get('block').notifyPropertyChange('data');
            }
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
    this.set(`incidents.${incidentIndex}.incident.pbHistory`, pbHistory);
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
  },
  setIntegrationSelection: function () {
    let integrationData = this.getIntegrationData();
    let annotations = this.getAnnotations();
    if (Array.isArray(annotations) && annotations.length > 0) {
      integrationData.unshift({
        integrationName: 'Polarity Annotations',
        data: annotations,
        selected: false
      });
    }
    this.set('state.integrations', integrationData);
  },
  getIntegrationData: function () {
    const notificationList = this.notificationsData.getNotificationList();
    const integrationBlocks = notificationList.findByValue(
      this.get('block.entity.value').toLowerCase()
    );
    return integrationBlocks.blocks.reduce((accum, block) => {
      if (
        block.integrationName !== this.get('block.integrationName') &&
        block.type !== 'polarity'
      ) {
        accum.push({
          integrationName: block.integrationName,
          data: block.data,
          selected: false
        });
      }
      return accum;
    }, []);
  },
  getAnnotations: function () {
    const notificationList = this.notificationsData.getNotificationList();
    const integrationBlocks = notificationList.findByValue(
      this.get('block.entity.value').toLowerCase()
    );
    const polarityBlock = integrationBlocks.blocks.find((block) => {
      if (block.type === 'polarity') {
        return block;
      }
    });
    if (polarityBlock) {
      let annotations = [];
      polarityBlock.tagEntityPairs.forEach((pair) => {
        annotations.push({
          tag: pair.tag.tagName,
          channel: pair.channel.channelName,
          user: pair.get('user.username'),
          applied: pair.applied
        });
      });
      return annotations;
    }
    return null;
  }
});
