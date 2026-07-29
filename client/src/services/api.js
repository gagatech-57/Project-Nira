const API_BASE_URL = '/api/auth';

export const registerUser = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }
    return data;
  } catch (error) {
    throw error;
  }
};

export const loginUser = async (credentials) => {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        loginIdentifier: credentials.loginIdentifier || credentials.email || credentials.username,
        password: credentials.password,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    return data;
  } catch (error) {
    throw error;
  }
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

export const postChatMessage = async (sender, receiver, text, isRead = false) => {
  try {
    const response = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sender, receiver, text, isRead }),
    });
    const data = await response.json();
    return data.message;
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
};

export const markMessagesAsRead = async (readerId, senderId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/messages/read`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ readerId, senderId }),
    });
    return await response.json();
  } catch (error) {
    console.error('Error marking read status:', error);
  }
};
