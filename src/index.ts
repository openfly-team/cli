#!/usr/bin/env node
import ejs from 'ejs'

const content = ejs.render(`
Hello <%= name %>
`, { name: "world"})
console.log(content);
