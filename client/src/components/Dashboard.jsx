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
} from 'lucide-react';
import { io } from 'socket.io-client';
import { fetchAllUsers, fetchConversation, postChatMessage, markMessagesAsRead, uploadFile } from '../services/api';

export default function Dashboard({ user, onLogout }) {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [lastMessages, setLastMessages] = useState({});
  const [newMessageText, setNewMessageText] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  // Sidebar & Settings Panel States
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // File upload states
  const [selectedFile, setSelectedFile] = useState(null);       // { file, previewUrl, name, type, size }
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const messagesContainerRef = useRef(null);
  const isUserAtBottomRef = useRef(true);
  const messageInputRef = useRef(null);

  // Refs for tracking current state inside socket callbacks
  const selectedUserRef = useRef(selectedUser);
  const socketRef = useRef(socket);

  const currentUserId = user?._id || user?.id || '';
  const currentUserName = user?.name || 'User';
  const currentUserHandle = (user?.username || 'user').toLowerCase();
  const currentUserEmail = user?.email || 'Not provided';
  const currentUserGender = user?.gender === 'M' ? 'Male' : user?.gender === 'F' ? 'Female' : 'Other';

  const formatLastMessagePreview = (msg) => {
    if (!msg) return 'No messages yet';
    if (msg.text) return msg.text;
    if (msg.fileUrl) {
      if (msg.fileType === 'image') return '📷 Image';
      if (msg.fileType === 'video') return '🎥 Video';
      if (msg.fileType === 'audio') return '🎵 Audio';
      return `📎 ${msg.fileName || 'File'}`;
    }
    return 'No messages yet';
  };
  const currentUserAge = user?.age || 'N/A';
  const currentUserMobile = user?.mobile || 'N/A';

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

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

    const newSocket = io('http://localhost:5000');
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

    newSocket.on('get_online_users', (onlineIds) => {
      setOnlineUsers(onlineIds || []);
    });

    newSocket.on('receive_message', (incomingMsg) => {
      const otherUser = incomingMsg.sender === currentUserId ? incomingMsg.receiver : incomingMsg.sender;

      if (otherUser) {
        setLastMessages((prev) => ({
          ...prev,
          [otherUser]: formatLastMessagePreview(incomingMsg),
        }));
      }

      const selUser = selectedUserRef.current;
      if (
        selUser &&
        ((incomingMsg.sender === selUser._id && incomingMsg.receiver === currentUserId) ||
          (incomingMsg.sender === currentUserId && incomingMsg.receiver === selUser._id))
      ) {
        setMessages((prevMsgs) => upsertMessage(prevMsgs, incomingMsg));

        if (incomingMsg.sender === selUser._id && newSocket) {
          newSocket.emit('mark_read_instant', {
            readerId: currentUserId,
            senderId: selUser._id,
          });
        }

        if (isUserAtBottomRef.current) {
          setTimeout(scrollToBottomInstant, 50);
        }
      }
    });

    newSocket.on('message_sent', (confirmedMsg) => {
      const otherUser = confirmedMsg.sender === currentUserId ? confirmedMsg.receiver : confirmedMsg.sender;

      if (otherUser) {
        setLastMessages((prev) => ({
          ...prev,
          [otherUser]: formatLastMessagePreview(confirmedMsg),
        }));
      }

      const selUser = selectedUserRef.current;
      if (
        selUser &&
        ((confirmedMsg.sender === currentUserId && confirmedMsg.receiver === selUser._id) ||
          (confirmedMsg.sender === selUser._id && confirmedMsg.receiver === selUser._id))
      ) {
        setMessages((prevMsgs) => upsertMessage(prevMsgs, confirmedMsg));

        if (isUserAtBottomRef.current) {
          setTimeout(scrollToBottomInstant, 50);
        }
      }
    });

    newSocket.on('messages_read', ({ readerId }) => {
      const selUser = selectedUserRef.current;
      if (selUser && selUser._id === readerId) {
        setMessages((prevMsgs) =>
          prevMsgs.map((m) => (m.sender === currentUserId ? { ...m, isRead: true } : m))
        );
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [currentUserId]);

  // Load / Search Users list
  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      const list = await fetchAllUsers(searchQuery.toLowerCase());
      const filtered = list.filter((u) => u._id !== currentUserId);
      setUsersList(filtered);
      setLoadingUsers(false);
    };

    const timer = setTimeout(loadUsers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, currentUserId]);

  // Fetch last message previews for all users in directory
  useEffect(() => {
    if (!usersList.length || !currentUserId) return;

    usersList.forEach(async (u) => {
      if (!u._id) return;
      const history = await fetchConversation(currentUserId, u._id);
      if (history && history.length > 0) {
        const lastMsg = history[history.length - 1];
        setLastMessages((prev) => ({
          ...prev,
          [u._id]: formatLastMessagePreview(lastMsg),
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
    }
  }, [messages, selectedUser, currentUserId, socket]);

  // Fetch Conversation History & Switch User
  useEffect(() => {
    if (!selectedUser || !currentUserId) return;

    setShowSettingsPanel(false);

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

      if (history && history.length > 0) {
        const lastMsg = history[history.length - 1];
        setLastMessages((prev) => ({
          ...prev,
          [selectedUser._id]: formatLastMessagePreview(lastMsg),
        }));
      }

      if (isInitialLoad) {
        isUserAtBottomRef.current = true;
        setTimeout(scrollToBottomInstant, 30);
        // Auto-focus message input when user is selected
        setTimeout(() => {
          if (messageInputRef.current) messageInputRef.current.focus();
        }, 100);
      }
    };

    setLoadingChat(true);
    loadChat(true).then(() => setLoadingChat(false));

    const syncInterval = setInterval(() => {
      loadChat(false);
    }, 2500);

    return () => {
      clearInterval(syncInterval);
      if (socketRef.current) {
        socketRef.current.emit('active_chat_changed', {
          userId: currentUserId,
          partnerId: null,
        });
      }
    };
  }, [selectedUser, currentUserId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() && !selectedFile) return;
    if (!selectedUser || !currentUserId) return;

    const textToSend = newMessageText.trim();
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
    setMessages((prev) => [...prev, msgData]);
    setLastMessages((prev) => ({
      ...prev,
      [selectedUser._id]: formatLastMessagePreview(msgData),
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
          prevMsgs.map((m) => (m._id === msgData._id ? { ...res, ...(fileData || {}) } : m))
        );
        // Refresh last message preview with saved database message
        setLastMessages((prev) => ({
          ...prev,
          [selectedUser._id]: formatLastMessagePreview(res),
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
        gridTemplateColumns: sidebarCollapsed ? '76px 1fr' : '320px 1fr',
        overflow: 'hidden',
        position: 'relative',
        transition: 'grid-template-columns 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* LEFT SIDEBAR: Search Users & User Directory */}
      <div
        style={{
          background: '#f8fafc',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
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

          {/* Top Toggle Sidebar Button */}
          <button

            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            style={{
              border: 'none',
              background: '#f1f5f9',
              color: '#4f46e5',
              padding: sidebarCollapsed ? '10px' : '9px',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={22} /> : <PanelLeftClose size={20} />}
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

        {/* Users Directory List (LARGER FONT SIZE FOR CONTACT NAMES) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: sidebarCollapsed ? '12px 6px' : '6px 14px 14px 14px' }}>
          {loadingUsers ? (
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
                    {searchQuery ? `No matching account for "${searchQuery}"` : 'No other registered users in DB yet.'}
                  </p>
                </>
              )}
            </div>
          ) : (
            usersList.map((u) => {
              const active = selectedUser && selectedUser._id === u._id && !showSettingsPanel;
              const online = isUserOnline(u._id);
              const lastMsgPreview = lastMessages[u._id] || 'No messages yet';

              return (
                <div
                  key={u._id}
                  onClick={() => setSelectedUser(u)}
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
                          background: '#0f172a',
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
                        {/* LARGER FONT SIZE FOR CONTACT NAME */}
                        <h4 className="font-extrabold" style={{ fontSize: '1.08rem', color: '#0f172a', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {u.name}
                        </h4>
                        <p
                          style={{
                            fontSize: '0.85rem',
                            color: '#64748b',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginTop: '3px',
                          }}
                        >
                          {lastMsgPreview}
                        </p>
                      </div>
                    )}
                  </div>

                  {!sidebarCollapsed && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: '800',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        background: online ? '#ecfdf5' : '#f1f5f9',
                        color: online ? '#047857' : '#94a3b8',
                        border: `1px solid ${online ? '#a7f3d0' : '#e2e8f0'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        flexShrink: 0,
                        marginLeft: '8px',
                      }}
                    >
                      <Circle size={6} fill={online ? '#10b981' : '#94a3b8'} color="none" />
                      {online ? 'Online' : 'Offline'}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* BOTTOM SETTINGS & LOGOUT AREA */}
        <div
          style={{
            padding: sidebarCollapsed ? '10px 6px' : '10px 12px',
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'space-between',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => {
              setShowSettingsPanel((prev) => !prev);
            }}
            title="User Profile & Settings"
            style={{
              border: 'none',
              background: showSettingsPanel ? '#4f46e5' : '#f1f5f9',
              color: showSettingsPanel ? '#ffffff' : '#0f172a',
              padding: sidebarCollapsed ? '9px' : '9px 12px',
              borderRadius: '10px',
              fontWeight: '800',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              flex: sidebarCollapsed ? 'none' : 1,
              transition: 'all 0.2s ease',
            }}
          >
            <Settings size={16} style={{ color: showSettingsPanel ? '#ffffff' : '#4f46e5' }} />
            {!sidebarCollapsed && 'Settings'}
          </button>

          {!sidebarCollapsed && (
            <button
              onClick={onLogout}
              title="Sign Out"
              style={{
                border: 'none',
                background: '#fef2f2',
                color: '#ef4444',
                padding: '9px 12px',
                borderRadius: '10px',
                fontWeight: '800',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <LogOut size={16} /> Logout
            </button>
          )}
        </div>
      </div>

      {/* RIGHT MAIN AREA (FULL PAGE CHAT OR SETTINGS DASHBOARD) */}
      <div style={{ display: 'flex', flexDirection: 'column', background: '#ffffff', height: '100%', minHeight: 0, overflow: 'hidden' }}>
        {showSettingsPanel ? (
          /* SETTINGS DASHBOARD OPENED DIRECTLY IN RIGHT PANEL */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              background: '#f8fafc',
              overflowY: 'auto',
              padding: '36px 60px 36px 44px',
            }}
          >
            {/* Clean Settings Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: 'rgba(79, 70, 229, 0.1)',
                  color: '#4f46e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Settings size={24} />
              </div>
              <div>
                <h2 className="font-extrabold" style={{ fontSize: '1.6rem', color: '#0f172a' }}>
                  Account Profile & Settings
                </h2>
                <p style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>
                  Manage your personal account details & handle
                </p>
              </div>
            </div>

            {/* Main Profile Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, #020617 0%, #1e1b4b 100%)',
                borderRadius: '24px',
                padding: '32px',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '28px',
                boxShadow: '0 12px 30px rgba(15, 23, 42, 0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
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
                  }}
                >
                  {currentUserName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold" style={{ fontSize: '1.6rem', marginBottom: '4px' }}>
                    {currentUserName}
                  </h3>
                  <p style={{ fontSize: '1rem', color: '#a5b4fc', fontWeight: '800' }}>
                    @{currentUserHandle}
                  </p>
                </div>
              </div>

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

            {/* Profile Grid Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ background: '#ffffff', padding: '24px', borderRadius: '20px', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={18} style={{ color: '#4f46e5' }} /> Email Address
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                  {currentUserEmail}
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: '24px', borderRadius: '20px', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={18} style={{ color: '#4f46e5' }} /> Gender
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                  {currentUserGender}
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: '24px', borderRadius: '20px', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} style={{ color: '#4f46e5' }} /> Age
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                  {currentUserAge} years old
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: '24px', borderRadius: '20px', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={18} style={{ color: '#4f46e5' }} /> Mobile Number
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                  {currentUserMobile}
                </div>
              </div>
            </div>
          </div>
        ) : selectedUser ? (
          <>
            {/* Active Conversation Header - LARGER FONT SIZE FOR CONTACT NAME */}
            <div
              style={{
                padding: '18px 28px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#ffffff',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #020617 0%, #1e1b4b 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '900',
                      fontSize: '1.3rem',
                    }}
                  >
                    {(selectedUser.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className={isUserOnline(selectedUser._id) ? 'online-pulse' : 'offline-pulse'}></span>
                </div>

                <div>
                  {/* LARGER ACTIVE CONTACT NAME */}
                  <h3 className="font-extrabold" style={{ fontSize: '1.35rem', color: '#0f172a', lineHeight: 1.2 }}>
                    {selectedUser.name}
                  </h3>
                  <p style={{ fontSize: '0.92rem', color: '#4f46e5', fontWeight: '800', marginTop: '2px' }}>
                    @{(selectedUser.username || selectedUser.email?.split('@')[0] || 'user').toLowerCase()}
                  </p>
                </div>
              </div>

              {/* Online / Offline Status Badge */}
              <div
                style={{
                  padding: '7px 16px',
                  borderRadius: '20px',
                  background: isUserOnline(selectedUser._id) ? '#ecfdf5' : '#f8fafc',
                  border: `1.5px solid ${isUserOnline(selectedUser._id) ? '#a7f3d0' : '#e2e8f0'}`,
                  color: isUserOnline(selectedUser._id) ? '#047857' : '#64748b',
                  fontSize: '0.85rem',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Circle size={8} fill={isUserOnline(selectedUser._id) ? '#10b981' : '#cbd5e1'} color="none" />
                {isUserOnline(selectedUser._id) ? '🟢 Online Now' : '⚪ Offline'}
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
                padding: '28px 32px',
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
                      style={{
                        alignSelf: isMine ? 'flex-end' : 'flex-start',
                        maxWidth: '65%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMine ? 'flex-end' : 'flex-start',
                      }}
                    >
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
                          <img
                            src={msg.fileUrl}
                            alt={msg.fileName}
                            style={{ width: '100%', maxWidth: '280px', borderRadius: '14px', display: 'block', cursor: 'pointer' }}
                            onClick={() => window.open(msg.fileUrl, '_blank')}
                          />
                        )}
                        {msg.fileUrl && msg.fileType === 'video' && (
                          <video controls style={{ width: '100%', maxWidth: '280px', borderRadius: '14px' }}>
                            <source src={msg.fileUrl} />
                          </video>
                        )}
                        {msg.fileUrl && msg.fileType === 'audio' && (
                          <audio controls style={{ width: '100%', maxWidth: '260px', marginBottom: msg.text ? '8px' : 0 }}>
                            <source src={msg.fileUrl} />
                          </audio>
                        )}
                        {msg.fileUrl && msg.fileType === 'document' && (
                          <a
                            href={msg.fileUrl}
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

                      {/* Real Read Receipt */}
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

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                onChange={(e) => handleFileSelect(e.target.files[0])}
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
                  padding: '16px 28px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                {/* + button to browse files */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  title="Attach file"
                  style={{
                    width: '44px', height: '44px', borderRadius: '12px', border: '2px solid #e2e8f0',
                    background: '#f8fafc', color: '#4f46e5', fontSize: '1.5rem', fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0, transition: 'all 0.18s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.borderColor = '#4f46e5'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >+</button>

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
          /* Empty Chat State */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              textAlign: 'center',
              background: '#f8fafc',
            }}
          >
            <div
              style={{
                width: '88px',
                height: '88px',
                borderRadius: '50%',
                background: 'rgba(79, 70, 229, 0.1)',
                color: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
              }}
            >
              <MessageSquare size={44} />
            </div>

            <h3 className="font-extrabold" style={{ fontSize: '1.65rem', color: '#0f172a', marginBottom: '10px' }}>
              Nira Chat Real-Time Messaging
            </h3>
            <p style={{ color: '#64748b', fontWeight: '600', maxWidth: '450px', fontSize: '0.95rem', marginBottom: '28px' }}>
              Search any user by their <span style={{ color: '#4f46e5', fontWeight: '800' }}>@username</span> in the search bar on the left to start a real-time message conversation!
            </p>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '18px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              }}
            >
              <AtSign size={22} style={{ color: '#4f46e5' }} />
              <span style={{ fontWeight: '800', fontSize: '0.98rem', color: '#0f172a' }}>
                Your handle: <strong style={{ color: '#4f46e5' }}>@{currentUserHandle}</strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
