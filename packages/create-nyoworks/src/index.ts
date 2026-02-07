#!/usr/bin/env node

import { createProject } from "./init.js"

const args = process.argv.slice(2)
const projectName = args[0]

createProject(projectName)
