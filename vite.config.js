import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Custom resolver for the base44 flat-file structure.
 *
 * base44 stored all files in a single flat directory. Imports use virtual
 * paths like @/pages/Dashboard, @/components/ui/button, @/lib/utils, etc.
 * This plugin resolves them by matching the last path segment against the
 * root-level files, with a few normalisation rules for known mismatches.
 */
function base44FlatResolver() {
  // Build a map: lowercase-basename-without-ext → absolute file path
  const fileMap = {}
  const rootFiles = fs.readdirSync(__dirname).filter(f =>
    /\.(jsx|js|ts|tsx|css)$/.test(f) && !f.startsWith('vite.config')
  )
  for (const file of rootFiles) {
    const base = path.basename(file, path.extname(file)).toLowerCase()
    fileMap[base] = path.join(__dirname, file)
  }

  // Explicit overrides for known mismatches between import name and file name
  const overrides = {
    'utils':               fileMap['util'],
    'statsrow':            fileMap['statrows'],
    'recentsubmissions':   fileMap['recentsubmission'],
    'streaknotification':  fileMap['streaknotifications'],
    'minicalendar':        fileMap['minicalender'],
  }

  return {
    name: 'base44-flat-resolver',
    enforce: 'pre',
    resolveId(id) {
      if (!id.startsWith('@/')) return null

      const stripped = id.slice(2) // remove '@/'

      // Try a direct root file match first (handles @/index.css, @/App.jsx, etc.)
      const directPath = path.join(__dirname, stripped)
      if (fs.existsSync(directPath)) return directPath

      // Extract last segment as the "component name"
      const parts = stripped.split('/')
      let lastSeg = parts[parts.length - 1].toLowerCase()
      // Strip any extension the import might include
      lastSeg = lastSeg.replace(/\.(jsx|js|ts|tsx|css)$/, '')

      if (overrides[lastSeg]) return overrides[lastSeg]
      if (fileMap[lastSeg]) return fileMap[lastSeg]

      // Normalisation: try trimming a trailing 's' (plural → singular)
      if (lastSeg.endsWith('s')) {
        const singular = lastSeg.slice(0, -1)
        if (fileMap[singular]) return fileMap[singular]
      }

      // Normalisation: try adding 's' (singular → plural)
      if (fileMap[lastSeg + 's']) return fileMap[lastSeg + 's']

      return null
    },
  }
}

export default defineConfig({
  logLevel: 'error',
  plugins: [
    base44FlatResolver(),
    react(),
  ],
})
