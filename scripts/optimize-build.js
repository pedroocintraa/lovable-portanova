#!/usr/bin/env node

/**
 * Post-build optimization script
 * Runs additional optimizations after Vite build
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '../dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');

console.log('🚀 Starting post-build optimizations...');

// Function to get file size in KB
const getFileSize = (filePath) => {
  const stats = fs.statSync(filePath);
  return (stats.size / 1024).toFixed(2);
};

// Function to compress CSS
const compressCSS = () => {
  console.log('📦 Compressing CSS...');
  
  const cssFiles = fs.readdirSync(ASSETS_DIR)
    .filter(file => file.endsWith('.css'));
  
  cssFiles.forEach(file => {
    const filePath = path.join(ASSETS_DIR, file);
    const originalSize = getFileSize(filePath);
    
    let css = fs.readFileSync(filePath, 'utf8');
    
    // Remove comments
    css = css.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove unnecessary whitespace
    css = css.replace(/\s+/g, ' ');
    css = css.replace(/;\s*}/g, '}');
    css = css.replace(/\s*{\s*/g, '{');
    css = css.replace(/;\s*/g, ';');
    css = css.trim();
    
    fs.writeFileSync(filePath, css);
    
    const newSize = getFileSize(filePath);
    console.log(`  ✅ ${file}: ${originalSize}KB → ${newSize}KB (${((originalSize - newSize) / originalSize * 100).toFixed(1)}% reduction)`);
  });
};

// Function to analyze bundle size
const analyzeBundleSize = () => {
  console.log('📊 Analyzing bundle sizes...');
  
  const files = fs.readdirSync(ASSETS_DIR);
  let totalSize = 0;
  
  console.log('\n📁 Asset sizes:');
  
  files.forEach(file => {
    const filePath = path.join(ASSETS_DIR, file);
    const size = parseFloat(getFileSize(filePath));
    totalSize += size;
    
    let sizeColor = '';
    if (size > 500) sizeColor = '🔴'; // Red for large files
    else if (size > 200) sizeColor = '🟡'; // Yellow for medium files
    else sizeColor = '🟢'; // Green for small files
    
    console.log(`  ${sizeColor} ${file}: ${size}KB`);
  });
  
  console.log(`\n📦 Total bundle size: ${totalSize.toFixed(2)}KB`);
  
  // Warn about large files
  files.forEach(file => {
    const size = parseFloat(getFileSize(path.join(ASSETS_DIR, file)));
    if (size > 500) {
      console.log(`⚠️  Warning: ${file} is quite large (${size}KB). Consider code splitting.`);
    }
  });
};

// Function to generate performance report
const generatePerformanceReport = () => {
  console.log('📋 Generating performance report...');
  
  const files = fs.readdirSync(ASSETS_DIR);
  const report = {
    timestamp: new Date().toISOString(),
    assets: files.map(file => ({
      name: file,
      size: `${getFileSize(path.join(ASSETS_DIR, file))}KB`,
      type: path.extname(file)
    })),
    recommendations: []
  };
  
  // Add recommendations based on file sizes
  files.forEach(file => {
    const size = parseFloat(getFileSize(path.join(ASSETS_DIR, file)));
    
    if (file.includes('index') && size > 400) {
      report.recommendations.push('Consider implementing more aggressive code splitting for the main bundle');
    }
    
    if (file.includes('.css') && size > 50) {
      report.recommendations.push('CSS bundle is large - consider critical CSS extraction');
    }
    
    if (file.includes('vendor') && size > 300) {
      report.recommendations.push('Vendor bundle is large - review dependencies and consider tree shaking');
    }
  });
  
  fs.writeFileSync(
    path.join(DIST_DIR, 'performance-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('✅ Performance report saved to dist/performance-report.json');
};

// Function to optimize images (if any are found)
const optimizeImages = () => {
  console.log('🖼️  Checking for images to optimize...');
  
  const imageFiles = fs.readdirSync(DIST_DIR)
    .filter(file => /\.(png|jpg|jpeg|svg)$/i.test(file));
  
  if (imageFiles.length === 0) {
    console.log('  ℹ️  No images found to optimize');
    return;
  }
  
  imageFiles.forEach(file => {
    const filePath = path.join(DIST_DIR, file);
    const originalSize = getFileSize(filePath);
    
    // For SVGs, minify if possible
    if (file.endsWith('.svg')) {
      let svg = fs.readFileSync(filePath, 'utf8');
      
      // Basic SVG optimization
      svg = svg.replace(/\s+/g, ' ');
      svg = svg.replace(/>\s+</g, '><');
      svg = svg.trim();
      
      fs.writeFileSync(filePath, svg);
      
      const newSize = getFileSize(filePath);
      console.log(`  ✅ ${file}: ${originalSize}KB → ${newSize}KB`);
    }
  });
};

// Main execution
try {
  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ Dist directory not found. Run build first.');
    process.exit(1);
  }
  
  compressCSS();
  optimizeImages();
  analyzeBundleSize();
  generatePerformanceReport();
  
  console.log('\n🎉 Post-build optimization completed successfully!');
  console.log('\n💡 Performance tips:');
  console.log('  • Enable gzip compression on your server');
  console.log('  • Set appropriate cache headers for static assets');
  console.log('  • Consider implementing a CDN for better global performance');
  console.log('  • Monitor Core Web Vitals in production');
  
} catch (error) {
  console.error('❌ Error during optimization:', error.message);
  process.exit(1);
}