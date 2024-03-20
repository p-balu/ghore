#!/usr/bin/env node
const { run } = require("@oclif/core");

run().then(require("@oclif/core/flush")).catch(require("@oclif/core/handle"));
