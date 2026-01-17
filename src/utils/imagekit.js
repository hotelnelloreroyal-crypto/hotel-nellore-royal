// ImageKit Upload Utility
// Uses ImageKit's upload API with proper authentication

const IMAGEKIT_PUBLIC_KEY = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY;
const IMAGEKIT_PRIVATE_KEY = import.meta.env.VITE_IMAGEKIT_PRIVATE_KEY;

/**
 * Convert file to base64
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Generate HMAC-SHA1 signature using Web Crypto API
 */
const generateHmacSignature = async (message, key) => {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const signatureArray = Array.from(new Uint8Array(signature));
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Generate authentication parameters for ImageKit upload
 */
const getAuthenticationParameters = async () => {
  const token = crypto.randomUUID();
  // Use current time + 30 minutes (well within 1 hour limit)
  const currentTime = Math.floor(Date.now() / 1000);
  const expire = currentTime + 1800; // 30 minutes from now
  
  // Create signature: HMAC-SHA1(token + expire, privateKey)
  const signatureString = token + expire;
  const signature = await generateHmacSignature(signatureString, IMAGEKIT_PRIVATE_KEY);
  
  return {
    token,
    expire: String(expire),  // ImageKit expects string
    signature
  };
};

/**
 * Upload image to ImageKit
 * @param {File} file - The image file to upload
 * @param {string} fileName - The name to save the file as
 * @param {string} folder - The folder path in ImageKit (default: 'RestaurantItems')
 * @returns {Promise<{url: string, fileId: string}>} - The uploaded image URL and file ID
 */
export const uploadImageToImageKit = async (file, fileName, folder = 'RestaurantItems') => {
  try {
    // Convert file to base64
    const base64File = await fileToBase64(file);
    
    // Get authentication parameters
    const authParams = await getAuthenticationParameters();
    
    // Create form data
    const formData = new FormData();
    formData.append('file', base64File);
    formData.append('fileName', fileName);
    formData.append('folder', folder);
    formData.append('publicKey', IMAGEKIT_PUBLIC_KEY);
    formData.append('signature', authParams.signature);
    formData.append('expire', authParams.expire);
    formData.append('token', authParams.token);

    const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('ImageKit upload error:', data);
      throw new Error(data.message || 'Failed to upload image');
    }

    return {
      url: data.url,
      fileId: data.fileId,
      thumbnailUrl: data.thumbnailUrl,
      name: data.name
    };
  } catch (error) {
    console.error('Error uploading to ImageKit:', error);
    throw error;
  }
};

export default {
  uploadImageToImageKit
};
