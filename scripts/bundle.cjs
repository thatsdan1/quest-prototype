const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const files=['engine.js','storage.js','production.js','tracking.js','workflow.js','sync.js','app.js'];
let html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
// Match any ?v= cache-buster, and fail loudly if a tag is missing so the standalone file never points at external files.
const inline=(pattern,replacement,label)=>{if(!pattern.test(html))throw new Error(`bundle: ${label} tag not found in dist/index.html`);html=html.replace(pattern,replacement);};
inline(/<link rel="stylesheet" href="styles\.css(\?v=\d+)?">/,()=>'<style>'+fs.readFileSync(path.join(root,'dist/styles.css'),'utf8')+'</style>','styles.css');
for(const file of files)inline(new RegExp(`<script src="${file.replace('.','\\.')}(\\?v=\\d+)?" defer></script>`),'',file);
html=html.replace(/^[ \t]+$/gm,'');
const scripts=files.map(file=>fs.readFileSync(path.join(root,'dist',file),'utf8')).join('\n;\n').replace(/<\/script/gi,'<\\/script');
html=html.replace('</body>',()=>'<script>\n'+scripts+'\n</script>\n</body>');
fs.writeFileSync(path.join(root,'QUEST Prototype.html'),html);
console.log('Created self-contained QUEST Prototype.html');
