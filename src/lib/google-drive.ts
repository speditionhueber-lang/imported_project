
// src/lib/google-drive.ts
import { google } from 'googleapis';
import { PassThrough } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive'];

async function getAuth() {
  const credentials = {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });
  return auth;
}

export async function createFolder(folderName: string, parentFolderId?: string) {
    try {
        const auth = await getAuth();
        const drive = google.drive({ version: 'v3', auth });
        const folderMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: parentFolderId ? [parentFolderId] : (process.env.GOOGLE_DRIVE_FOLDER_ID ? [process.env.GOOGLE_DRIVE_FOLDER_ID] : []),
        };
        const response = await drive.files.create({
            requestBody: folderMetadata,
            fields: 'id, name, modifiedTime',
        });
        return response.data;
    } catch (error: any) {
        console.error('Error creating Google Drive folder:', error);
        throw new Error(`Failed to create folder: ${error.message}`);
    }
}


export async function uploadFileToDrive(folderId: string, fileName: string, fileContent: Buffer, mimeType: string) {
    try {
        const auth = await getAuth();
        const drive = google.drive({ version: 'v3', auth });

        const fileMetadata = {
            name: fileName,
            parents: [folderId],
        };

        const media = {
            mimeType: mimeType,
            body: new PassThrough().end(fileContent),
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, mimeType, webViewLink, modifiedTime',
        });
        
        console.log('File uploaded successfully. File ID:', response.data.id);
        return response.data;

    } catch (error: any) {
        console.error('Error uploading file to Google Drive:', error);
        throw new Error(`Failed to upload file to Drive: ${error.message}`);
    }
}


export async function listFolders(parentFolderId?: string) {
    try {
        const auth = await getAuth();
        const drive = google.drive({ version: 'v3', auth });
        const folderId = parentFolderId;

        if (!folderId) {
            throw new Error('Google Drive Folder ID is not configured.');
        }

        const res = await drive.files.list({
            q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder'`,
            fields: 'files(id, name, modifiedTime)',
            pageSize: 100,
            orderBy: 'modifiedTime desc',
        });

        return res.data.files || [];
    } catch (error: any) {
        console.error('Error listing Google Drive folders:', error);
        throw new Error(`Failed to list folders: ${error.message}`);
    }
}

export async function listFiles(folderId: string) {
    try {
        const auth = await getAuth();
        const drive = google.drive({ version: 'v3', auth });

        if (!folderId) {
            throw new Error('Google Drive Folder ID is not provided.');
        }

        const res = await drive.files.list({
            q: `'${folderId}' in parents and mimeType!='application/vnd.google-apps.folder'`,
            fields: 'files(id, name, mimeType, modifiedTime, webViewLink, webContentLink, thumbnailLink)',
            pageSize: 100,
            orderBy: 'modifiedTime desc',
        });

        return res.data.files || [];
    } catch (error: any) {
        console.error('Error listing Google Drive files:', error);
        throw new Error(`Failed to list files: ${error.message}`);
    }
}

export async function getFolderName(folderId: string): Promise<string | null> {
    try {
        if (!folderId) {
            console.warn('getFolderName called with no folderId');
            return 'Unbenannter Ordner';
        }
        const auth = await getAuth();
        const drive = google.drive({ version: 'v3', auth });

        const res = await drive.files.get({
            fileId: folderId,
            fields: 'name',
        });
        return res.data.name || 'Unbenannter Ordner';
    } catch (error: any) {
        console.error('Error getting folder name:', error);
        // Return null on error to prevent server crash
        return null;
    }
}


export async function listAudioFiles(folderId: string) {
    try {
        const auth = await getAuth();
        const drive = google.drive({ version: 'v3', auth });

        if (!folderId) {
            throw new Error('Google Drive Folder ID is not provided.');
        }

        const res = await drive.files.list({
            q: `'${folderId}' in parents and (mimeType contains 'audio/' or name contains '.m4a')`,
            fields: 'files(id, name, mimeType, modifiedTime)',
            pageSize: 100,
            orderBy: 'modifiedTime desc',
        });

        return res.data.files || [];
    } catch (error: any) {
        console.error('Error listing Google Drive files:', error);
        throw new Error(`Failed to list audio files: ${error.message}`);
    }
}

export async function getDriveAudioFile(fileId: string): Promise<Buffer> {
    try {
        const auth = await getAuth();
        const drive = google.drive({ version: 'v3', auth });

        const res = await drive.files.get(
            { fileId: fileId, alt: 'media' },
            { responseType: 'stream' }
        );

        return new Promise((resolve, reject) => {
            const passthrough = new PassThrough();
            const chunks: Buffer[] = [];
            
            passthrough.on('data', (chunk) => {
                chunks.push(chunk);
            });
            passthrough.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
            passthrough.on('error', reject);
            
            res.data.pipe(passthrough);
        });

    } catch (error: any) {
        console.error('Error downloading Google Drive file:', error);
        throw new Error(`Failed to download audio file: ${error.message}`);
    }
}

