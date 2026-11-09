import { Firestore } from '@google-cloud/firestore';

// Initialize Cloud Firestore on takeaway-platform-prod
export const db = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'takeaway-platform-prod',
  databaseId: '(default)',
});
