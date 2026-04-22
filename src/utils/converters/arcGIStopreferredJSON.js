import { readFileSync, writeFileSync } from "fs";

// Get file paths from command line arguments
const inputPath = process.argv[2];
const outputPath = process.argv[3];

// Validate arguments
if (!inputPath || !outputPath) {
  console.error("Usage: node convert.js <inputFile> <outputFile>");
  process.exit(1);
}

// Read the original JSON file
const data = JSON.parse(readFileSync(inputPath, "utf8"));

// Extract features and convert
const converted = data.features.map((feature, index) => ({
  id: index + 1,
  name: feature.attributes.name,
  coordinates: feature.geometry.rings,
}));

// Write to output file
writeFileSync(outputPath, JSON.stringify(converted, null, 2));

console.log(`Converted ${converted.length} entries to ${outputPath}`);
