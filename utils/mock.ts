import type { MessageItem } from '../types/message'

export const MessageMockList: MessageItem[] = [
  {
    id: 1,
    content: 'Hello, this is a sample message.',
    author: {
      id: 1,
      name: 'Alice',
      site: 'https://alice-blog.com',
      avatar: 'https://dummyimage.com/400x400',
    },
    publishedAt: '2024-11-01 10:30',
    editedAt: '2024-11-01 10:45',
    isMe: false,
  },
  {
    id: 2,
    content: 'Hi Alice! Great to hear from you.',
    author: {
      id: 2,
      name: 'Bob',
      site: 'https://bob-portfolio.com',
      avatar: 'https://dummyimage.com/400x400',
    },
    publishedAt: '2024-11-01 11:00',
    editedAt: '2024-11-01 11:05',
    isMe: true,
    replyTo: {
      id: 1,
      content: 'Hello, this is a sample message.',
    },
  },
  {
    id: 3,
    content: `
      Just checking in to see if 
      you’re still available for the 
      meeting tomorrow?
    `,
    author: {
      id: 3,
      name: 'Charlie',
      site: 'https://charlie.dev',
      avatar: 'https://dummyimage.com/400x400',
    },
    publishedAt: '2024-11-02 08:15',
    editedAt: '2024-11-02 08:20',
    isMe: false,
  },
  {
    id: 4,
    content: 'Yes, I’ll be there. Looking forward to it!',
    author: {
      id: 2,
      name: 'Bob',
      site: 'https://bob-portfolio.com',
      avatar: 'https://dummyimage.com/400x400',
    },
    publishedAt: '2024-11-02 08:30',
    editedAt: '2024-11-02 08:35',
    isMe: true,
    replyTo: {
      id: 3,
      content: 'Just checking in to see if you’re still available for the meeting tomorrow?',
    },
  },
]
