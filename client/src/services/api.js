// Dynamic Backend Base URL
const getBackendBase = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  // Local development fallback
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return '';
  }
  // Production fallback to live Render backend
  return 'https://project-nira.onrender.com';
};

const BACKEND_BASE = getBackendBase();
const API_BASE_URL = `${BACKEND_BASE}/api/auth`;

const safeJsonParse = async (response) => {
  const text = await response.text();
  if (!text) {
    throw new Error('Server returned an empty response. Please try again.');
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error('Backend server is connecting. Please wait 5 seconds and try again.');
  }
};

export const registerUser = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await safeJsonParse(response);
    if (!response.ok) throw new Error(data.message || 'Registration failed');
    return data;
  } catch (error) { throw error; }
};

export const loginUser = async (credentials) => {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginIdentifier: credentials.loginIdentifier || credentials.email || credentials.username,
        password: credentials.password,
      }),
    });
    const data = await safeJsonParse(response);
    if (!response.ok) throw new Error(data.message || 'Login failed');
    return data;
  } catch (error) { throw error; }
};

export const fetchAllUsers = async (query = '') => {
  try {
    const response = await fetch(`${API_BASE_URL}/users?q=${encodeURIComponent(query)}`);
    const data = await safeJsonParse(response);
    return data.users || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

export const fetchConversation = async (user1Id, user2Id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/messages/${user1Id}/${user2Id}`);
    const data = await safeJsonParse(response);
    return data.messages || [];
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return [];
  }
};

export const postChatMessage = async (sender, receiver, text, isRead = false, fileData = null) => {
  try {
    const body = { sender, receiver, text, isRead };
    if (fileData) {
      body.fileUrl  = fileData.fileUrl;
      body.fileName = fileData.fileName;
      body.fileType = fileData.fileType;
      body.fileSize = fileData.fileSize;
    }
    const response = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await safeJsonParse(response);
    return data.message;
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
};

// Convert file to base64 data URL — stored directly in MongoDB, survives Render deploys
export const uploadFile = async (file) => {
  return new Promise((resolve, reject) => {
    const MAX_SIZE_MB = 5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      reject(new Error(`File too large. Max size is ${MAX_SIZE_MB}MB.`));
      return;
    }

    const mimeType = file.type;
    let fileType = 'document';
    if (mimeType.startsWith('image/')) fileType = 'image';
    else if (mimeType.startsWith('video/')) fileType = 'video';
    else if (mimeType.startsWith('audio/')) fileType = 'audio';

    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({
        fileUrl: e.target.result,   // base64 data URL — e.g. "data:image/jpeg;base64,..."
        fileName: file.name,
        fileType,
        fileSize: file.size,
      });
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export const markMessagesAsRead = async (readerId, senderId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/messages/read`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ readerId, senderId }),
    });
    return await safeJsonParse(response);
  } catch (error) {
    console.error('Error marking read status:', error);
  }
};

export const editChatMessage = async (messageId, sender, text) => {
  try {
    const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender, text }),
    });
    if (!response.ok) {
      const errData = await safeJsonParse(response).catch(() => ({}));
      console.error('Edit message endpoint returned error:', response.status, errData);
      return null;
    }
    return await safeJsonParse(response);
  } catch (error) {
    console.error('Error editing message:', error);
  }
};

export const deleteChatMessage = async (messageId, sender) => {
  try {
    const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender }),
    });
    if (!response.ok) {
      const errData = await safeJsonParse(response).catch(() => ({}));
      console.error('Delete message endpoint returned error:', response.status, errData);
      return null;
    }
    return await safeJsonParse(response);
  } catch (error) {
    console.error('Error deleting message:', error);
  }
};

export const sendConnectionRequest = async (senderId, receiverId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/connections/send-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId, receiverId }),
    });
    return await safeJsonParse(response);
  } catch (error) {
    console.error('Error sending connection request:', error);
    throw error;
  }
};

export const fetchPendingRequests = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/connections/requests/${userId}`);
    const data = await safeJsonParse(response);
    return data.requests || [];
  } catch (error) {
    console.error('Error fetching connection requests:', error);
    return [];
  }
};

export const respondConnectionRequest = async (requestId, action) => {
  try {
    const response = await fetch(`${API_BASE_URL}/connections/respond-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action }),
    });
    return await safeJsonParse(response);
  } catch (error) {
    console.error('Error responding to connection request:', error);
    throw error;
  }
};

export const fetchConnectedUsers = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/connections/connected/${userId}`);
    const data = await safeJsonParse(response);
    return data.users || [];
  } catch (error) {
    console.error('Error fetching connected users:', error);
    return [];
  }
};

export const fetchConnectionStatus = async (userId, targetId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/connections/status/${userId}/${targetId}`);
    return await safeJsonParse(response);
  } catch (error) {
    console.error('Error fetching connection status:', error);
    return { status: 'none' };
  }
};

export const disconnectConnection = async (userId, targetId, deleteMessages = false) => {
  try {
    const response = await fetch(`${API_BASE_URL}/connections/disconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, targetId, deleteMessages }),
    });
    return await safeJsonParse(response);
  } catch (error) {
    console.error('Error disconnecting connection:', error);
    throw error;
  }
};

export const deleteUserAccount = async (userId, password, deleteMessages = false) => {
  try {
    const response = await fetch(`${API_BASE_URL}/delete-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password, deleteMessages }),
    });
    return await safeJsonParse(response);
  } catch (error) {
    console.error('Error deleting user account:', error);
    throw error;
  }
};

export const updateUserProfile = async (userId, profileData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/update-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...profileData }),
    });
    return await safeJsonParse(response);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};
