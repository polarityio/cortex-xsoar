const RELEVANT_INDICATOR_SEARCH_RESULT_KEYS = [
  "id",
  "type",
  "name",
  "reason",
  "created",
  "severity",
  "labels",
  "details",
  "owner",
  "category",
  "pbHistory"
];

const IGNORED_IPS = new Set(["127.0.0.1", "255.255.255.255", "0.0.0.0"]);

const PLAYBOOK_SEARCH_TERMS = {
  ip: "ip address",
  hash: "file hash",
  domain: "domain",
  email: "email"
};

const HUMAN_READABLE_SEVERITY_LEVELS = {
  "0": 'Unknown',
  "0.5": 'Informational',
  "1": 'Low',
  "2": 'Medium',
  "3": 'High',
  "4": 'Critical'
};

module.exports = {
  IGNORED_IPS,
  RELEVANT_INDICATOR_SEARCH_RESULT_KEYS,
  PLAYBOOK_SEARCH_TERMS,
  HUMAN_READABLE_SEVERITY_LEVELS
};
