import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { LoginArea } from '@/components/auth/LoginArea';
import { PenTool, Send } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface NoteComposerProps {
  onSuccess?: (event?: any) => void;
  placeholder?: string;
  className?: string;
}

export function NoteComposer({
  onSuccess, 
  placeholder = "What's on your mind?",
  className
}: NoteComposerProps) {
  const [content, setContent] = useState('');
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() || !user) return;

    const noteContent = content.trim();
    const eventData = { 
      kind: 1, 
      content: noteContent,
      tags: [] // Kind 1 notes typically don't need special tags
    };

    createEvent(
      eventData,
      {
        onSuccess: (publishedEvent) => {
          setContent('');
          toast({
            title: "Note published!",
            description: "Your note has been published to the network.",
          });
          // Immediately call success with the event data for optimistic updates
          onSuccess?.({
            ...eventData,
            content: noteContent,
            ...publishedEvent
          });
        },
        onError: () => {
          toast({
            title: "Failed to publish note",
            description: "Please try again.",
            variant: "destructive",
          });
        }
      }
    );
  };

  if (!user) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <PenTool className="h-5 w-5" />
              <span>Sign in to create a note</span>
            </div>
            <LoginArea />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center space-x-2">
          <PenTool className="h-5 w-5" />
          <span>Create a Note</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            className="min-h-[120px] resize-none"
            disabled={isPending}
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Share your thoughts with the community
            </span>
            <Button 
              type="submit" 
              disabled={!content.trim() || isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              {isPending ? 'Publishing...' : 'Publish Note'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}