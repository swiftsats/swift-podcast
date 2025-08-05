import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function validateRSSStructure(xmlContent: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for XML declaration
  if (!xmlContent.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('Missing XML declaration');
  }

  // Check for RSS opening tag
  if (!xmlContent.includes('<rss version="2.0"')) {
    errors.push('Missing RSS opening tag');
  }

  // Check for channel opening tag
  if (!xmlContent.includes('<channel>')) {
    errors.push('Missing channel opening tag');
  }

  // Check for channel closing tag
  if (!xmlContent.includes('</channel>')) {
    errors.push('Missing channel closing tag');
  }

  // Check for RSS closing tag
  if (!xmlContent.includes('</rss>')) {
    errors.push('Missing RSS closing tag');
  }

  // Check tag balance
  const openTags = (xmlContent.match(/<[^/][^>]*>/g) || []).length;
  const closeTags = (xmlContent.match(/<\/[^>]*>/g) || []).length;

  if (openTags !== closeTags) {
    errors.push(`Tag balance mismatch: ${openTags} opening tags, ${closeTags} closing tags`);
  }

  // Check for proper nesting
  const lines = xmlContent.split('\n');
  let indentLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('</')) {
      indentLevel--;
    }

    // Check if indentation matches expected level
    const actualIndent = lines[i].length - lines[i].trimStart().length;
    const expectedIndent = indentLevel * 2;

    if (actualIndent !== expectedIndent && line.length > 0) {
      errors.push(`Indentation mismatch at line ${i + 1}: expected ${expectedIndent} spaces, got ${actualIndent}`);
    }

    if (line.startsWith('<') && !line.startsWith('</') && !line.endsWith('/>')) {
      indentLevel++;
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function main() {
  try {
    const rssPath = join(__dirname, '..', 'dist', 'rss.xml');
    const rssContent = readFileSync(rssPath, 'utf-8');

    console.log('🔍 Validating RSS feed structure...\n');

    const validation = validateRSSStructure(rssContent);

    if (validation.valid) {
      console.log('✅ RSS feed structure is valid!');
      console.log('\n📊 RSS Feed Info:');
      console.log(`   Total lines: ${rssContent.split('\n').length}`);
      console.log(`   File size: ${rssContent.length} characters`);
      console.log(`   Has items: ${rssContent.includes('<item>') ? 'Yes' : 'No'}`);
      console.log(`   Has channel: ${rssContent.includes('<channel>') ? 'Yes' : 'Yes'}`);
    } else {
      console.log('❌ RSS feed structure has issues:');
      validation.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('\n📝 First 10 lines:');
    console.log(rssContent.split('\n').slice(0, 10).map((line, i) => `   ${i + 1}: ${line}`).join('\n'));

    console.log('\n📝 Last 10 lines:');
    console.log(rssContent.split('\n').slice(-10).map((line, i) => `   ${rssContent.split('\n').length - 9 + i}: ${line}`).join('\n'));

  } catch (error) {
    console.error('❌ Error reading RSS file:', error);
    process.exit(1);
  }
}

main();