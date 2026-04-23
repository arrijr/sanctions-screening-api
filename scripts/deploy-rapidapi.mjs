#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const apiRootDir = path.resolve(__filename, '../..');
const API_NAME = path.basename(apiRootDir);
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const API_ID = process.env.RAPIDAPI_API_ID;

async function main() {
  if (!RAPIDAPI_KEY) {
    console.error('❌ RAPIDAPI_KEY ist nicht gesetzt!');
    process.exit(1);
  }

  const openapiPath = path.join(apiRootDir, 'openapi.yaml');
  const listingPath = path.join(apiRootDir, 'RAPIDAPI_LISTING.md');

  if (!fs.existsSync(openapiPath)) {
    console.error(`❌ openapi.yaml nicht gefunden`);
    process.exit(1);
  }
  if (!fs.existsSync(listingPath)) {
    console.error(`❌ RAPIDAPI_LISTING.md nicht gefunden`);
    process.exit(1);
  }

  console.log(`\n📦 Deploying: ${API_NAME}`);

  try {
    const rawYaml = fs.readFileSync(openapiPath, 'utf8');
    const listingContent = fs.readFileSync(listingPath, 'utf8');
    const doc = yaml.load(rawYaml);

    if (!doc.info) throw new Error('OpenAPI spec hat kein info-Objekt');

    doc.info['x-category'] = doc.info['x-category'] || 'Utilities';
    doc.info['x-website'] = doc.info['x-website'] || `https://${API_NAME}.vercel.app`;
    doc.info['x-thumbnail'] = doc.info['x-thumbnail'] || null;
    doc.info['x-long-description'] = listingContent;

    const modifiedYaml = yaml.dump(doc, { lineWidth: -1 });
    const fileBlob = new Blob([modifiedYaml], { type: 'application/x-yaml' });
    const file = new File([fileBlob], 'openapi.yaml', { type: 'application/x-yaml' });
    const formData = new FormData();
    formData.append('fileFormat', 'openapi');
    formData.append('file', file);

    const host = 'platform-rest.p.rapidapi.com';
    let url = `https://${host}/v1/apis/rapidapi-file`;
    let method = 'POST';

    if (API_ID) {
      url = `https://${host}/v1/apis/${API_ID}/rapidapi-file`;
      method = 'PUT';
      console.log(`🔄 Updating API (ID: ${API_ID})`);
    } else {
      console.log(`➕ Creating new API`);
    }

    console.log(`📤 Uploading to RapidAPI...`);

    const res = await fetch(url, {
      method,
      headers: {
        'x-rapidapi-host': host,
        'x-rapidapi-key': RAPIDAPI_KEY,
      },
      body: formData,
    });

    const contentType = res.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      console.log('Response (non-JSON):', text);
      data = {};
    }

    if (!res.ok) {
      console.error(`\n❌ HTTP ${res.status}: RapidAPI Deployment fehlgeschlagen`);
      console.error('Response:', data);
      process.exit(1);
    }

    console.log('\n✅ Deployment erfolgreich!');
    console.log(`   Status: ${res.status}`);
    if (data.uid) console.log(`   UID: ${data.uid}`);
    if (data.id) console.log(`   ID: ${data.id}`);
    
    console.log('\n📌 Injizierte Metadaten:');
    console.log(`   x-category: ${doc.info['x-category']}`);
    console.log(`   x-website: ${doc.info['x-website']}`);
    console.log(`   x-long-description: ${listingContent.split('\n')[0].slice(0, 60)}...`);

  } catch (error) {
    console.error(`\n❌ Fehler: ${error.message}`);
    if (error.cause) console.error(`Ursache: ${error.cause.message}`);
    process.exit(1);
  }
}

main();
