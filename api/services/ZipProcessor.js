/**
 * ZIP File Processing Service
 * Handles ZIP file extraction and processing for file uploads
 */

const unzipper = require('unzipper');
const { Readable } = require('stream');
const path = require('path');
const FileUtils = require('./FileUtils');

class ZipProcessor {
  constructor(fileStorageCore) {
    this.fileStorageCore = fileStorageCore;
  }

  /**
   * Process ZIP file with progress tracking
   */
  async processZipFile(zipFile, sessionId, uploaderEmail) {
    const extractedFiles = [];
    const filePromises = [];
    let totalFiles = 0;
    let processedFiles = 0;
    
    console.log(`📦 Starting ZIP extraction for session ${sessionId}`);
    
    return new Promise((resolve, reject) => {
      const readable = Readable.from(zipFile.buffer);
      
      readable
        .pipe(unzipper.Parse())
        .on('entry', (entry) => {
          const fileName = entry.path;
          const fileExtension = path.extname(fileName).toLowerCase();
          
          // Skip system files
          if (FileUtils.shouldIgnoreFile(fileName)) {
            console.log(`🚫 Skipping system file: ${fileName}`);
            entry.autodrain();
            return;
          }
          
          if (['.js', '.java', '.py'].includes(fileExtension)) {
            totalFiles++;
            console.log(`📄 Found valid file ${totalFiles}: ${fileName}`);
            
            const filePromise = this.processZipEntry(
              entry, 
              fileName, 
              fileExtension, 
              sessionId, 
              uploaderEmail
            ).then((fileInfo) => {
              processedFiles++;
              console.log(`✅ File processed: ${fileName} (${processedFiles}/${totalFiles})`);
              extractedFiles.push(fileInfo);
              return fileInfo;
            }).catch((error) => {
              processedFiles++;
              console.error(`❌ Failed to process file ${fileName}:`, error);
              // Continue processing other files
              return null;
            });
            
            filePromises.push(filePromise);
          } else {
            entry.autodrain();
          }
        })
        .on('close', async () => {
          try {
            console.log(`📥 ZIP parsing complete. Processing ${filePromises.length} files...`);
            
            // Wait for all files to be processed (with error recovery)
            const results = await Promise.allSettled(filePromises);
            
            // Filter out failed uploads
            const successfulFiles = results
              .filter(result => result.status === 'fulfilled' && result.value)
              .map(result => result.value);
            
            console.log(`🎉 ZIP extraction complete: ${successfulFiles.length} files added`);
            resolve(successfulFiles);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          console.error('❌ ZIP parsing error:', error);
          reject(error);
        });
    });
  }

  /**
   * Process individual ZIP entry
   */
  async processZipEntry(entry, fileName, fileExtension, sessionId, uploaderEmail) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      
      entry.on('data', (chunk) => chunks.push(chunk));
      entry.on('end', async () => {
        try {
          const content = Buffer.concat(chunks);
          const baseFileName = path.basename(fileName);
          const normalizedFilePath = fileName.replace(/\\/g, '/');
          const parentFolder = path.dirname(fileName) !== '.' ? path.dirname(fileName) : null;
          
          console.log(`💾 Storing file: ${baseFileName} (${content.length} bytes)`);
          
          // Store in MongoDB using file storage core
          const savedFile = await this.fileStorageCore.storeFile({
            sessionId,
            fileName: baseFileName,
            fileType: fileExtension,
            content,
            mimeType: 'text/plain',
            parentFolder,
            filePath: normalizedFilePath,
            uploadedBy: uploaderEmail
          });
          
          const fileInfo = {
            id: savedFile._id.toString(),
            name: savedFile.fileName,
            type: savedFile.fileType.replace('.', ''),
            path: savedFile.filePath,
            size: savedFile.fileSize,
            uploadedBy: uploaderEmail,
            uploadedAt: new Date().toISOString()
          };
          
          resolve(fileInfo);
        } catch (error) {
          reject(error);
        }
      });
      
      entry.on('error', reject);
    });
  }

  /**
   * Store multiple extracted files (for zip uploads)
   */
  async storeExtractedFiles(sessionId, extractedFiles, cognitoId = null) {
    const savedFiles = [];

    for (const fileInfo of extractedFiles) {
      try {
        // Skip system files
        if (FileUtils.shouldIgnoreFile(fileInfo.filePath, fileInfo.fileName)) {
          console.log(`🚫 Ignoring system file: ${fileInfo.fileName}`);
          continue;
        }

        const savedFile = await this.fileStorageCore.storeFile({
          sessionId,
          fileName: fileInfo.fileName,
          fileType: fileInfo.fileType,
          content: fileInfo.content,
          mimeType: fileInfo.mimeType || 'text/plain',
          filePath: fileInfo.filePath,
          uploadedBy: cognitoId
        });

        savedFiles.push({
          name: savedFile.fileName,
          type: savedFile.fileType,
          path: savedFile.filePath,
          size: savedFile.fileSize
        });
      } catch (error) {
        console.error(`Error storing file ${fileInfo.fileName}:`, error.message);
      }
    }

    return savedFiles;
  }
}

module.exports = ZipProcessor;
