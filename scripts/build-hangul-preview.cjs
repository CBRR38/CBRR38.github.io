const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const directory = path.join(__dirname, '..', 'projects', 'hangul-garden');
const context = vm.createContext({});
for (const file of ['scenes.js', 'runtime-v5/data.js', 'curriculum.js']) {
  vm.runInContext(fs.readFileSync(path.join(directory, file), 'utf8'), context, { filename: file });
}

const [rows, words, starter] = vm.runInContext(
  '[curriculumEntries, buildVocabulary(curriculumEntries), starterWords]',
  context
);
const starterNames = new Set(starter.map(word => word.ko));
const selected = new Set(words.filter(word => word.sourceId && word.topic !== 'course').map(word => word.sourceId));
for (let grade = 1; grade <= 6; grade += 1) {
  const examples = words.filter(word => word.grade === grade && word.topic === 'course').slice(0, 8);
  for (const word of examples) selected.add(word.sourceId);
}
const preview = rows.filter(([id, ko]) => selected.has(id) || starterNames.has(ko));
const header = '// Starter subset of the Korean Basic Dictionary via basickorean-vocab, CC BY-SA 2.0 KR. See NOTICE.txt.\n';
const source = preview.map(row => '  ' + JSON.stringify(row)).join(',\n');
fs.writeFileSync(path.join(directory, 'runtime-v5', 'curriculum-preview.js'),
  header + 'const previewCurriculumEntries = [\n' + source + '\n];\n', 'utf8');
