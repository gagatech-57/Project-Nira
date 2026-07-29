const API_BASE_URL = '/api/auth';

export const registerUser = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await response.json();
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
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Login failed');
    return data;
  } catch (error) { throw error; }
};

export const fetchAllUsers = async (query = '') => {
  try {
    const response = await fetch(`${API_BASE_URL}/users?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    return data.users || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

export const fetchConversation = async (user1Id, user2Id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/messages/${user1Id}/${user2Id}`);
    const data = await response.json();
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
    const data = await response.json();
    return data.message;
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
};

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!response.ok) throw new Error('Upload failed');
  return await response.json();
};

export const markMessagesAsRead = async (readerId, senderId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/messages/read`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ readerId, senderId }),
    });
    return await response.json();
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
    return await response.json();
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
    return await response.json();
  } catch (error) {
    console.error('Error deleting message:', error);
  }
};
