#!/usr/bin/env node
// bin/cocoro.js - エントリポイントシム
import('../dist/index.js').catch(err => {
    console.error('Error loading cocoro-cli:', err.message)
    process.exit(1)
})
