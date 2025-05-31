// Test the hierarchy building logic locally

function _buildHierarchy(files) {
  const folderMap = new Map();
  const rootItems = [];

  console.log('\n🔍 DEBUGGING HIERARCHY BUILDING');
  console.log('Input files:', files.map(f => ({ name: f.fileName, path: f.filePath })));

  // First pass: Create all folders and files
  for (const file of files) {
    const pathParts = file.filePath.split('/');
    console.log(`\nProcessing file: ${file.filePath}`);
    console.log(`Path parts: [${pathParts.join(', ')}]`);
    
    if (pathParts.length === 1) {
      // Root level file
      const fileItem = {
        name: file.fileName,
        type: 'file',
        path: file.filePath,
        size: file.fileSize
      };
      rootItems.push(fileItem);
      console.log(`  → Added root file: ${file.fileName}`);
    } else {
      // Create all necessary intermediate folders in the path
      for (let i = 1; i < pathParts.length; i++) {
        const folderPath = pathParts.slice(0, i).join('/');
        const folderName = pathParts[i - 1];
        
        if (!folderMap.has(folderPath)) {
          const folderItem = {
            name: folderName,
            type: 'folder',
            path: folderPath,
            children: []
          };
          folderMap.set(folderPath, folderItem);
          console.log(`  → Created folder: ${folderName} (path: ${folderPath})`);
        } else {
          console.log(`  → Folder already exists: ${folderName} (path: ${folderPath})`);
        }
      }
      
      // Add the file to its immediate parent folder
      const parentFolderPath = pathParts.slice(0, -1).join('/');
      if (folderMap.has(parentFolderPath)) {
        const fileItem = {
          name: file.fileName,
          type: 'file',
          path: file.filePath,
          size: file.fileSize
        };
        folderMap.get(parentFolderPath).children.push(fileItem);
        console.log(`  → Added file ${file.fileName} to folder ${parentFolderPath}`);
      } else {
        console.log(`  → ERROR: Parent folder ${parentFolderPath} not found!`);
      }
    }
  }

  console.log('\n📁 Folders created:');
  for (const [path, folder] of folderMap) {
    console.log(`  ${path} → ${folder.name} (${folder.children.length} children)`);
  }

  // Second pass: Build the nested structure by organizing folders
  console.log('\n🔄 Building nested structure...');
  for (const [folderPath, folder] of folderMap) {
    const pathParts = folderPath.split('/');
    
    if (pathParts.length === 1) {
      // Top-level folder - add to root
      rootItems.push(folder);
      console.log(`  → Added top-level folder: ${folder.name}`);
    } else {
      // Nested folder - add to its parent folder
      const parentPath = pathParts.slice(0, -1).join('/');
      if (folderMap.has(parentPath)) {
        folderMap.get(parentPath).children.push(folder);
        console.log(`  → Added ${folder.name} to parent ${parentPath}`);
      } else {
        console.log(`  → ERROR: Parent ${parentPath} not found for ${folder.name}!`);
      }
    }
  }

  console.log('\n📊 Final root items:');
  rootItems.forEach(item => {
    console.log(`  ${item.type}: ${item.name} (${item.children?.length || 0} children)`);
  });

  return rootItems;
}

// Test with our sample data
const testFiles = [
  { fileName: 'Button.js', filePath: 'src/components/Button.js', fileSize: 19 },
  { fileName: 'Header.js', filePath: 'src/components/Header.js', fileSize: 19 },
  { fileName: 'helpers.js', filePath: 'src/utils/helpers.js', fileSize: 19 },
  { fileName: 'button.test.js', filePath: 'tests/unit/button.test.js', fileSize: 15 },
  { fileName: 'README.py', filePath: 'docs/README.py', fileSize: 15 },
  { fileName: 'config.java', filePath: 'config.java', fileSize: 14 }
];

const result = _buildHierarchy(testFiles);
console.log('\n🎯 FINAL RESULT:');
console.log(JSON.stringify(result, null, 2));
