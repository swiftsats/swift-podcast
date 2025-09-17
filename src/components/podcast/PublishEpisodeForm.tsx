import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePublishEpisode } from '@/hooks/usePublishEpisode';
import { useToast } from '@/hooks/useToast';
import { isPodcastCreator } from '@/lib/podcastConfig';
import { getAudioDuration, formatDurationHuman } from '@/lib/audioDuration';
import type { EpisodeFormData } from '@/types/podcast';

const episodeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long'),
  content: z.string().optional(),
  audioUrl: z.string().url().optional().or(z.literal('')),
  imageUrl: z.string().url().optional().or(z.literal('')),
  duration: z.number().positive().optional(),
  episodeNumber: z.number().positive().optional(),
  seasonNumber: z.number().positive().optional(),
  explicit: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

type EpisodeFormValues = z.infer<typeof episodeSchema>;

interface PublishEpisodeFormProps {
  onSuccess?: (episodeId: string) => void;
  onCancel?: () => void;
  className?: string;
}

export function PublishEpisodeForm({ 
  onSuccess, 
  onCancel, 
  className 
}: PublishEpisodeFormProps) {
  const { user } = useCurrentUser();
  const { mutateAsync: publishEpisode, isPending } = usePublishEpisode();
  const { toast } = useToast();
  
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentTag, setCurrentTag] = useState('');
  const [isDetectingDuration, setIsDetectingDuration] = useState(false);

  const form = useForm<EpisodeFormValues>({
    resolver: zodResolver(episodeSchema),
    defaultValues: {
      title: '',
      description: '',
      content: '',
      audioUrl: '',
      imageUrl: '',
      explicit: false,
      tags: [],
    },
  });

  const { watch, setValue } = form;
  const tags = watch('tags');

  // Check if user is the creator
  if (!user || !isPodcastCreator(user.pubkey)) {
    return (
      <Card className={className}>
        <CardContent className="py-12 px-8 text-center">
          <p className="text-muted-foreground">
            Only the podcast creator can publish episodes.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('audio/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an audio file.',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Audio file must be less than 100MB.',
          variant: 'destructive',
        });
        return;
      }

      setAudioFile(file);
      setValue('audioUrl', '');

      // Detect audio duration
      setIsDetectingDuration(true);
      try {
        const duration = await getAudioDuration(file);
        setValue('duration', duration);

        toast({
          title: 'Audio file selected',
          description: `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB, ${formatDurationHuman(duration)})`,
        });
      } catch {
        toast({
          title: 'Audio file selected',
          description: `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB) - Could not detect duration. You can enter it manually.`,
          variant: 'default',
        });
      } finally {
        setIsDetectingDuration(false);
      }
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file.',
          variant: 'destructive',
        });
        return;
      }
      
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Image file must be less than 10MB.',
          variant: 'destructive',
        });
        return;
      }
      
      setImageFile(file);
      setValue('imageUrl', '');
      
      toast({
        title: 'Image file selected',
        description: `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
      });
    }
  };

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setValue('tags', [...tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setValue('tags', tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const onSubmit = async (data: EpisodeFormValues) => {
    try {
      console.log('Form submission data:', data);
      console.log('Audio file:', audioFile);
      console.log('Image file:', imageFile);
      
      // Validate that we have either audio file or URL
      if (!audioFile && !data.audioUrl) {
        toast({
          title: 'Audio required',
          description: 'Please provide either an audio file or audio URL.',
          variant: 'destructive',
        });
        return;
      }
      
      const episodeData: EpisodeFormData = {
        ...data,
        audioFile: audioFile || undefined,
        imageFile: imageFile || undefined,
        // Clean up empty URL strings
        audioUrl: data.audioUrl || undefined,
        imageUrl: data.imageUrl || undefined,
      };

      console.log('Publishing episode data:', episodeData);
      const episodeId = await publishEpisode(episodeData);
      
      toast({
        title: 'Episode published!',
        description: 'Your podcast episode has been published successfully.',
      });

      onSuccess?.(episodeId);
      
      // Reset form
      form.reset();
      setAudioFile(null);
      setImageFile(null);
      setCurrentTag('');
      
    } catch (error) {
      toast({
        title: 'Failed to publish episode',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Publish New Episode</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Episode Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter episode title..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of the episode..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Content/Show Notes */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Show Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detailed show notes, timestamps, links..."
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Audio Upload/URL */}
            <div className="space-y-4">
              <Label>Audio File *</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Upload Audio File</Label>
                  <div className="mt-1">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioFileChange}
                      className="hidden"
                      id="audio-upload"
                    />
                    <label htmlFor="audio-upload">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400">
                        <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-500">
                          {audioFile ? (
                            <span className="text-green-600 font-medium">
                              ✓ {audioFile.name}
                            </span>
                          ) : (
                            'Click to upload audio file'
                          )}
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <FormField
                    control={form.control}
                    name="audioUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-muted-foreground">
                          Or Enter Audio URL
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://example.com/audio.mp3"
                            disabled={!!audioFile}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Image Upload/URL */}
            <div className="space-y-4">
              <Label>Episode Artwork (Optional)</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Upload Image</Label>
                  <div className="mt-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400">
                        <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-500">
                          {imageFile ? (
                            <span className="text-green-600 font-medium">
                              ✓ {imageFile.name}
                            </span>
                          ) : (
                            'Click to upload image'
                          )}
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-muted-foreground">
                          Or Enter Image URL
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://example.com/artwork.jpg"
                            disabled={!!imageFile}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Episode Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="episodeNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Episode Number</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="seasonNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Season Number</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (seconds)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="3600"
                        disabled={isDetectingDuration}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    {isDetectingDuration && (
                      <p className="text-sm text-muted-foreground">Detecting duration...</p>
                    )}
                    {field.value && (
                      <p className="text-sm text-muted-foreground">
                        Duration: {formatDurationHuman(field.value)}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tags */}
            <div className="space-y-3">
              <Label>Tags</Label>
              <div className="flex space-x-2">
                <Input
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a tag..."
                  className="flex-1"
                />
                <Button type="button" onClick={addTag} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Explicit Content */}
            <FormField
              control={form.control}
              name="explicit"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Explicit Content</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Mark if this episode contains explicit content
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex justify-end space-x-3">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Publishing...' : 'Publish Episode'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}