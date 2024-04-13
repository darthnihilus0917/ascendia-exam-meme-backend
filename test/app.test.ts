import axios from 'axios';
import CryptoJS from 'crypto-js';
import mockFs from 'mock-fs';
import fs from 'fs';
import tmp from 'tmp';
import path from 'path';
import os from 'os';
import * as dotenv from 'dotenv';
dotenv.config();

// 1. Read the meme URL from the environment variable
function readMemeUrl(): string {
    const memeUrl = `${process.env.MEME_URL}`;
    if (!memeUrl) {
        throw new Error('MEME_URL environment variable not set');
    }
    return memeUrl;
}

describe('Environment variable', () => {
    beforeAll(() => {
        process.env.MEME_URL = 'https://api.imgflip.com/get_memes';
    });

    afterAll(() => {
        delete process.env.MEME_URL;
    });

    it('should read meme URL from environment variable', () => {
        const memeUrl = readMemeUrl();
        expect(memeUrl).toBe('https://api.imgflip.com/get_memes');
    });
});

// 2. Read meme image json from the meme URL
export async function readMemeImageJson(): Promise<any> {
    const memeUrl = `${process.env.MEME_URL}`;
    if (!memeUrl) {
        throw new Error('MEME_URL environment variable not set');
    }

    const response = await axios.get(memeUrl);
    return response.data;
}

jest.mock('axios');
describe('Meme image JSON', () => {
    it('should read meme image JSON from the meme URL', async () => {
        const mockedResponse = {
            data: {
                memes: [
                    { id: '1', name: 'Meme 1' },
                    { id: '2', name: 'Meme 2' }
                ]
            }
        };

        (axios.get as jest.Mock).mockResolvedValue(mockedResponse);

        const memeImageJson = await readMemeImageJson();
        expect(memeImageJson).toEqual(mockedResponse.data);
    });
});

// 3. Encrypt the meme image json using the AES-256-CBC algorithm
function encryptMemeImageJson(memeImageJson: any, key: string, iv: string): string {
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(memeImageJson), key, { iv: iv }).toString();
    return encrypted;
}

describe('Encrypt meme image JSON', () => {
    it('should encrypt meme image JSON using AES-256-CBC algorithm', () => {
        const memeImageJson = { id: '1', name: 'Meme 1' };
        const key = '12345678901234567890123456789012'; // 32-byte key
        const iv = '1234567890123456'; // 16-byte IV

        const encrypted = encryptMemeImageJson(memeImageJson, key, iv);

        // Decrypt the encrypted data to verify
        const decrypted = CryptoJS.AES.decrypt(encrypted, key, { iv: iv }).toString(CryptoJS.enc.Utf8);

        expect(decrypted).toEqual(JSON.stringify(memeImageJson));
    });
});

// 4. Cache the encrypted meme image json in the operating system directory for temporary files
function cacheEncryptedMemeImageJson(encryptedData: string, filePath: string): void {
    fs.writeFileSync(filePath, encryptedData);
}
describe('Cache encrypted meme image JSON', () => {
    let tmpFile: tmp.FileResult;

    beforeAll(() => {
        tmp.setGracefulCleanup();
        tmpFile = tmp.fileSync();
    });

    afterAll(() => {
        tmpFile.removeCallback();
    });

    it('should cache encrypted meme image JSON in the operating system directory', () => {
        const memeImageJson = { id: '1', name: 'Meme 1' };
        const key = '12345678901234567890123456789012'; // 32-byte key
        const iv = '1234567890123456'; // 16-byte IV
        const encrypted = CryptoJS.AES.encrypt(JSON.stringify(memeImageJson), key, { iv: iv }).toString();

        cacheEncryptedMemeImageJson(encrypted, tmpFile.name);

        const cachedData = fs.readFileSync(tmpFile.name, 'utf-8');
        expect(cachedData).toEqual(encrypted);
    });
});

// 5. Create an assertion of the total number of images that get returned
async function fetchMemes(): Promise<any[]> {
    const memeUrl = `${process.env.MEME_URL}`;
    if (!memeUrl) {
        throw new Error('MEME_URL environment variable not set');
    }

    const response = await axios.get(memeUrl);
    return response.data.memes;
}
describe('Total number of images returned', () => {
    it('should return the total number of images', async () => {
        const mockedResponse = {
            data: {
                memes: [
                    { id: '1', name: 'Meme 1' },
                    { id: '2', name: 'Meme 2' },
                    { id: '3', name: 'Meme 3' }
                ]
            }
        };

        (axios.get as jest.Mock).mockResolvedValue(mockedResponse);

        const memes = await fetchMemes();
        expect(memes.length).toBe(3); // Change the number to match the expected total
    });
});

