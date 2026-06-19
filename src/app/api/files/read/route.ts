import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const filePath = searchParams.get('path')

  if (!filePath) {
    return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 })
  }

  // Prevent path traversal
  const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '')
  const absolutePath = path.join(process.cwd(), normalizedPath)

  // Double check path is within project root
  const rootDir = process.cwd()
  if (!absolutePath.startsWith(rootDir)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  if (!fs.existsSync(absolutePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const stat = fs.statSync(absolutePath)
  if (!stat.isFile()) {
    return NextResponse.json({ error: 'Not a file' }, { status: 400 })
  }

  // Restrict to readable extensions
  const allowedExtensions = [
    '.ts', '.tsx', '.json', '.css', '.md', '.js', '.mjs', '.html',
    '.example', '.gitignore', '.config'
  ]
  const ext = path.extname(absolutePath).toLowerCase()
  const fileName = path.basename(absolutePath).toLowerCase()

  const isAllowedExt = allowedExtensions.includes(ext)
  const isAllowedName = fileName === '.gitignore' || fileName === '.env.example'

  if (!isAllowedExt && !isAllowedName) {
    return NextResponse.json({ error: 'File type not allowed for reading' }, { status: 403 })
  }

  try {
    const content = fs.readFileSync(absolutePath, 'utf-8')
    return NextResponse.json({ content })
  } catch (error) {
    console.error('Failed to read file content', error)
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 })
  }
}
