const { execFileSync } = require('child_process')

export function initServer(feature) {
  return JSON.parse(execFileSync("node", [process.env.E2E_BIN, feature]).toString())
}