// 6. Create an assertion of the number of images where the name contains the word ’The’ (case insensitive)
function filterMemesByName(memes: any[], keyword: string): any[] {
    return memes.filter(meme => meme.name.toLowerCase().includes(keyword.toLowerCase()));
}
describe('Number of images where the name contains the word "The"', () => {
    it('should return the number of images with the keyword in the name', async () => {
        const mockedResponse = {
            data: {
                memes: [
                    { id: '1', name: 'The Meme 1' },
                    { id: '2', name: 'Meme 2' },
                    { id: '3', name: 'Another Meme' },
                    { id: '4', name: 'The Last Meme' }
                ]
            }
        };

        (axios.get as jest.Mock).mockResolvedValue(mockedResponse);

        const memes = await fetchMemes();
        const filteredMemes = filterMemesByName(memes, 'The ');
        expect(filteredMemes.length).toBe(2); // Change the number to match the expected total
    });
});

// 7. Pick a random meme image, download it and store it in the operating system directory for temporary files
async function downloadAndStoreRandomMemeImage(directory: string): Promise<void> {
    const memeUrl = `${process.env.MEME_URL}`;
    if (!memeUrl) {
        throw new Error('MEME_URL environment variable not set');
    }

    const response = await axios.get(memeUrl);
    const memes = response.data.memes;

    if (!memes || memes.length === 0) {
        throw new Error('No memes found in the response');
    }
    const randomMeme = memes[Math.floor(Math.random() * memes.length)];
    const imageUrl = randomMeme.url;

    const imageResponse = await axios({
        method: 'get',
        url: imageUrl,
        responseType: 'stream',
    });

    if (!imageResponse || !imageResponse.data) {
        throw new Error('Failed to download meme image');
    }

    const imagePath = path.join(directory, 'random_meme.jpg');

    const fileStream = fs.createWriteStream(imagePath);
    imageResponse.data.pipe(fileStream);

    await new Promise((resolve, reject) => {
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
    });
}

describe('Download and store random meme image', () => {
    it('should download and store a random meme image in the specified directory', async () => {
        const mockedResponse = {
            data: {
                memes: [
                    { id: '1', name: 'Meme 1', url: 'https://i.imgflip.com/30b1gx.jpg' },
                    { id: '2', name: 'Meme 2', url: 'https://i.imgflip.com/1g8my4.jpg' },
                    { id: '3', name: 'Meme 3', url: 'https://i.imgflip.com/1ur9b0.jpg' }
                ]
            }
        };

        (axios.get as jest.Mock).mockResolvedValue(mockedResponse);

        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meme-images-'));
        await downloadAndStoreRandomMemeImage(tmpDir);

        const files = fs.readdirSync(tmpDir);
        expect(files.length).toBe(1); // Expect one file to be downloaded
        expect(files[0]).toMatch(/^random_meme\.jpg$/); // Expect the file to have the correct name

        // Clean up
        fs.rmdirSync(tmpDir, { recursive: true });
    });
});

// 8. Log the file location for the encrypted meme json and the file location of the meme image to the console
function logFileLocations(encryptedJsonPath: string, imagePath: string): void {
    console.log(`Encrypted meme JSON file location: ${encryptedJsonPath}`);
    console.log(`Meme image file location: ${imagePath}`);
}
describe('Log file locations', () => {
    it('should log the file locations to the console', () => {
        const consoleSpy = jest.spyOn(console, 'log');

        const encryptedJsonPath = '/path/to/encrypted.json';
        const imagePath = '/path/to/meme.jpg';

        logFileLocations(encryptedJsonPath, imagePath);

        expect(consoleSpy).toHaveBeenCalledWith(`Encrypted meme JSON file location: ${encryptedJsonPath}`);
        expect(consoleSpy).toHaveBeenCalledWith(`Meme image file location: ${imagePath}`);

        consoleSpy.mockRestore();
    });
});  