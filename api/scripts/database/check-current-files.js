const mongoose = require('mongoose');
const FileStorage = require('./models/FileStorage');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://admin:admin@cluster91438.fvtzi.mongodb.net/code_colab?retryWrites=true&w=majority&appName=Cluster91438', {
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    return false;
  }
};

const checkCurrentFiles = async () => {
  console.log('🔍 Checking all files currently in the database...\n');
  
  try {
    // Get all files
    const allFiles = await FileStorage.find({});
    
    console.log(`📊 Total files in database: ${allFiles.length}\n`);
    
    if (allFiles.length > 0) {
      console.log('📄 Files found:');
      allFiles.forEach((file, index) => {
        console.log(`${index + 1}. File: ${file.fileName}`);
        console.log(`   Path: ${file.filePath || 'N/A'}`);
        console.log(`   Session: ${file.sessionId}`);
        console.log(`   Type: ${file.fileType}`);
        console.log(`   Size: ${file.content ? file.content.length : 0} bytes`);
        console.log(`   Created: ${file.createdAt}`);
        console.log('   ---');
      });
      
      // Check for system files specifically
      const systemFiles = allFiles.filter(file => {
        const fileName = file.fileName;
        const filePath = file.filePath || '';
        
        return (
          fileName.startsWith('._') ||
          fileName === '.DS_Store' ||
          filePath.includes('__MACOSX') ||
          fileName.includes('__MACOSX') ||
          filePath.includes('Thumbs.db') ||
          fileName === 'desktop.ini'
        );
      });
      
      if (systemFiles.length > 0) {
        console.log('\n⚠️  System files found:');
        systemFiles.forEach((file, index) => {
          console.log(`${index + 1}. 🚫 ${file.fileName} (${file.filePath || 'no path'})`);
        });
      } else {
        console.log('\n✅ No system files found in the database');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking files:', error);
  }
};

const main = async () => {
  await connectDB();
  await checkCurrentFiles();
  await mongoose.connection.close();
  console.log('\n🔒 Database connection closed');
};

main().catch(console.error);
