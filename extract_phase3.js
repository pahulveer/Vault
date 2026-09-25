const fs = require('fs');
const lines = fs.readFileSync('C:/Users/pahul/.gemini/antigravity-ide/brain/8e7b49c1-34ed-4a7d-98c9-41a88e1a6011/.system_generated/logs/transcript_full.jsonl', 'utf-8').split('\n');
for (const line of lines) {
  if (line.includes('"step_index":279')) {
    fs.writeFileSync('phase3.txt', JSON.parse(line).content);
    break;
  }
}
