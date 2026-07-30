import React, { useState, useEffect, useRef } from 'react';
import {
  LogOut,
  Search,
  MessageSquare,
  Send,
  User,
  AtSign,
  Circle,
  Shield,
  Phone,
  Calendar,
  Sparkles,
  Eye,
  Settings,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Mail,
  ArrowLeft,
  CheckCircle2,
  Plus,
  Download,
  Image as ImageIcon,
  FileText,
  Video,
  Music,
  Menu,
  Pencil,
  Trash2,
  Edit3,
} from 'lucide-react';
import { io } from 'socket.io-client';
import {
  fetchAllUsers,
  fetchConversation,
  postChatMessage,
  markMessagesAsRead,
  uploadFile,
  editChatMessage,
  deleteChatMessage,
  sendConnectionRequest,
  fetchPendingRequests,
  respondConnectionRequest,
  fetchConnectedUsers,
  fetchConnectionStatus,
  disconnectConnection,
  deleteUserAccount,
  updateUserProfile,
} from '../services/api';
import {
  UserCheck,
  UserPlus,
  Clock,
  Check,
  UserX,
  Unlink,
  UserMinus,
  ShieldAlert,
  SlidersHorizontal,
  Settings2,
  Power,
  Sidebar,
  PanelLeft,
  MessageCircle,
  MessageSquareText,
} from 'lucide-react';

const MenuLinesIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ color, flexShrink: 0 }}
  >
    <path d="M4 6H14" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    <path d="M4 12H20" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    <path d="M4 18H14" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
  </svg>
);

const getFileUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const backendBase = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://localhost:5000'
    : (import.meta.env.VITE_API_URL || 'https://project-nira.onrender.com');

  const cleanBase = backendBase.replace(/\/$/, '');
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${cleanBase}${cleanUrl}`;
};

export default function Dashboard({ user, onLogout, onUserUpdate }) {
  const currentUserId = user?._id || user?.id || '';
  const currentUserName = user?.name || 'User';
  const currentUserHandle = (user?.username || 'user').toLowerCase();
  const currentUserEmail = user?.email || 'Not provided';
  const currentUserGender = user?.gender === 'M' ? 'Male' : user?.gender === 'F' ? 'Female' : 'Other';
  const currentUserAge = user?.age || 'Not provided';
  const currentUserMobile = user?.mobile || 'Not provided';

  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);

  // Profile Editing Form States
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileUsername, setProfileUsername] = useState(user?.username || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profileGender, setProfileGender] = useState(user?.gender || 'M');
  const [profileMobile, setProfileMobile] = useState(user?.mobile || '');
  const [profileAge, setProfileAge] = useState(user?.age || '');
  const [profileUpdating, setProfileUpdating] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');
  const [editingCard, setEditingCard] = useState(null);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileUsername(user.username || '');
      setProfileEmail(user.email || '');
      setProfileGender(user.gender || 'M');
      setProfileMobile(user.mobile || '');
      setProfileAge(user.age || '');
    }
  }, [user]);

  // Disconnect & Delete Account Modal States
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [deleteDisconnectMessages, setDeleteDisconnectMessages] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountMessages, setDeleteAccountMessages] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [deleteAccountError, setDeleteAccountError] = useState('');
  const [lastMessages, setLastMessages] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastMessageTimestamps, setLastMessageTimestamps] = useState({});
  const [newMessageText, setNewMessageText] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  // Connection Requests & Tabs
  const [sidebarTab, setSidebarTab] = useState('chats'); // 'chats' or 'requests'
  const [pendingRequests, setPendingRequests] = useState([]);
  const [connectionStatuses, setConnectionStatuses] = useState({});

  // Sidebar & Settings Panel States
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Mobile Responsive State
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Onboarding Tour State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  useEffect(() => {
    const key = `nira_onboarding_done_${currentUserId}`;
    if (!localStorage.getItem(key)) {
      // Small delay so UI is ready
      const t = setTimeout(() => setShowOnboarding(true), 800);
      return () => clearTimeout(t);
    }
  }, [currentUserId]);
  const closeOnboarding = () => {
    setShowOnboarding(false);
    setOnboardingStep(0);
    localStorage.setItem(`nira_onboarding_done_${currentUserId}`, '1');
  };

  // File upload states
  const [selectedFile, setSelectedFile] = useState(null);       // { file, previewUrl, name, type, size }
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Image Popup Lightbox & Attachment Menu Popover States
  const [activeImagePopup, setActiveImagePopup] = useState(null); // { url, name, time }
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null); // { _id, text }
  const [deleteConfirmMsg, setDeleteConfirmMsg] = useState(null); // msg to delete

  const messagesContainerRef = useRef(null);
  const isUserAtBottomRef = useRef(true);
  const messageInputRef = useRef(null);

  // Refs for tracking current state inside socket callbacks
  const selectedUserRef = useRef(selectedUser);
  const socketRef = useRef(socket);

  const formatLastMessagePreview = (msg) => {
    if (!msg) return '';
    if (msg.fileUrl) {
      if (msg.fileType === 'image') return '📷 Image';
      if (msg.fileType === 'video') return '🎥 Video';
      if (msg.fileType === 'audio') return '🎵 Audio';
      return `📎 ${msg.fileName || 'File'}`;
    }
    if (msg.text) return msg.text;
    return '';
  };

  const formatLastMessageTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      const isThisYear = d.getFullYear() === now.getFullYear();
      if (isThisYear) {
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
      return d.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  useEffect(() => {
    selectedUserRef.current = selectedUser;
    if (socket && currentUserId) {
      socket.emit('active_chat_changed', {
        userId: currentUserId,
        partnerId: selectedUser ? selectedUser._id : null,
      });
      if (selectedUser) {
        socket.emit('mark_read_instant', {
          readerId: currentUserId,
          senderId: selectedUser._id,
        });
        markMessagesAsRead(currentUserId, selectedUser._id).catch(() => {});
      }
    }
  }, [selectedUser, socket, currentUserId]);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // Deduplication helper to prevent message doubling
  const upsertMessage = (prevMsgs, incomingMsg) => {
    if (!incomingMsg) return prevMsgs;
    if (!incomingMsg.text && !incomingMsg.fileUrl) return prevMsgs;

    // 1. Check exact ID match
    const exactMatchIndex = prevMsgs.findIndex((m) => m._id === incomingMsg._id && m._id);
    if (exactMatchIndex !== -1) {
      const copy = [...prevMsgs];
      copy[exactMatchIndex] = { ...copy[exactMatchIndex], ...incomingMsg };
      return copy;
    }

    // 2. Check temp ID replacement match (match by temp prefix, text/fileUrl, and sender)
    const tempMatchIndex = prevMsgs.findIndex(
      (m) =>
        typeof m._id === 'string' &&
        m._id.startsWith('temp_') &&
        m.sender === incomingMsg.sender &&
        (m.text === incomingMsg.text || (incomingMsg.fileUrl && m.fileName === incomingMsg.fileName))
    );

    if (tempMatchIndex !== -1) {
      const copy = [...prevMsgs];
      copy[tempMatchIndex] = incomingMsg;
      return copy;
    }

    // 3. Proximity text check (same sender + text within 3.5s)
    const textProximityIndex = prevMsgs.findIndex((m) => {
      if (m.sender !== incomingMsg.sender || m.text !== incomingMsg.text) return false;
      const t1 = new Date(m.createdAt || Date.now()).getTime();
      const t2 = new Date(incomingMsg.createdAt || Date.now()).getTime();
      return Math.abs(t1 - t2) < 3500;
    });

    if (textProximityIndex !== -1) {
      const copy = [...prevMsgs];
      copy[textProximityIndex] = incomingMsg;
      return copy;
    }

    // Otherwise append new unique message
    return [...prevMsgs, incomingMsg];
  };

  // Instant scroll helper (0 animation delay)
  const scrollToBottomInstant = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Track user scroll position
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isBottom = scrollHeight - scrollTop - clientHeight < 130;
    isUserAtBottomRef.current = isBottom;
  };

  // Initialize Socket connection & listeners
  useEffect(() => {
    if (!currentUserId) return;

    const socketServerUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000'
      : (import.meta.env.VITE_API_URL || 'https://project-nira.onrender.com');
    const newSocket = io(socketServerUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('user_online', currentUserId);
      if (selectedUserRef.current) {
        newSocket.emit('active_chat_changed', {
          userId: currentUserId,
          partnerId: selectedUserRef.current._id,
        });
      }
    });

    newSocket.on('get_online_users', (users) => {
      setOnlineUsers(users);
    });

    newSocket.on('receive_message', (incomingMsg) => {
      const otherUser = incomingMsg.sender === currentUserId ? incomingMsg.receiver : incomingMsg.sender;

      if (otherUser) {
        const msgTime = new Date(incomingMsg.createdAt || Date.now()).getTime();
        setLastMessages((prev) => ({
          ...prev,
          [otherUser]: {
            preview: formatLastMessagePreview(incomingMsg),
            time: formatLastMessageTime(incomingMsg.createdAt),
          },
        }));
        setLastMessageTimestamps((prev) => ({
          ...prev,
          [otherUser]: msgTime,
        }));
      }

      const selUser = selectedUserRef.current;
      if (
        selUser &&
        ((String(incomingMsg.sender) === String(selUser._id) && String(incomingMsg.receiver) === String(currentUserId)) ||
          (String(incomingMsg.sender) === String(currentUserId) && String(incomingMsg.receiver) === String(selUser._id)))
      ) {
        setMessages((prevMsgs) => upsertMessage(prevMsgs, incomingMsg));

        if (String(incomingMsg.sender) === String(selUser._id) && newSocket) {
          newSocket.emit('mark_read_instant', {
            readerId: currentUserId,
            senderId: selUser._id,
          });
          setMessages((prevMsgs) =>
            prevMsgs.map((m) => (String(m._id) === String(incomingMsg._id) ? { ...m, isRead: true } : m))
          );
        }

        if (isUserAtBottomRef.current) {
          setTimeout(scrollToBottomInstant, 50);
        }
      } else if (incomingMsg.sender && String(incomingMsg.sender) !== String(currentUserId)) {
        // Increment unread red dot count for contacts not currently selected
        try {
          localStorage.removeItem(`cleared_unread_${currentUserId}_${incomingMsg.sender}`);
        } catch (e) {}
        setUnreadCounts((prev) => ({
          ...prev,
          [incomingMsg.sender]: (prev[incomingMsg.sender] || 0) + 1,
        }));
      }
    });

    newSocket.on('message_sent', (confirmedMsg) => {
      const otherUser = String(confirmedMsg.sender) === String(currentUserId) ? confirmedMsg.receiver : confirmedMsg.sender;

      if (otherUser) {
        const msgTime = new Date(confirmedMsg.createdAt || Date.now()).getTime();
        setLastMessages((prev) => ({
          ...prev,
          [otherUser]: {
            preview: formatLastMessagePreview(confirmedMsg),
            time: formatLastMessageTime(confirmedMsg.createdAt),
          },
        }));
        setLastMessageTimestamps((prev) => ({
          ...prev,
          [otherUser]: msgTime,
        }));
      }

      const selUser = selectedUserRef.current;
      if (
        selUser &&
        ((String(confirmedMsg.sender) === String(currentUserId) && String(confirmedMsg.receiver) === String(selUser._id)) ||
          (String(confirmedMsg.sender) === String(selUser._id) && String(confirmedMsg.receiver) === String(selUser._id)))
      ) {
        setMessages((prevMsgs) => upsertMessage(prevMsgs, confirmedMsg));

        if (isUserAtBottomRef.current) {
          setTimeout(scrollToBottomInstant, 50);
        }
      }
    });

    newSocket.on('messages_read', ({ readerId }) => {
      const selUser = selectedUserRef.current;
      if (selUser && String(selUser._id) === String(readerId)) {
        setMessages((prevMsgs) =>
          prevMsgs.map((m) => (String(m.sender) === String(currentUserId) ? { ...m, isRead: true } : m))
        );
      }
    });

    newSocket.on('message_edited', ({ messageId, text }) => {
      setMessages((prevMsgs) =>
        prevMsgs.map((m) => (String(m._id) === String(messageId) ? { ...m, text, isEdited: true } : m))
      );
    });

    newSocket.on('message_deleted', ({ messageId }) => {
      setMessages((prevMsgs) => {
        const filtered = prevMsgs.filter((m) => String(m._id) !== String(messageId));
        const selUser = selectedUserRef.current;
        if (selUser) {
          const newLastMsg = filtered[filtered.length - 1];
          setLastMessages((lastPrev) => ({
            ...lastPrev,
            [selUser._id]: {
              preview: newLastMsg ? formatLastMessagePreview(newLastMsg) : '',
              time: newLastMsg ? formatLastMessageTime(newLastMsg.createdAt) : '',
            },
          }));
        }
        return filtered;
      });
    });

    newSocket.on('receive_connection_request', () => {
      if (currentUserId) {
        fetchPendingRequests(currentUserId).then((reqs) => setPendingRequests(reqs));
      }
    });

    newSocket.on('connection_request_responded', ({ receiverId, action }) => {
      if (action === 'accepted') {
        fetchConnectedUsers(currentUserId).then((connected) => {
          const filtered = connected.filter(
            (u) =>
              String(u._id || u.id) !== String(currentUserId) &&
              u.username?.toLowerCase() !== currentUserHandle &&
              u.email?.toLowerCase() !== currentUserEmail.toLowerCase()
          );
          setUsersList(filtered);
        });
      }
      setConnectionStatuses((prev) => ({
        ...prev,
        [receiverId]: action === 'accepted' ? 'connected' : 'declined',
      }));
    });

    return () => {
      newSocket.disconnect();
    };
  }, [currentUserId]);

  const loadPendingRequests = async () => {
    if (!currentUserId) return;
    const reqs = await fetchPendingRequests(currentUserId);
    setPendingRequests(reqs);
  };

  useEffect(() => {
    loadPendingRequests();
    const timer = setInterval(loadPendingRequests, 12000);
    return () => clearInterval(timer);
  }, [currentUserId]);

  const handleSendConnectionRequest = async (targetUser) => {
    try {
      setConnectionStatuses((prev) => ({ ...prev, [targetUser._id]: 'pending_sent' }));
      await sendConnectionRequest(currentUserId, targetUser._id);
      if (socket) {
        socket.emit('send_connection_request', {
          senderId: currentUserId,
          receiverId: targetUser._id,
          senderUser: { _id: currentUserId, name: currentUserName, username: currentUserHandle },
        });
      }
    } catch (err) {
      console.error('Error sending connect request:', err);
    }
  };

  const handleRespondRequest = async (requestId, action, senderId) => {
    try {
      await respondConnectionRequest(requestId, action);
      setPendingRequests((prev) => prev.filter((r) => r._id !== requestId));

      if (socket) {
        socket.emit('respond_connection_request', {
          senderId,
          receiverId: currentUserId,
          action,
        });
      }

      if (action === 'accepted') {
        const connected = await fetchConnectedUsers(currentUserId);
        const filtered = connected.filter(
          (u) =>
            String(u._id || u.id) !== String(currentUserId) &&
            u.username?.toLowerCase() !== currentUserHandle &&
            u.email?.toLowerCase() !== currentUserEmail.toLowerCase()
        );
        setUsersList(filtered);
        const newFriend = filtered.find((u) => String(u._id) === String(senderId));
        if (newFriend) setSelectedUser(newFriend);
      }
    } catch (err) {
      console.error('Error responding to request:', err);
    }
  };

  const handleExecuteDisconnect = async () => {
    if (!selectedUser || !currentUserId) return;
    const target = selectedUser;
    setShowDisconnectModal(false);

    try {
      await disconnectConnection(currentUserId, target._id, deleteDisconnectMessages);

      if (deleteDisconnectMessages) {
        setMessages([]);
      }
      setDeleteDisconnectMessages(false);

      const connected = await fetchConnectedUsers(currentUserId);
      const filtered = connected.filter(
        (u) =>
          String(u._id || u.id) !== String(currentUserId) &&
          u.username?.toLowerCase() !== currentUserHandle &&
          u.email?.toLowerCase() !== currentUserEmail.toLowerCase()
      );
      setUsersList(filtered);

      if (filtered.length > 0) {
        setSelectedUser(filtered[0]);
      } else {
        setSelectedUser(null);
      }

      if (socket) {
        socket.emit('respond_connection_request', {
          senderId: target._id,
          receiverId: currentUserId,
          action: 'disconnected',
        });
      }
    } catch (err) {
      console.error('Error disconnecting connection:', err);
    }
  };

  const handleExecuteDeleteAccount = async (e) => {
    if (e) e.preventDefault();
    if (!currentUserId || !deleteAccountPassword.trim()) {
      setDeleteAccountError('Please enter your password to confirm account deletion.');
      return;
    }
    setDeleteAccountError('');
    try {
      const res = await deleteUserAccount(currentUserId, deleteAccountPassword, deleteAccountMessages);
      if (res && res.success) {
        setShowDeleteAccountModal(false);
        setDeleteAccountPassword('');
        onLogout();
      } else {
        setDeleteAccountError(res?.message || 'Incorrect password! Account deletion cancelled.');
      }
    } catch (err) {
      setDeleteAccountError('Failed to delete account. Please check your password.');
    }
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setProfileSuccessMsg('');
    setProfileErrorMsg('');

    if (!profileName.trim() || !profileUsername.trim() || !profileEmail.trim()) {
      setProfileErrorMsg('⚠️ Name, Username, and Email are required.');
      return;
    }

    setProfileUpdating(true);
    try {
      const res = await updateUserProfile(currentUserId, {
        name: profileName.trim(),
        username: profileUsername.trim().toLowerCase(),
        email: profileEmail.trim().toLowerCase(),
        gender: profileGender,
        mobile: profileMobile,
        age: profileAge,
      });

      if (res && res.success && res.user) {
        setProfileSuccessMsg('✅ Profile details updated successfully!');
        setEditingCard(null);
        if (onUserUpdate) {
          onUserUpdate(res.user);
        }
      } else {
        setProfileErrorMsg(res?.message || 'Failed to update profile details.');
      }
    } catch (err) {
      setProfileErrorMsg('An error occurred while updating profile.');
    } finally {
      setProfileUpdating(false);
    }
  };

  // Load Contacts list (Connected Users) OR Search All Users across platform
  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      const query = searchQuery.trim().toLowerCase();

      if (!query) {
        // Default View: Show ONLY Connected Friends + Nira Bot!
        const connected = await fetchConnectedUsers(currentUserId);
        const filtered = connected.filter(
          (u) =>
            String(u._id || u.id) !== String(currentUserId) &&
            u.username?.toLowerCase() !== currentUserHandle &&
            u.email?.toLowerCase() !== currentUserEmail.toLowerCase()
        );
        setUsersList(filtered);
      } else {
        // Search View: Search all registered users
        const list = await fetchAllUsers(query);
        const filtered = list.filter(
          (u) =>
            String(u._id || u.id) !== String(currentUserId) &&
            u.username?.toLowerCase() !== currentUserHandle &&
            u.email?.toLowerCase() !== currentUserEmail.toLowerCase()
        );

        const statusMap = {};
        for (let targetUser of filtered) {
          const res = await fetchConnectionStatus(currentUserId, targetUser._id);
          statusMap[targetUser._id] = res.status || 'none';
        }
        setConnectionStatuses((prev) => ({ ...prev, ...statusMap }));
        setUsersList(filtered);
      }

      setLoadingUsers(false);
    };

    const timer = setTimeout(loadUsers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, currentUserId, currentUserHandle, currentUserEmail]);


  // Fetch last message previews and unread counts for all users in directory
  useEffect(() => {
    if (!usersList.length || !currentUserId) return;

    usersList.forEach(async (u) => {
      if (!u._id) return;
      const history = await fetchConversation(currentUserId, u._id);
      if (history && history.length > 0) {
        const lastMsg = history[history.length - 1];
        const msgTime = new Date(lastMsg.createdAt || Date.now()).getTime();

        const seenTimeStr = localStorage.getItem(`seen_chat_${currentUserId}_${u._id}`);
        const seenTime = seenTimeStr ? parseInt(seenTimeStr, 10) : 0;
        const isCleared = localStorage.getItem(`cleared_unread_${currentUserId}_${u._id}`) === 'true';
        const isCurrentlySelected = selectedUserRef.current && selectedUserRef.current._id === u._id;

        const unreadMessages = history.filter((m) => {
          if (m.sender !== u._id || m.receiver !== currentUserId) return false;
          if (m.isRead) return false;
          if (seenTime > 0) {
            const mTime = new Date(m.createdAt || 0).getTime();
            if (mTime <= seenTime) return false;
          }
          return true;
        });

        const unread = (isCurrentlySelected || isCleared) ? 0 : unreadMessages.length;

        setLastMessages((prev) => ({
          ...prev,
          [u._id]: {
            preview: formatLastMessagePreview(lastMsg),
            time: formatLastMessageTime(lastMsg.createdAt),
          },
        }));
        setLastMessageTimestamps((prev) => ({
          ...prev,
          [u._id]: msgTime,
        }));
        setUnreadCounts((prev) => ({
          ...prev,
          [u._id]: unread,
        }));
      }
    });
  }, [usersList, currentUserId]);

  // Instant Read Reaction Trigger Effect when active chat has unread messages
  useEffect(() => {
    if (!selectedUser || !currentUserId || !socket) return;

    const hasUnreadFromPartner = messages.some(
      (m) => m.sender === selectedUser._id && m.receiver === currentUserId && !m.isRead
    );

    if (hasUnreadFromPartner) {
      socket.emit('mark_read_instant', {
        readerId: currentUserId,
        senderId: selectedUser._id,
      });

      markMessagesAsRead(currentUserId, selectedUser._id);
      setUnreadCounts((prev) => ({ ...prev, [selectedUser._id]: 0 }));
      try {
        localStorage.setItem(`seen_chat_${currentUserId}_${selectedUser._id}`, Date.now().toString());
        localStorage.setItem(`cleared_unread_${currentUserId}_${selectedUser._id}`, 'true');
      } catch (e) {}
    }
  }, [messages, selectedUser, currentUserId, socket]);

  // Fetch Conversation History & Switch User
  useEffect(() => {
    if (!selectedUser || !currentUserId) return;

    setShowSettingsPanel(false);
    setUnreadCounts((prev) => ({ ...prev, [selectedUser._id]: 0 }));
    try {
      localStorage.setItem(`seen_chat_${currentUserId}_${selectedUser._id}`, Date.now().toString());
      localStorage.setItem(`cleared_unread_${currentUserId}_${selectedUser._id}`, 'true');
    } catch (e) {}

    if (socketRef.current) {
      socketRef.current.emit('active_chat_changed', {
        userId: currentUserId,
        partnerId: selectedUser._id,
      });

      socketRef.current.emit('mark_read_instant', {
        readerId: currentUserId,
        senderId: selectedUser._id,
      });
    }

    markMessagesAsRead(currentUserId, selectedUser._id);

    const loadChat = async (isInitialLoad = false) => {
      const history = await fetchConversation(currentUserId, selectedUser._id);
      setMessages(history || []);
      setUnreadCounts((prev) => ({ ...prev, [selectedUser._id]: 0 }));

      if (history && history.length > 0) {
        const lastMsg = history[history.length - 1];
        setLastMessages((prev) => ({
          ...prev,
          [selectedUser._id]: {
            preview: formatLastMessagePreview(lastMsg),
            time: formatLastMessageTime(lastMsg.createdAt),
          },
        }));
      }

      if (isInitialLoad) {
        isUserAtBottomRef.current = true;
        setTimeout(scrollToBottomInstant, 30);
      }
    };

    setLoadingChat(true);
    loadChat(true).then(() => setLoadingChat(false));

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('active_chat_changed', {
          userId: currentUserId,
          partnerId: null,
        });
      }
    };
  }, [selectedUser, currentUserId]);

  // Handle start editing a message
  const handleStartEdit = (msg) => {
    setEditingMessage(msg);
    setNewMessageText(msg.text || '');
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };

  // Handle cancel editing
  const handleCancelEdit = () => {
    setEditingMessage(null);
    setNewMessageText('');
  };

  // Handle open custom delete confirm alert box
  const handleDeleteMessage = (msg) => {
    if (!msg || !msg._id || !selectedUser) return;
    setDeleteConfirmMsg(msg);
  };

  // Execute actual deletion after user clicks Delete in custom alert modal
  const confirmExecuteDelete = async () => {
    if (!deleteConfirmMsg || !selectedUser) return;
    const targetMsg = deleteConfirmMsg;
    setDeleteConfirmMsg(null);

    // Optimistically remove from UI and update sidebar last message preview
    setMessages((prev) => {
      const filtered = prev.filter((m) => String(m._id) !== String(targetMsg._id));
      const newLastMsg = filtered[filtered.length - 1];
      setLastMessages((lastPrev) => ({
        ...lastPrev,
        [selectedUser._id]: {
          preview: newLastMsg ? formatLastMessagePreview(newLastMsg) : '',
          time: newLastMsg ? formatLastMessageTime(newLastMsg.createdAt) : '',
        },
      }));
      return filtered;
    });

    // Emit socket delete event to partner
    if (socket) {
      socket.emit('delete_message', {
        messageId: targetMsg._id,
        receiverId: selectedUser._id,
      });
    }

    // Call backend API
    await deleteChatMessage(targetMsg._id, currentUserId);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() && !selectedFile) return;
    if (!selectedUser || !currentUserId) return;

    const textToSend = newMessageText.trim();

    // IF EDITING AN EXISTING MESSAGE
    if (editingMessage) {
      const msgId = editingMessage._id;
      setEditingMessage(null);
      setNewMessageText('');

      // Update UI optimistically
      setMessages((prev) =>
        prev.map((m) => (m._id === msgId ? { ...m, text: textToSend, isEdited: true } : m))
      );

      // Emit socket edit event
      if (socket) {
        socket.emit('edit_message', {
          messageId: msgId,
          receiverId: selectedUser._id,
          text: textToSend,
        });
      }

      // Call backend API
      await editChatMessage(msgId, currentUserId, textToSend);
      return;
    }

    const fileToUpload = selectedFile; // copy to local variable
    setNewMessageText('');
    setSelectedFile(null);

    let fileData = null;

    // Upload file first if one is selected
    if (fileToUpload) {
      try {
        setIsUploading(true);
        fileData = await uploadFile(fileToUpload.file);
      } catch (err) {
        console.error('File upload failed:', err);
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    const msgData = {
      _id: 'temp_' + Date.now(),
      sender: currentUserId,
      receiver: selectedUser._id,
      text: textToSend || '',
      isRead: false,
      createdAt: new Date().toISOString(),
      ...(fileData || {}),
    };

    // Show message immediately in UI
    const nowTime = Date.now();
    setMessages((prev) => [...prev, msgData]);
    setLastMessages((prev) => ({
      ...prev,
      [selectedUser._id]: {
        preview: formatLastMessagePreview(msgData),
        time: formatLastMessageTime(msgData.createdAt),
      },
    }));
    setLastMessageTimestamps((prev) => ({
      ...prev,
      [selectedUser._id]: nowTime,
    }));

    isUserAtBottomRef.current = true;
    setTimeout(scrollToBottomInstant, 20);

    if (socket) {
      socket.emit('send_message', {
        sender: currentUserId,
        receiver: selectedUser._id,
        text: textToSend,
        createdAt: new Date().toISOString(),
        fileUrl: fileData ? fileData.fileUrl : null,
        fileName: fileData ? fileData.fileName : null,
        fileType: fileData ? fileData.fileType : null,
        fileSize: fileData ? fileData.fileSize : null,
      });
    }

    try {
      const res = await postChatMessage(currentUserId, selectedUser._id, textToSend, false, fileData);
      if (res) {
        // Replace temp message with real db message
        setMessages((prevMsgs) =>
          prevMsgs.map((m) => (m._id === msgData._id ? { ...res, isRead: m.isRead || res.isRead, ...(fileData || {}) } : m))
        );
        // Refresh last message preview with saved database message
        setLastMessages((prev) => ({
          ...prev,
          [selectedUser._id]: {
            preview: formatLastMessagePreview(res),
            time: formatLastMessageTime(res.createdAt),
          },
        }));
      }
    } catch (err) {
      console.error('Failed to save message:', err);
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    setSelectedFile({ file, previewUrl, name: file.name, type: file.type, size: file.size });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isUserOnline = (userId) => onlineUsers.includes(userId);

  const formatTime = (dateStr) => {
    try {
      const d = new Date(dateStr || Date.now());
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        maxWidth: '100%',
        background: '#ffffff',
        display: 'grid',
        gridTemplateColumns: isMobile
          ? '1fr'
          : sidebarCollapsed ? '76px 1fr' : '320px 1fr',
        overflow: 'hidden',
        position: 'relative',
        transition: 'grid-template-columns 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* LEFT SIDEBAR: Search Users & User Directory */}
      {/* On mobile: hide sidebar when a user is selected OR when Settings is open */}
      <div
        style={{
          background: '#f8fafc',
          borderRight: isMobile ? 'none' : '1px solid #e2e8f0',
          display: isMobile && (selectedUser || showSettingsPanel) ? 'none' : 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Top Header: Only Nira Chat branding */}
        <div
          style={{
            padding: sidebarCollapsed ? '16px 8px' : '18px 18px',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'space-between',
          }}
        >
          {!sidebarCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>

              {/* Speech Bubble Icon with "N" */}
              <div style={{ position: 'relative', flexShrink: 0, width: '46px', height: '48px' }}>
                {/* Bubble body */}
                <div
                  style={{
                    width: '46px',
                    height: '38px',
                    borderRadius: '50%',
                    background: '#0f1e3d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      color: '#ffffff',
                      fontSize: '1.15rem',
                      fontFamily: "'Permanent Marker', cursive",
                      lineHeight: 1,
                      marginTop: '2px',
                    }}
                  >
                    N
                  </span>
                </div>
                {/* Bubble tail - overlaps bubble bottom-left, no gap */}
                <div
                  style={{
                    position: 'absolute',
                    top: '28px',
                    left: '6px',
                    width: '0',
                    height: '0',
                    borderRight: '12px solid transparent',
                    borderLeft: '0px solid transparent',
                    borderTop: '14px solid #0f1e3d',
                  }}
                />
              </div>

              {/* NIRA CHAT brushstroke text */}
              <span
                style={{
                  fontFamily: "'Permanent Marker', cursive",
                  fontSize: '1.25rem',
                  color: '#0f1e3d',
                  letterSpacing: '1px',
                  whiteSpace: 'nowrap',
                }}
              >
                NIRA CHAT
              </span>
            </div>
          )}

          {/* Top Header Action Button: 3-line icon to open Settings */}
          <button
            onClick={() => setShowSettingsPanel(!showSettingsPanel)}
            title={showSettingsPanel ? 'Close Settings' : 'Settings'}
            style={{
              border: 'none',
              background: showSettingsPanel ? '#4f46e5' : '#f1f5f9',
              color: showSettingsPanel ? '#ffffff' : '#4f46e5',
              padding: '9px 12px',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              flexShrink: 0,
              boxShadow: showSettingsPanel ? '0 4px 12px rgba(79,70,229,0.3)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <MenuLinesIcon size={20} color={showSettingsPanel ? '#ffffff' : '#4f46e5'} />
          </button>
        </div>

        {/* User Search Input Box */}
        {!sidebarCollapsed && (
          <div style={{ padding: '16px 18px' }}>
            <label className="form-label font-extrabold" style={{ marginBottom: '8px', fontSize: '0.8rem' }}>
              <Search size={14} /> Search Users by @username
            </label>
            <div className="input-wrapper">
              <input
                type="text"
                className="form-input font-bold"
                style={{ paddingLeft: '42px', fontSize: '0.92rem', height: '44px' }}
                placeholder="search @username or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
              />
              <Search className="input-icon" size={18} />
            </div>
          </div>
        )}

        {/* Sidebar Navigation Tabs (Chats vs Requests) */}
        {!sidebarCollapsed && !searchQuery && (
          <div style={{ padding: '0 18px 12px 18px', display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setSidebarTab('chats')}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '12px',
                border: 'none',
                background: sidebarTab === 'chats' ? 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)' : '#f1f5f9',
                color: sidebarTab === 'chats' ? '#ffffff' : '#64748b',
                fontWeight: '800',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: sidebarTab === 'chats' ? '0 4px 12px rgba(79,70,229,0.25)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <MessageSquareText size={16} /> Chats
            </button>

            <button
              onClick={() => setSidebarTab('requests')}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '12px',
                border: 'none',
                background: sidebarTab === 'requests' ? 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)' : '#f1f5f9',
                color: sidebarTab === 'requests' ? '#ffffff' : '#64748b',
                fontWeight: '800',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                position: 'relative',
                boxShadow: sidebarTab === 'requests' ? '0 4px 12px rgba(79,70,229,0.25)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <UserCheck size={16} /> Requests
              {pendingRequests.length > 0 && (
                <span
                  style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    padding: '2px 7px',
                    borderRadius: '10px',
                    marginLeft: '2px',
                  }}
                >
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Users Directory & Requests List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: sidebarCollapsed ? '12px 6px' : '6px 14px 14px 14px' }}>
          {sidebarTab === 'requests' && !searchQuery ? (
            /* REQUESTS TAB VIEW */
            pendingRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 16px', color: '#64748b' }}>
                <UserCheck size={36} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                {!sidebarCollapsed && (
                  <>
                    <p style={{ fontWeight: '800', fontSize: '1rem' }}>No Connection Requests</p>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                      When someone sends you a connect request, it will appear here.
                    </p>
                  </>
                )}
              </div>
            ) : (
              pendingRequests.map((req) => {
                const s = req.sender || {};
                return (
                  <div
                    key={req._id}
                    style={{
                      padding: '14px 14px',
                      borderRadius: '16px',
                      marginBottom: '10px',
                      background: '#ffffff',
                      border: '1.5px solid #e0e7ff',
                      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          fontSize: '1.1rem',
                        }}
                      >
                        {(s.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h4 className="font-extrabold" style={{ fontSize: '1.02rem', color: '#0f172a', lineHeight: 1.25 }}>
                          {s.name}
                        </h4>
                        <p style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '600' }}>
                          @{s.username}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleRespondRequest(req._id, 'accepted', s._id)}
                        style={{
                          flex: 1,
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          fontWeight: '800',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 3px 10px rgba(16, 185, 129, 0.25)',
                        }}
                      >
                        <Check size={14} /> Accept
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRespondRequest(req._id, 'declined', s._id)}
                        style={{
                          flex: 1,
                          background: '#fef2f2',
                          color: '#ef4444',
                          border: '1px solid #fecaca',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          fontWeight: '800',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <UserX size={14} /> Decline
                      </button>
                    </div>
                  </div>
                );
              })
            )
          ) : loadingUsers ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
              <div className="spinner" style={{ margin: '0 auto 8px auto', borderColor: '#4f46e5', borderTopColor: 'transparent' }}></div>
              {!sidebarCollapsed && 'Loading users...'}
            </div>
          ) : usersList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 16px', color: '#64748b' }}>
              <AtSign size={36} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
              {!sidebarCollapsed && (
                <>
                  <p style={{ fontWeight: '800', fontSize: '1rem' }}>No user found</p>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    {searchQuery ? `No matching account for "${searchQuery}"` : 'No connected contacts yet. Search @username to connect!'}
                  </p>
                </>
              )}
            </div>
          ) : (
            [...usersList]
              .sort((a, b) => {
                const timeA = lastMessageTimestamps[a._id] || 0;
                const timeB = lastMessageTimestamps[b._id] || 0;
                if (timeA !== timeB) return timeB - timeA;
                return (a.name || '').localeCompare(b.name || '');
              })
              .map((u) => {
                const active = selectedUser && selectedUser._id === u._id && !showSettingsPanel;
                const online = isUserOnline(u._id);
                const lastMsgData = lastMessages[u._id];
                const lastMsgPreview = typeof lastMsgData === 'object' ? lastMsgData.preview : (lastMsgData || '');
                const lastMsgTime = typeof lastMsgData === 'object' ? lastMsgData.time : '';
                const unreadCount = unreadCounts[u._id] || 0;
                const connStatus = connectionStatuses[u._id] || (u.username === 'nira' ? 'connected' : 'none');

                return (
                  <div
                    key={u._id}
                    onClick={() => {
                      if (!searchQuery || connStatus === 'connected' || u.username === 'nira') {
                        setSelectedUser(u);
                        setUnreadCounts((prev) => ({ ...prev, [u._id]: 0 }));
                        setSearchQuery('');
                      }
                    }}
                    title={u.name}
                    style={{
                      padding: sidebarCollapsed ? '12px 0' : '14px 16px',
                      borderRadius: '16px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      background: active ? '#ffffff' : 'transparent',
                      border: `1.5px solid ${active ? '#4f46e5' : 'transparent'}`,
                      boxShadow: active ? '0 4px 14px rgba(79, 70, 229, 0.12)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: sidebarCollapsed ? 'center' : 'space-between',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: sidebarCollapsed ? '0' : '14px', minWidth: 0, flex: 1, justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: u.username === 'nira' ? 'linear-gradient(135deg, #020617 0%, #1e1b4b 100%)' : '#0f172a',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '800',
                            fontSize: '1.1rem',
                          }}
                        >
                          {(u.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className={online ? 'online-pulse' : 'offline-pulse'}></span>
                      </div>

                      {!sidebarCollapsed && (
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h4 className="font-extrabold" style={{ fontSize: '1.08rem', color: '#0f172a', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {u.name}
                          </h4>
                          <p
                            style={{
                              fontSize: '0.85rem',
                              color: unreadCount > 0 ? '#4f46e5' : '#64748b',
                              fontWeight: unreadCount > 0 ? '800' : '600',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              marginTop: '3px',
                            }}
                          >
                            {searchQuery ? `@${u.username}` : (lastMsgPreview || `@${u.username}`)}
                          </p>
                        </div>
                      )}
                    </div>

                    {!sidebarCollapsed && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                          marginLeft: '8px',
                          flexShrink: 0,
                        }}
                      >
                        {searchQuery && u.username !== 'nira' ? (
                          connStatus === 'connected' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(u);
                                setSearchQuery('');
                              }}
                              style={{
                                background: '#ede9fe',
                                color: '#4f46e5',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '10px',
                                fontWeight: 800,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                              }}
                            >
                              Chat
                            </button>
                          ) : connStatus === 'pending_sent' ? (
                            <span
                              style={{
                                background: '#fef3c7',
                                color: '#d97706',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontWeight: 800,
                                fontSize: '0.74rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Clock size={12} /> Pending
                            </span>
                          ) : connStatus === 'pending_received' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSidebarTab('requests');
                                setSearchQuery('');
                              }}
                              style={{
                                background: '#10b981',
                                color: '#ffffff',
                                border: 'none',
                                padding: '6px 10px',
                                borderRadius: '10px',
                                fontWeight: 800,
                                fontSize: '0.76rem',
                                cursor: 'pointer',
                              }}
                            >
                              Accept
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendConnectionRequest(u);
                              }}
                              style={{
                                background: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '10px',
                                fontWeight: 800,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 3px 8px rgba(79,70,229,0.25)',
                              }}
                            >
                              <UserPlus size={13} /> Connect
                            </button>
                          )
                        ) : (
                          <>
                            {lastMsgTime && (
                              <span
                                style={{
                                  fontSize: '0.74rem',
                                  fontWeight: '700',
                                  color: unreadCount > 0 ? '#ef4444' : '#94a3b8',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {lastMsgTime}
                              </span>
                            )}
                            {unreadCount > 0 && (
                              <span
                                style={{
                                  minWidth: '18px',
                                  height: '18px',
                                  padding: '0 5px',
                                  borderRadius: '10px',
                                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                  color: '#ffffff',
                                  fontSize: '0.68rem',
                                  fontWeight: '900',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5)',
                                  marginTop: '4px',
                                }}
                                title={`${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`}
                              >
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* RIGHT MAIN AREA (FULL PAGE CHAT OR SETTINGS DASHBOARD) */}
      <div style={{
        display: isMobile && !selectedUser && !showSettingsPanel ? 'none' : 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      }}>
        {showSettingsPanel ? (
          /* SETTINGS DASHBOARD OPENED DIRECTLY IN RIGHT PANEL */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              background: '#f8fafc',
              overflowY: 'auto',
              padding: isMobile ? '20px 16px 20px 16px' : '36px 60px 36px 44px',
            }}
          >
            {/* Clean Settings Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
              {/* Back to chat/list button */}
              <button
                type="button"
                onClick={() => setShowSettingsPanel(false)}
                style={{
                  background: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '9px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '800',
                  fontSize: '0.9rem',
                  flexShrink: 0,
                  boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
                }}
              >
                <ArrowLeft size={18} strokeWidth={2.5} />
                <span>Back</span>
              </button>
              <div>
                <h2 className="font-extrabold" style={{ fontSize: isMobile ? '1.25rem' : '1.6rem', color: '#0f172a' }}>
                  Account Profile & Settings
                </h2>
                <p style={{ fontSize: isMobile ? '0.8rem' : '0.9rem', color: '#64748b', fontWeight: '600' }}>
                  Manage your personal account details & handle
                </p>
              </div>
            </div>

            {/* Main Profile Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, #020617 0%, #1e1b4b 100%)',
                borderRadius: '24px',
                padding: isMobile ? '20px' : '32px',
                color: '#ffffff',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                justifyContent: 'space-between',
                gap: isMobile ? '16px' : '0',
                marginBottom: '28px',
                boxShadow: '0 12px 30px rgba(15, 23, 42, 0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flex: 1 }}>
                <div
                  style={{
                    width: '74px',
                    height: '74px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '900',
                    fontSize: '2rem',
                    border: '3px solid rgba(255,255,255,0.2)',
                    flexShrink: 0,
                  }}
                >
                  {(profileName || currentUserName || 'U').charAt(0).toUpperCase()}
                </div>

                {editingCard === 'hero' ? (
                  <form onSubmit={handleSaveProfile} style={{ flex: 1, maxWidth: '400px' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.78rem', color: '#a5b4fc', fontWeight: '800' }}>Full Name</label>
                      <input
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #6366f1', background: '#0f172a', color: '#ffffff', fontWeight: '700', fontSize: '0.92rem' }}
                      />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '0.78rem', color: '#a5b4fc', fontWeight: '800' }}>Username (@handle)</label>
                      <input
                        type="text"
                        required
                        value={profileUsername}
                        onChange={(e) => setProfileUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #6366f1', background: '#0f172a', color: '#ffffff', fontWeight: '700', fontSize: '0.92rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="submit" disabled={profileUpdating} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#4f46e5', color: '#ffffff', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}>
                        {profileUpdating ? 'Saving...' : 'Save Name & Handle'}
                      </button>
                      <button type="button" onClick={() => setEditingCard(null)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#ffffff', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <h3 className="font-extrabold" style={{ fontSize: '1.6rem', marginBottom: '4px' }}>
                      {currentUserName}
                    </h3>
                    <p style={{ fontSize: '1rem', color: '#a5b4fc', fontWeight: '800' }}>
                      @{currentUserHandle}
                    </p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEditingCard(editingCard === 'hero' ? null : 'hero')}
                  style={{
                    background: editingCard === 'hero' ? '#ffffff' : 'rgba(255, 255, 255, 0.15)',
                    color: editingCard === 'hero' ? '#0f172a' : '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <Edit3 size={14} /> {editingCard === 'hero' ? 'Close Edit' : 'Edit Info'}
                </button>

                <div
                  style={{
                    padding: '10px 18px',
                    borderRadius: '20px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#34d399',
                    fontSize: '0.88rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <CheckCircle2 size={18} /> Active Verified Account
                </div>
              </div>
            </div>

            {/* Profile Grid Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '14px' : '20px' }}>
              {/* Card 1: Email Address */}
              <div style={{ background: '#ffffff', padding: '24px', borderRadius: '20px', border: editingCard === 'email' ? '2px solid #4f46e5' : '1.5px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={18} style={{ color: '#4f46e5' }} /> Email Address
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingCard(editingCard === 'email' ? null : 'email')}
                    style={{
                      background: editingCard === 'email' ? '#4f46e5' : '#f1f5f9',
                      color: editingCard === 'email' ? '#ffffff' : '#4f46e5',
                      border: 'none',
                      padding: '5px 10px',
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Edit3 size={13} /> {editingCard === 'email' ? 'Close' : 'Edit'}
                  </button>
                </div>

                {editingCard === 'email' ? (
                  <form onSubmit={handleSaveProfile} style={{ marginTop: '10px' }}>
                    <input
                      type="email"
                      required
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.92rem', fontWeight: '700', marginBottom: '10px', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button type="submit" disabled={profileUpdating} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#4f46e5', color: '#ffffff', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}>
                        {profileUpdating ? 'Saving...' : 'Save Email'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                    {currentUserEmail}
                  </div>
                )}
              </div>

              {/* Card 2: Gender */}
              <div style={{ background: '#ffffff', padding: '24px', borderRadius: '20px', border: editingCard === 'gender' ? '2px solid #4f46e5' : '1.5px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={18} style={{ color: '#4f46e5' }} /> Gender
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingCard(editingCard === 'gender' ? null : 'gender')}
                    style={{
                      background: editingCard === 'gender' ? '#4f46e5' : '#f1f5f9',
                      color: editingCard === 'gender' ? '#ffffff' : '#4f46e5',
                      border: 'none',
                      padding: '5px 10px',
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Edit3 size={13} /> {editingCard === 'gender' ? 'Close' : 'Edit'}
                  </button>
                </div>

                {editingCard === 'gender' ? (
                  <form onSubmit={handleSaveProfile} style={{ marginTop: '10px' }}>
                    <select
                      value={profileGender}
                      onChange={(e) => setProfileGender(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.92rem', fontWeight: '700', marginBottom: '10px', outline: 'none', background: '#ffffff' }}
                    >
                      <option value="M">Male (M)</option>
                      <option value="F">Female (F)</option>
                      <option value="Other">Other</option>
                    </select>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button type="submit" disabled={profileUpdating} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#4f46e5', color: '#ffffff', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}>
                        {profileUpdating ? 'Saving...' : 'Save Gender'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                    {currentUserGender}
                  </div>
                )}
              </div>

              {/* Card 3: Age */}
              <div style={{ background: '#ffffff', padding: '24px', borderRadius: '20px', border: editingCard === 'age' ? '2px solid #4f46e5' : '1.5px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={18} style={{ color: '#4f46e5' }} /> Age
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingCard(editingCard === 'age' ? null : 'age')}
                    style={{
                      background: editingCard === 'age' ? '#4f46e5' : '#f1f5f9',
                      color: editingCard === 'age' ? '#ffffff' : '#4f46e5',
                      border: 'none',
                      padding: '5px 10px',
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Edit3 size={13} /> {editingCard === 'age' ? 'Close' : 'Edit'}
                  </button>
                </div>

                {editingCard === 'age' ? (
                  <form onSubmit={handleSaveProfile} style={{ marginTop: '10px' }}>
                    <input
                      type="number"
                      min="10"
                      max="120"
                      value={profileAge}
                      onChange={(e) => setProfileAge(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.92rem', fontWeight: '700', marginBottom: '10px', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button type="submit" disabled={profileUpdating} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#4f46e5', color: '#ffffff', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}>
                        {profileUpdating ? 'Saving...' : 'Save Age'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                    {currentUserAge} years old
                  </div>
                )}
              </div>

              {/* Card 4: Mobile Number */}
              <div style={{ background: '#ffffff', padding: '24px', borderRadius: '20px', border: editingCard === 'mobile' ? '2px solid #4f46e5' : '1.5px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={18} style={{ color: '#4f46e5' }} /> Mobile Number
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingCard(editingCard === 'mobile' ? null : 'mobile')}
                    style={{
                      background: editingCard === 'mobile' ? '#4f46e5' : '#f1f5f9',
                      color: editingCard === 'mobile' ? '#ffffff' : '#4f46e5',
                      border: 'none',
                      padding: '5px 10px',
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Edit3 size={13} /> {editingCard === 'mobile' ? 'Close' : 'Edit'}
                  </button>
                </div>

                {editingCard === 'mobile' ? (
                  <form onSubmit={handleSaveProfile} style={{ marginTop: '10px' }}>
                    <input
                      type="tel"
                      value={profileMobile}
                      onChange={(e) => setProfileMobile(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.92rem', fontWeight: '700', marginBottom: '10px', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button type="submit" disabled={profileUpdating} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#4f46e5', color: '#ffffff', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}>
                        {profileUpdating ? 'Saving...' : 'Save Mobile'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                    {currentUserMobile}
                  </div>
                )}
              </div>
            </div>

            {/* Danger Zone: Delete Account */}
            <div
              style={{
                marginTop: '28px',
                background: '#fff1f2',
                padding: '24px',
                borderRadius: '20px',
                border: '1.5px solid #fecdd3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h4 className="font-extrabold" style={{ fontSize: '1.1rem', color: '#be123c', marginBottom: '4px' }}>
                  Danger Zone: Delete Account
                </h4>
                <p style={{ fontSize: '0.86rem', color: '#9f1239', fontWeight: '600' }}>
                  Permanently delete your account profile and all data.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '14px',
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Trash2 size={16} /> Delete My Account
              </button>
            </div>

            {/* Log Out Button Card */}
            <div style={{ marginTop: '20px', marginBottom: '10px' }}>
              <button
                type="button"
                onClick={onLogout}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  borderRadius: '16px',
                  border: '1.5px solid #fecaca',
                  background: '#fef2f2',
                  color: '#ef4444',
                  fontWeight: '800',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)',
                  transition: 'all 0.2s ease',
                }}
              >
                <LogOut size={20} strokeWidth={2.5} />
                <span>Log Out of Account</span>
              </button>
            </div>
          </div>
        ) : selectedUser ? (
          <>
            {/* Active Conversation Header - LARGER FONT SIZE FOR CONTACT NAME */}
            <div
              style={{
                padding: isMobile ? '14px 16px' : '18px 28px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#ffffff',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '16px' }}>
                {/* ← MOBILE BACK BUTTON */}
                {isMobile && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null);
                      setMessages([]);
                    }}
                    style={{
                      background: '#f1f5f9',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '8px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#0f172a',
                      flexShrink: 0,
                    }}
                  >
                    <ArrowLeft size={20} strokeWidth={2.5} />
                  </button>
                )}

                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: isMobile ? '40px' : '50px',
                      height: isMobile ? '40px' : '50px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #020617 0%, #1e1b4b 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '900',
                      fontSize: isMobile ? '1.1rem' : '1.3rem',
                    }}
                  >
                    {(selectedUser.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className={isUserOnline(selectedUser._id) ? 'online-pulse' : 'offline-pulse'}></span>
                </div>

                <div>
                  {/* LARGER ACTIVE CONTACT NAME */}
                  <h3 className="font-extrabold" style={{ fontSize: isMobile ? '1.1rem' : '1.35rem', color: '#0f172a', lineHeight: 1.2 }}>
                    {selectedUser.name}
                  </h3>
                  <p style={{ fontSize: isMobile ? '0.8rem' : '0.92rem', color: '#4f46e5', fontWeight: '800', marginTop: '2px' }}>
                    @{(selectedUser.username || selectedUser.email?.split('@')[0] || 'user').toLowerCase()}
                  </p>
                </div>
              </div>

              {/* Online / Offline Status Badge & Disconnect Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '14px' }}>
                <div
                  style={{
                    padding: isMobile ? '5px 10px' : '7px 16px',
                    borderRadius: '20px',
                    background: isUserOnline(selectedUser._id) ? '#ecfdf5' : '#f8fafc',
                    border: `1.5px solid ${isUserOnline(selectedUser._id) ? '#a7f3d0' : '#e2e8f0'}`,
                    color: isUserOnline(selectedUser._id) ? '#047857' : '#64748b',
                    fontSize: isMobile ? '0.75rem' : '0.85rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Circle size={8} fill={isUserOnline(selectedUser._id) ? '#10b981' : '#cbd5e1'} color="none" />
                  {isMobile
                    ? (isUserOnline(selectedUser._id) ? 'Online' : 'Offline')
                    : (isUserOnline(selectedUser._id) ? '🟢 Online Now' : '⚪ Offline')}
                </div>

                {selectedUser.username !== 'nira' && (
                  <button
                    type="button"
                    onClick={() => setShowDisconnectModal(true)}
                    title={`Disconnect with @${selectedUser.username}`}
                    style={{
                      background: '#fef2f2',
                      border: '1.5px solid #fecaca',
                      color: '#ef4444',
                      padding: isMobile ? '6px 10px' : '7px 14px',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 800,
                      fontSize: isMobile ? '0.75rem' : '0.82rem',
                      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.08)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <UserX size={15} /> {isMobile ? '' : 'Disconnect'}
                  </button>
                )}
              </div>
            </div>

            {/* Chat Message Stream - with drag-and-drop */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={handleDrop}
              style={{
                flex: 1,
                minHeight: 0,
                padding: isMobile ? '16px 12px' : '28px 32px',
                overflowY: 'auto',
                background: isDraggingOver ? 'rgba(79,70,229,0.06)' : '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                border: isDraggingOver ? '2px dashed #4f46e5' : '2px dashed transparent',
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              {isDraggingOver && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
                  zIndex: 10,
                }}>
                  <span style={{ fontSize: '3rem' }}>📂</span>
                  <span style={{ fontWeight: 800, color: '#4f46e5', fontSize: '1.1rem', marginTop: '8px' }}>Drop file here to send</span>
                </div>
              )}
              {loadingChat ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: '#64748b' }}>
                  <div className="spinner" style={{ margin: '0 auto 10px auto', borderColor: '#4f46e5', borderTopColor: 'transparent' }}></div>
                  Loading conversation...
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: '#64748b' }}>
                  <Sparkles size={40} style={{ color: '#4f46e5', marginBottom: '12px' }} />
                  <h4 className="font-extrabold" style={{ fontSize: '1.25rem', color: '#0f172a' }}>
                    Start a conversation with @{(selectedUser.username || selectedUser.name).toLowerCase()}
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '4px' }}>
                    Type a message below to start chatting!
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMine = msg.sender === currentUserId || msg.senderId === currentUserId;
                  const recipientOnline = isUserOnline(selectedUser._id);
                  const isRead = Boolean(msg.isRead);

                  return (
                    <div
                      key={msg._id || index}
                      className="msg-row"
                      style={{
                        alignSelf: isMine ? 'flex-end' : 'flex-start',
                        maxWidth: '75%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMine ? 'flex-end' : 'flex-start',
                        margin: '4px 0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexDirection: isMine ? 'row' : 'row-reverse' }}>
                        {/* Hover Action Controls (Edit & Delete) for sent messages */}
                        {isMine && (
                          <div className="msg-hover-actions" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {msg.text && (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(msg)}
                                title="Edit Message"
                                style={{
                                  background: '#ede9fe',
                                  border: 'none',
                                  borderRadius: '8px',
                                  padding: '5px 8px',
                                  cursor: 'pointer',
                                  color: '#4f46e5',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.74rem',
                                  fontWeight: '700',
                                  boxShadow: '0 2px 6px rgba(79,70,229,0.1)',
                                }}
                              >
                                <Pencil size={12} /> Edit
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg)}
                              title="Delete Message"
                              style={{
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '8px',
                                padding: '5px 8px',
                                cursor: 'pointer',
                                color: '#ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.74rem',
                                fontWeight: '700',
                                boxShadow: '0 2px 6px rgba(239,68,68,0.1)',
                              }}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        )}

                        <div
                          style={{
                            padding: msg.fileType === 'image' ? '6px' : '14px 20px',
                            borderRadius: isMine ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                            background: isMine
                              ? 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)'
                              : '#ffffff',
                            color: isMine ? '#ffffff' : '#0f172a',
                            border: isMine ? 'none' : '1.5px solid #e2e8f0',
                            boxShadow: isMine
                              ? '0 6px 18px rgba(79, 70, 229, 0.22)'
                              : '0 4px 10px rgba(0,0,0,0.03)',
                            fontSize: '0.98rem',
                            fontWeight: '600',
                            lineHeight: '1.48',
                            wordBreak: 'break-word',
                            maxWidth: '320px',
                            overflow: 'hidden',
                          }}
                        >
                          {/* File rendering */}
                          {msg.fileUrl && msg.fileType === 'image' && (
                            <div style={{ position: 'relative', cursor: 'pointer', overflow: 'hidden', borderRadius: '14px' }}>
                              <img
                                src={getFileUrl(msg.fileUrl)}
                                alt={msg.fileName || 'Image'}
                                style={{ width: '100%', maxWidth: '280px', borderRadius: '14px', display: 'block', transition: 'transform 0.2s ease' }}
                                onClick={() => setActiveImagePopup({ url: getFileUrl(msg.fileUrl), name: msg.fileName || 'Shared Image', time: formatTime(msg.createdAt), isMine, isRead, recipientOnline })}
                              />
                              <div style={{ position: 'absolute', bottom: '8px', right: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {isMine && (
                                  <span
                                    style={{
                                      background: isRead ? 'rgba(79, 70, 229, 0.9)' : 'rgba(15, 23, 42, 0.75)',
                                      color: '#ffffff',
                                      padding: '3px 8px',
                                      borderRadius: '8px',
                                      fontSize: '0.7rem',
                                      fontWeight: 800,
                                      backdropFilter: 'blur(4px)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    {isRead ? (
                                      <>
                                        <Eye size={12} /> Seen
                                      </>
                                    ) : recipientOnline ? (
                                      'Delivered'
                                    ) : (
                                      'Sent'
                                    )}
                                  </span>
                                )}
                                <div
                                  onClick={() => setActiveImagePopup({ url: getFileUrl(msg.fileUrl), name: msg.fileName || 'Shared Image', time: formatTime(msg.createdAt), isMine, isRead, recipientOnline })}
                                  style={{
                                    background: 'rgba(15, 23, 42, 0.75)', color: '#ffffff',
                                    padding: '4px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700,
                                    backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: '4px',
                                  }}
                                >
                                  <Eye size={12} /> View Full
                                </div>
                              </div>
                            </div>
                          )}
                          {msg.fileUrl && msg.fileType === 'video' && (
                            <video controls style={{ width: '100%', maxWidth: '280px', borderRadius: '14px' }}>
                              <source src={getFileUrl(msg.fileUrl)} />
                            </video>
                          )}
                          {msg.fileUrl && msg.fileType === 'audio' && (
                            <audio controls style={{ width: '100%', maxWidth: '260px', marginBottom: msg.text ? '8px' : 0 }}>
                              <source src={getFileUrl(msg.fileUrl)} />
                            </audio>
                          )}
                          {msg.fileUrl && msg.fileType === 'document' && (
                            <a
                              href={getFileUrl(msg.fileUrl)}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none',
                                color: isMine ? '#ffffff' : '#4f46e5', fontWeight: 700,
                                background: isMine ? 'rgba(255,255,255,0.1)' : 'rgba(79,70,229,0.07)',
                                padding: '10px 14px', borderRadius: '10px', marginBottom: msg.text ? '8px' : 0,
                              }}
                            >
                              <span style={{ fontSize: '1.5rem' }}>📄</span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.fileName}</span>
                            </a>
                          )}
                          {msg.text && <span>{msg.text}</span>}
                        </div>
                      </div>

                      {/* Real Read Receipt & Timestamp */}
                      <div
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          color: '#94a3b8',
                          marginTop: '5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>{formatTime(msg.createdAt)}</span>
                        {msg.isEdited && <span style={{ fontStyle: 'italic', color: '#818cf8' }}>• edited</span>}
                        {isMine && (
                          <span className={`status-badge ${isRead ? 'status-seen' : 'status-sent'}`}>
                            {isRead ? (
                              <>
                                <Eye size={11} inline style={{ marginRight: '2px' }} /> Seen
                              </>
                            ) : recipientOnline ? (
                              'Delivered'
                            ) : (
                              'Sent'
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Input Box */}
            <div style={{ flexShrink: 0, background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>

              {/* Editing Banner */}
              {editingMessage && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 24px',
                    background: '#ede9fe',
                    borderBottom: '1px solid #c7d2fe',
                    color: '#4f46e5',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Edit3 size={16} />
                    <span>Editing message...</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <X size={16} /> Cancel
                  </button>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                onChange={(e) => {
                  handleFileSelect(e.target.files[0]);
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip';
                  }
                }}
              />

              {/* File preview bar */}
              {selectedFile && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 28px', background: 'rgba(79,70,229,0.06)',
                  borderBottom: '1px solid #e2e8f0',
                }}>
                  {selectedFile.previewUrl ? (
                    <img src={selectedFile.previewUrl} alt="preview" style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '2rem' }}>📄</span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.name}</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{formatFileSize(selectedFile.size)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px', borderRadius: '6px' }}
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              <form
                onSubmit={handleSendMessage}
                style={{
                  padding: isMobile ? '10px 12px' : '14px 28px',
                  height: isMobile ? '62px' : '72px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? '8px' : '12px',
                }}
              >
                {/* Styled + Button with Attachment Options Popover */}
                <div style={{ position: 'relative' }}>
                  {showAttachMenu && (
                    <div className="attach-menu-popover">
                      <button
                        type="button"
                        className="attach-option-btn"
                        onClick={() => {
                          setShowAttachMenu(false);
                          if (fileInputRef.current) {
                            fileInputRef.current.accept = 'image/*';
                            fileInputRef.current.click();
                          }
                        }}
                      >
                        <ImageIcon size={18} style={{ color: '#ec4899' }} />
                        <span>Photo / Image</span>
                      </button>

                      <button
                        type="button"
                        className="attach-option-btn"
                        onClick={() => {
                          setShowAttachMenu(false);
                          if (fileInputRef.current) {
                            fileInputRef.current.accept = 'video/*';
                            fileInputRef.current.click();
                          }
                        }}
                      >
                        <Video size={18} style={{ color: '#8b5cf6' }} />
                        <span>Video Clip</span>
                      </button>

                      <button
                        type="button"
                        className="attach-option-btn"
                        onClick={() => {
                          setShowAttachMenu(false);
                          if (fileInputRef.current) {
                            fileInputRef.current.accept = 'audio/*';
                            fileInputRef.current.click();
                          }
                        }}
                      >
                        <Music size={18} style={{ color: '#10b981' }} />
                        <span>Audio Track</span>
                      </button>

                      <button
                        type="button"
                        className="attach-option-btn"
                        onClick={() => {
                          setShowAttachMenu(false);
                          if (fileInputRef.current) {
                            fileInputRef.current.accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip';
                            fileInputRef.current.click();
                          }
                        }}
                      >
                        <FileText size={18} style={{ color: '#3b82f6' }} />
                        <span>Document</span>
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    title="Attach Photos, Videos or Files"
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '14px',
                      border: 'none',
                      background: showAttachMenu
                        ? 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)'
                        : 'linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%)',
                      color: showAttachMenu ? '#ffffff' : '#4f46e5',
                      boxShadow: showAttachMenu
                        ? '0 6px 16px rgba(79, 70, 229, 0.35)'
                        : '0 2px 8px rgba(79, 70, 229, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                      transform: showAttachMenu ? 'rotate(45deg)' : 'rotate(0deg)',
                    }}
                  >
                    <Plus size={24} strokeWidth={2.8} />
                  </button>
                </div>

                <input
                  ref={messageInputRef}
                  type="text"
                  className="form-input font-semibold"
                  style={{ paddingLeft: '18px', flex: 1, height: '48px', fontSize: '0.98rem' }}
                  placeholder={`Type a message to @${(selectedUser.username || selectedUser.name).toLowerCase()}...`}
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn-primary font-extrabold"
                  style={{
                    width: 'auto',
                    padding: '14px 28px',
                    marginTop: 0,
                    borderRadius: '14px',
                    fontSize: '0.98rem',
                  }}
                  disabled={isUploading || (!newMessageText.trim() && !selectedFile)}
                >
                {/* Nira Chat N bubble icon */}
                 <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', marginRight: '6px', flexShrink: 0 }}>
                   {/* Bubble body */}
                   <span style={{
                     display: 'flex', alignItems: 'center', justifyContent: 'center',
                     width: '24px', height: '20px', borderRadius: '50%',
                     background: '#ffffff',
                     position: 'absolute', top: 0, left: 0,
                   }}>
                     <span style={{ color: '#4f46e5', fontSize: '0.72rem', fontFamily: "'Permanent Marker', cursive", lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', textAlign: 'center' }}>N</span>
                   </span>
                   {/* Bubble tail */}
                   <span style={{
                     position: 'absolute', top: '16px', left: '3px',
                     width: 0, height: 0,
                     borderRight: '6px solid transparent',
                     borderLeft: '0',
                     borderTop: '6px solid #ffffff',
                   }} />
                 </span>
                 {isUploading ? 'Uploading...' : 'Send'}
                </button>
              </form>
            </div>
          </>
        ) : (
          /* NO CHAT SELECTED STATE (STUNNING MODERN UI WITH RICH DETAILS & ONBOARDING GUIDE) */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              textAlign: 'center',
              padding: '36px 24px',
              overflowY: 'auto',
            }}
          >
            {/* Glowing Icon Badge */}
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '22px',
                boxShadow: '0 12px 30px -6px rgba(79, 70, 229, 0.4)',
              }}
            >
              <Sparkles size={42} strokeWidth={2} />
            </div>

            <h2 className="font-extrabold" style={{ fontSize: '1.85rem', color: '#0f172a', marginBottom: '10px', letterSpacing: '-0.5px' }}>
              Welcome to Nira Chat
            </h2>

            <p style={{ color: '#64748b', fontWeight: '600', maxWidth: '520px', fontSize: '0.96rem', lineHeight: '1.55', marginBottom: '28px' }}>
              Select a friend from your sidebar or search any user handle to start instant 0ms real-time messaging!
            </p>

            {/* Feature Highlight Cards Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '14px',
                maxWidth: '680px',
                width: '100%',
                marginBottom: '32px',
              }}
            >
              {/* Feature 1: Instant 0ms Chat */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '16px 18px',
                  textAlign: 'left',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4f46e5', fontWeight: '800', fontSize: '0.9rem', marginBottom: '6px' }}>
                  <Sparkles size={16} /> 0ms Instant Chat
                </div>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, fontWeight: '600', lineHeight: '1.4' }}>
                  WebSocket engine powers zero delay message delivery & live read receipts.
                </p>
              </div>

              {/* Feature 2: Connect System */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '16px 18px',
                  textAlign: 'left',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontWeight: '800', fontSize: '0.9rem', marginBottom: '6px' }}>
                  <UserPlus size={16} /> Connect System
                </div>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, fontWeight: '600', lineHeight: '1.4' }}>
                  Search @username to send connection requests & build your friends directory.
                </p>
              </div>

              {/* Feature 3: File & Media Sharing */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '16px 18px',
                  textAlign: 'left',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d97706', fontWeight: '800', fontSize: '0.9rem', marginBottom: '6px' }}>
                  <ImageIcon size={16} /> Media Sharing
                </div>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, fontWeight: '600', lineHeight: '1.4' }}>
                  Send photos, videos, audio clips, and documents instantly in chat.
                </p>
              </div>

              {/* Feature 4: Privacy & Password Lock */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '16px 18px',
                  textAlign: 'left',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: '800', fontSize: '0.9rem', marginBottom: '6px' }}>
                  <ShieldAlert size={16} /> Password Protected
                </div>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, fontWeight: '600', lineHeight: '1.4' }}>
                  Secure password verification for account & message history deletion.
                </p>
              </div>
            </div>

            {/* Current User Handle Pill */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '20px',
                padding: '12px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              }}
            >
              <AtSign size={20} style={{ color: '#4f46e5' }} />
              <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#0f172a' }}>
                Your handle: <strong style={{ color: '#4f46e5' }}>@{currentUserHandle}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Image Fullscreen Lightbox Modal Popup */}
        {activeImagePopup && (
          <div
            className="image-lightbox-overlay"
            onClick={() => setActiveImagePopup(null)}
          >
            <div
              className="image-lightbox-container"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '14px',
                  color: '#ffffff',
                  background: 'rgba(255, 255, 255, 0.08)',
                  padding: '10px 18px',
                  borderRadius: '14px',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ImageIcon size={20} style={{ color: '#818cf8' }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{activeImagePopup.name}</span>
                      {activeImagePopup.isMine && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            padding: '2px 8px',
                            borderRadius: '8px',
                            background: activeImagePopup.isRead ? 'rgba(79, 70, 229, 0.35)' : 'rgba(255, 255, 255, 0.15)',
                            color: activeImagePopup.isRead ? '#a5b4fc' : '#cbd5e1',
                            border: `1px solid ${activeImagePopup.isRead ? 'rgba(165, 180, 252, 0.4)' : 'rgba(255, 255, 255, 0.2)'}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {activeImagePopup.isRead ? (
                            <>
                              <Eye size={12} /> Seen
                            </>
                          ) : activeImagePopup.recipientOnline ? (
                            'Delivered'
                          ) : (
                            'Sent'
                          )}
                        </span>
                      )}
                    </div>
                    {activeImagePopup.time && (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                        Sent at {activeImagePopup.time}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <a
                    href={getFileUrl(activeImagePopup.url)}
                    target="_blank"
                    rel="noreferrer"
                    download
                    title="Download / Open Full Size"
                    style={{
                      background: 'rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                      transition: 'background 0.2s',
                    }}
                  >
                    <Download size={18} />
                  </a>
                  <button
                    onClick={() => setActiveImagePopup(null)}
                    title="Close Preview"
                    style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <img
                src={getFileUrl(activeImagePopup.url)}
                alt={activeImagePopup.name}
                className="image-lightbox-img"
              />
            </div>
          </div>
        )}

        {/* CUSTOM DELETE CONFIRMATION ALERT MODAL BOX */}
        {deleteConfirmMsg && (
          <div
            className="image-lightbox-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10000,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
            onClick={() => setDeleteConfirmMsg(null)}
          >
            <div
              className="image-lightbox-container"
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                padding: '32px 28px',
                maxWidth: '380px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '18px',
                  boxShadow: '0 8px 20px rgba(239, 68, 68, 0.2)',
                }}
              >
                <Trash2 size={30} strokeWidth={2.2} />
              </div>

              <h3
                className="font-extrabold"
                style={{
                  fontSize: '1.35rem',
                  color: '#0f172a',
                  marginBottom: '8px',
                }}
              >
                Delete {deleteConfirmMsg.fileUrl ? (deleteConfirmMsg.fileType === 'image' ? 'Image' : 'File') : 'Message'}?
              </h3>

              <p
                style={{
                  fontSize: '0.92rem',
                  color: '#64748b',
                  lineHeight: '1.5',
                  marginBottom: '24px',
                  fontWeight: 500,
                }}
              >
                Are you sure you want to delete this {deleteConfirmMsg.fileUrl ? 'file attachment' : 'message'}? This action cannot be undone.
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                }}
              >
                <button
                  type="button"
                  onClick={() => setDeleteConfirmMsg(null)}
                  style={{
                    flex: 1,
                    padding: '12px 18px',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#475569',
                    fontWeight: '800',
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmExecuteDelete}
                  style={{
                    flex: 1,
                    padding: '12px 18px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DISCONNECT CONNECTION CONFIRMATION POPUP MODAL */}
        {showDisconnectModal && selectedUser && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
            onClick={() => {
              setShowDisconnectModal(false);
              setDeleteDisconnectMessages(false);
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                padding: '32px 28px',
                maxWidth: '420px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '18px',
                  boxShadow: '0 8px 20px rgba(239, 68, 68, 0.2)',
                }}
              >
                <UserX size={30} strokeWidth={2.2} />
              </div>

              <h3 className="font-extrabold" style={{ fontSize: '1.35rem', color: '#0f172a', marginBottom: '8px' }}>
                Disconnect with @{selectedUser.username}?
              </h3>

              <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: '1.5', marginBottom: '20px' }}>
                Are you sure you want to remove <strong>{selectedUser.name}</strong> (@{selectedUser.username}) from your connected contacts?
              </p>

              {/* Delete All Chat Checkbox */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  marginBottom: '24px',
                  width: '100%',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={deleteDisconnectMessages}
                  onChange={(e) => setDeleteDisconnectMessages(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#ef4444', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.86rem', fontWeight: '800', color: '#0f172a', textAlign: 'left' }}>
                  Also delete all chat history with @{selectedUser.username}
                </span>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowDisconnectModal(false);
                    setDeleteDisconnectMessages(false);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px 18px',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#475569',
                    fontWeight: '800',
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                  }}
                >
                  No, Cancel
                </button>

                <button
                  type="button"
                  onClick={handleExecuteDisconnect}
                  style={{
                    flex: 1,
                    padding: '12px 18px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                  }}
                >
                  Yes, Disconnect
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE ACCOUNT CONFIRMATION POPUP MODAL */}
        {showDeleteAccountModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
            onClick={() => {
              setShowDeleteAccountModal(false);
              setDeleteAccountMessages(false);
              setDeleteAccountPassword('');
              setDeleteAccountError('');
            }}
          >
            <form
              onSubmit={handleExecuteDeleteAccount}
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                padding: '32px 28px',
                maxWidth: '440px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '18px',
                  boxShadow: '0 8px 20px rgba(239, 68, 68, 0.2)',
                }}
              >
                <ShieldAlert size={32} strokeWidth={2.2} />
              </div>

              <h3 className="font-extrabold" style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '8px' }}>
                Confirm Delete Account?
              </h3>

              <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: '1.45', marginBottom: '16px' }}>
                Please enter your account password to permanently delete <strong>@{currentUserHandle}</strong>.
              </p>

              {deleteAccountError && (
                <div
                  style={{
                    width: '100%',
                    background: '#fef2f2',
                    color: '#ef4444',
                    border: '1px solid #fecaca',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '0.84rem',
                    fontWeight: '800',
                    marginBottom: '14px',
                    textAlign: 'left',
                  }}
                >
                  ⚠️ {deleteAccountError}
                </div>
              )}

              {/* Password Input Field */}
              <div style={{ width: '100%', marginBottom: '16px', textAlign: 'left' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a', marginBottom: '6px', display: 'block' }}>
                  Account Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter your password to confirm..."
                  value={deleteAccountPassword}
                  onChange={(e) => {
                    setDeleteAccountPassword(e.target.value);
                    setDeleteAccountError('');
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Delete All Chat Checkbox */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  marginBottom: '24px',
                  width: '100%',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={deleteAccountMessages}
                  onChange={(e) => setDeleteAccountMessages(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#ef4444', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.86rem', fontWeight: '800', color: '#0f172a', textAlign: 'left' }}>
                  Also delete all my sent & received chat messages
                </span>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteAccountModal(false);
                    setDeleteAccountMessages(false);
                    setDeleteAccountPassword('');
                    setDeleteAccountError('');
                  }}
                  style={{
                    flex: 1,
                    padding: '12px 18px',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#475569',
                    fontWeight: '800',
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px 18px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                  }}
                >
                  Confirm Delete
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ====== ONBOARDING TOUR POPUP ====== */}
      {showOnboarding && (() => {
        const steps = [
          {
            emoji: '👋',
            title: 'Welcome to Nira Chat!',
            desc: 'Nira Chat is a real-time messaging app where you can connect and chat with friends. This quick guide will walk you through how everything works — takes just 30 seconds!',
            color: '#4f46e5',
          },
          {
            emoji: '🔍',
            title: 'Search & Find Users',
            desc: 'Use the Search box on the left sidebar and type any @username or name to find other Nira users. Their profile card will appear in the list below.',
            color: '#0ea5e9',
          },
          {
            emoji: '🔗',
            title: 'Send a Connect Request',
            desc: 'Click on any user from the list. If you are not yet connected, click the "Connect" button to send them a connection request. Once they accept, you can start chatting!',
            color: '#8b5cf6',
          },
          {
            emoji: '💬',
            title: 'Start Chatting',
            desc: 'Once connected, click on their name in your chat list to open the conversation. Type your message in the input bar at the bottom and press Send (or hit Enter).',
            color: '#10b981',
          },
          {
            emoji: '📎',
            title: 'Share Images & Files',
            desc: 'Click the "+" button next to the message input to attach images, videos, audio or documents. Sent files are stored securely and always visible in chat.',
            color: '#f59e0b',
          },
          {
            emoji: '✏️',
            title: 'Edit & Delete Messages',
            desc: 'Hover over any message you sent to see Edit (✏️) and Delete (🗑️) options. You can correct typos or remove messages anytime.',
            color: '#ec4899',
          },
          {
            emoji: '⚙️',
            title: 'Settings Panel',
            desc: 'Click the "Settings" button at the bottom of the left sidebar. There you can edit your Name, Username, Email, Gender, Mobile, Age — and even change your password or delete your account.',
            color: '#64748b',
          },
          {
            emoji: '🤖',
            title: 'Meet Nira Bot',
            desc: 'Nira Bot is your built-in assistant! It automatically shows in your chat list and sends you a helpful onboarding guide. You can always chat with it for tips.',
            color: '#7c3aed',
          },
          {
            emoji: '❓',
            title: 'Need Help Anytime?',
            desc: 'Click the floating "?" button at the bottom-right of the screen anytime to re-open this guide. You are all set — enjoy Nira Chat! 🎉',
            color: '#4f46e5',
          },
        ];
        const step = steps[onboardingStep];
        const isLast = onboardingStep === steps.length - 1;
        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(2, 6, 23, 0.7)',
              backdropFilter: 'blur(6px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '28px',
                padding: '40px 36px 32px',
                maxWidth: '480px',
                width: '100%',
                boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
                position: 'relative',
                animation: 'fadeSlideIn 0.3s ease',
              }}
            >
              {/* Step progress dots */}
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '28px' }}>
                {steps.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: i === onboardingStep ? '24px' : '8px',
                      height: '8px',
                      borderRadius: '6px',
                      background: i === onboardingStep ? step.color : '#e2e8f0',
                      transition: 'all 0.3s ease',
                    }}
                  />
                ))}
              </div>

              {/* Emoji icon */}
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '24px',
                  background: `${step.color}18`,
                  border: `2px solid ${step.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.4rem',
                  margin: '0 auto 20px',
                }}
              >
                {step.emoji}
              </div>

              {/* Step counter pill */}
              <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                <span
                  style={{
                    background: `${step.color}15`,
                    color: step.color,
                    padding: '4px 14px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    letterSpacing: '0.5px',
                  }}
                >
                  Step {onboardingStep + 1} of {steps.length}
                </span>
              </div>

              {/* Title */}
              <h2
                style={{
                  textAlign: 'center',
                  fontSize: '1.5rem',
                  fontWeight: '900',
                  color: '#0f172a',
                  marginBottom: '14px',
                  lineHeight: 1.2,
                }}
              >
                {step.title}
              </h2>

              {/* Description */}
              <p
                style={{
                  textAlign: 'center',
                  color: '#475569',
                  fontSize: '0.97rem',
                  lineHeight: 1.65,
                  fontWeight: '600',
                  marginBottom: '32px',
                }}
              >
                {step.desc}
              </p>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                {onboardingStep > 0 && (
                  <button
                    type="button"
                    onClick={() => setOnboardingStep((s) => s - 1)}
                    style={{
                      flex: 1,
                      padding: '13px',
                      borderRadius: '14px',
                      border: '1.5px solid #e2e8f0',
                      background: '#f8fafc',
                      color: '#475569',
                      fontWeight: '800',
                      fontSize: '0.92rem',
                      cursor: 'pointer',
                    }}
                  >
                    ← Back
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (isLast) { closeOnboarding(); }
                    else { setOnboardingStep((s) => s + 1); }
                  }}
                  style={{
                    flex: 2,
                    padding: '13px',
                    borderRadius: '14px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${step.color} 0%, ${step.color}cc 100%)`,
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: `0 6px 20px ${step.color}40`,
                  }}
                >
                  {isLast ? '🎉 Got it, Let me Explore!' : 'Next →'}
                </button>
              </div>

              {/* Skip link */}
              {!isLast && (
                <button
                  type="button"
                  onClick={closeOnboarding}
                  style={{
                    display: 'block',
                    margin: '18px auto 0',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.84rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Skip guide
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ====== FLOATING ? HELP BUTTON (Hidden inside active chat message area to avoid overlapping Send button) ====== */}
      {(!selectedUser || showSettingsPanel) && (
        <button
          type="button"
          onClick={() => { setShowOnboarding(true); setOnboardingStep(0); }}
          title="Help & Guide"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            color: '#ffffff',
            border: 'none',
            fontSize: '1.35rem',
            fontWeight: '900',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(79,70,229,0.45)',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.12)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          ?
        </button>
      )}
    </div>
  );
}
