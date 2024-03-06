# Cortex XSOAR
### Operating System for Enterprise Security

# Polarity Cortex XSOAR Integration

![image](https://img.shields.io/badge/status-beta-green.svg)

Polarity's Cortex XSOAR integration allows automated queries against Cortex XSOAR's incident database, create incidents from entities, and allows a user to execute pre-defined playbooks from the Polarity overlay window.

## Normal Incident and Incidator with Playbook History
<div style="display:flex; justify-content:flex-start; align-items:flex-start;">
  <img width="400" alt="Integration Example Incident Info" src="./assets/indicator-creation-2.png">
  <img width="404" alt="Integration Example Incident History" src="./assets/incident-playbook-history.png">
</div>

## Create New Incident
<div style="display:flex; justify-content:flex-start; align-items:flex-start;">
  <img width="402" alt="Integration Example New Incident" src="./assets/incident-creation-1.png">
  <img width="400" alt="Integration Example New Incident Created" src="./assets/incident-creation-2.png">
</div>
<div style="display:flex; justify-content:flex-start; align-items:flex-start;">
  <img width="402" alt="Integration Example New Incident Created Playbooks" src="./assets/incident-creation-3.png">
</div>

## Create New Indicator
<div style="display:flex; justify-content:flex-start; align-items:flex-start;">
  <img width="402" alt="Integration Example New Indicator" src="./assets/indicator-creation-1.png">
  <img width="400" alt="Integration Example New Indicator Created" src="./assets/indicator-creation-2.png">
</div>

> To learn more about Cortex XSOAR, visit the [official website](https://register.paloaltonetworks.com/introducingcortexxsoar).


## Cortex XSOAR Integration Options

### Server URL

The Server URL where the Cortex XSOAR API instance is located.  The Server URL should include the schema (https) and the fully qualified domain name of the Cortex XSOAR server.

### API Key

The API token to use to authenticate with the Cortex XSOAR server.  See the official documentation for instructions on setting up an API token. 

> If you are running a multi-tenant deployment, the API key must be generated specifically for the tenant you wish to search. 

### Allow Indicator Creation

If checked, users will be able to create Indicators when searching On Demand if there are none currently existing for your searched entity. This setting must be visible to all users.

### Allow Incident Creation

If checked, users will be able to create incidents when searching On Demand if there are none currently existing for your searched entity.

### Allow Evidence Submissions

If checked, users will be able to submit data from selected Polarity integrations as Incident evidence.  This setting must be visible to all users.

## Querying and Creation Details

> When creating an Incident the Incident's Name is set to the entity's Value and a "Polarity" label is included.  You can optionally run a Playbook upon incident creation.

## Troubleshooting

### Invalid API Key

If you see the following error it typically means the API key is invalid:

```json
{
  "id":"forbidden",
  "status":403,
  "title":"Forbidden",
  "detail":"Issue with CSRF code",
  "error":"http: named cookie not present",
  "encrypted":false,
  "multires":null
}
```

Also ensure the API key is generated for the tenet you wish to search if you have a multi-tenet deployment.

## Installation Instructions

Installation instructions for integrations are provided on the [PolarityIO GitHub Page](https://polarityio.github.io/).


## Polarity

Polarity is a memory-augmentation platform that improves and accelerates analyst decision making.  For more information about the Polarity platform please see:

https://polarity.io/
