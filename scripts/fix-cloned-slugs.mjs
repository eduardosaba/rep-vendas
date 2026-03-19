#!/usr/bin/env node
import fs from 'fs'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' })
} else {
  dotenv.config()
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env or .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const defaultUsers = [
  '51df4c8a-8590-4ed1-b63c-bdce44888caa',
  'fe7ea2fc-afd4-4310-a080-266fca8186a7',
]

const refsDefault = [
  'TH 2283 8RU','TH 2282 8RU','TH 2285/S 807','TH 2284/S 807','TH 2264/S 807',
  'TH 2198 PJP','TH 2225/S 807','TH 2227 807','TH 2230 807','TH 2147 807',
  'TH 2141 XW0','TH 2139 TI7','TH 2144/S 08A','TH 2142/S 807','TH 2146 807',
  'TH 2091 003','TH 2091 003','TH 2100/S JBW','TH 1543 003','TH 1543 003'
]

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (const arg of args) {
    if (arg.startsWith('--users=')) out.users = arg.replace('--users=', '').split(',').map(s => s.trim()).filter(Boolean)
    if (arg.startsWith('--refs=')) out.refs = arg.replace('--refs=', '').split(',').map(s => s.trim()).filter(Boolean)
  }
  return out
}

function slugify(input) {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

async function slugExists(slug, ignoreId = null) {
  let q = supabase.from('products').select('id').eq('slug', slug).limit(5)
  const { data, error } = await q
  if (error) throw error
  if (!data || data.length === 0) return false
  if (!ignoreId) return true
  return data.some(r => r.id !== ignoreId)
}

async function buildUniqueSlug(referenceCode, userId, ignoreId = null) {
  const baseRef = slugify(referenceCode || 'produto')
  const userSuffix = String(userId).replace(/-/g, '').slice(0, 8)
  const base = `${baseRef}-${userSuffix}`

  for (let i = 0; i < 30; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`
    const exists = await slugExists(candidate, ignoreId)
    if (!exists) return candidate
  }

  return `${base}-${crypto.randomUUID().slice(0, 6)}`
}

async function main() {
  const { users, refs } = parseArgs()
  const userIds = users && users.length ? users : defaultUsers
  const references = Array.from(new Set((refs && refs.length ? refs : refsDefault)))

  let updated = 0
  let skipped = 0

  console.log('Fixing slugs for users:', userIds.join(', '))
  console.log('References:', references.length)

  for (const userId of userIds) {
    for (const ref of references) {
      const { data: rows, error } = await supabase
        .from('products')
        .select('id, reference_code, slug, user_id')
        .eq('user_id', userId)
        .ilike('reference_code', ref)

      if (error) {
        console.error('Query error for', userId, ref, error.message)
        continue
      }

      if (!rows || rows.length === 0) {
        skipped += 1
        continue
      }

      for (const row of rows) {
        const newSlug = await buildUniqueSlug(row.reference_code, row.user_id, row.id)
        if (row.slug === newSlug) {
          skipped += 1
          continue
        }

        const { error: upErr } = await supabase
          .from('products')
          .update({ slug: newSlug, updated_at: new Date().toISOString() })
          .eq('id', row.id)

        if (upErr) {
          console.error('Update failed', row.id, upErr.message)
          continue
        }

        updated += 1
        console.log('Updated', row.reference_code, row.id, '=>', newSlug)
      }
    }
  }

  console.log('Done. Updated:', updated, 'Skipped:', skipped)
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err)
  process.exit(1)
})
