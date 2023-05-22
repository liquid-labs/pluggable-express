import * as path from 'path'

import findPlugins from 'find-plugins'

import { registerHandlers } from './register-handlers'

const defaultPluginPath = path.join(process.env.HOME, '.liq', 'plugins', 'core')
// Everything in the plugin pkg is a plugin in
// const pluginFilter = (pkgInfo) => pkgInfo.pkg.liq?.labels?.some((l) => l === PLUGIN_LABEL)

/**
 * Loads a single plugin.
 */
const loadPlugin = async({ app, cache, model, reporter, dir, pkg }) => {
  const { main, name: sourcePkg } = pkg
  const { handlers, name = 'UNKNOWN', setup, summary } = await import(`${dir}/${main}`) || {}
  if (handlers === undefined && setup === undefined) {
    throw new Error(`'liq-core' plugin from '${sourcePkg}' does not export 'handlers' or 'setup'; bailing out.`)
  }

  if (setup !== undefined) reporter.log(`Running setup for ${sourcePkg} plugins...`)
  const setupData = setup ? setup({ app, model, reporter }) : {}

  let handlersInfo = []
  if (handlers !== undefined) {
    handlersInfo = registerHandlers(app, { sourcePkg, handlers, model, reporter, setupData, cache })
  }

  app.liq.plugins.push({ name, summary, handlersInfo })
}

/**
 * Given an app, model, cache, reporter, and plugin path, loads plugins from the path.
 */
const loadPlugins = async(app, {
  model,
  cache,
  reporter,
  pluginPath = process.env.LIQ_PLUGIN_PATH || defaultPluginPath
}) => {
  const pluginPkg = path.join(pluginPath, 'package.json')
  const pluginDir = path.join(pluginPath, 'node_modules')
  reporter.log(`Searching for plugins (in ${path.dirname(pluginDir)})...`)
  const pluginOptions = {
    pkg    : pluginPkg,
    dir    : pluginDir,
    filter : () => true
  }

  const plugins = findPlugins(pluginOptions)

  reporter.log(plugins.length === 0 ? 'No plugins found.' : `Found ${plugins.length} plugins.`)

  for (const plugin of plugins) {
    await loadPlugin({ app, cache, model, reporter, ...plugin })
  }
}

export {
  defaultPluginPath,
  loadPlugin,
  loadPlugins
}
