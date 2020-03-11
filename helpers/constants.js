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
  "category"
];

const IGNORED_IPS = new Set(["127.0.0.1", "255.255.255.255", "0.0.0.0"]);

const PLAYBOOK_SEARCH_TERMS = {
  ip: "ip address",
  hash: "file hash",
  domain: "domain",
  email: "email"
};

module.exports = {
  IGNORED_IPS,
  RELEVANT_INDICATOR_SEARCH_RESULT_KEYS,
  PLAYBOOK_SEARCH_TERMS
};
