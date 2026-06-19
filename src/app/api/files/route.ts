import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

type FileNode = {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

const IGNORE_LIST = [
  'node_modules',
  '.git',
  '.next',
  '.agents',
  'package-lock.json',
  '.env.local',
  '.env'
]

function getFileTree(dirPath: string, relativePath = ''): FileNode[] {
  const items = fs.readdirSync(dirPath)
  const result: FileNode[] = []

  for (const item of items) {
    if (IGNORE_LIST.includes(item)) continue

    const absolutePath = path.join(dirPath, item)
    const relPath = relativePath ? path.join(relativePath, item) : item
    const stat = fs.statSync(absolutePath)

    if (stat.isDirectory()) {
      result.push({
        name: item,
        path: relPath.replace(/\\/g, '/'),
        type: 'directory',
        children: getFileTree(absolutePath, relPath)
      })
    } else {
      result.push({
        name: item,
        path: relPath.replace(/\\/g, '/'),
        type: 'file'
      })
    }
  }

  // Sort directories first, then files alphabetically
  return result.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1
    }
    return a.name.localeCompare(b.name)
  })
}

export async function GET() {
  try {
    const rootDir = process.cwd()
    const tree = getFileTree(rootDir)
    return NextResponse.json(tree)
  } catch (error) {
    console.error('Failed to read files', error)
    return NextResponse.json({ error: 'Failed to read directory' }, { status: 500 })
  }
}
