import { ConversationsIdView } from '@/modules/dashboard/ui/views/conversation-id-view';
import { Id } from '@workspace/backend/_generated/dataModel';
import React from 'react'

const Page = async ({params}: {params: Promise<{conversationId: string}>}) => {
    const { conversationId } = await params;
  return <ConversationsIdView conversationId={conversationId as Id<"conversations">} />
};


export default Page;