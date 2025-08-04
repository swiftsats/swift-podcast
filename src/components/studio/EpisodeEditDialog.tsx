import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Upload, Save, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useUpdateEpisode } from '@/hooks/usePublishEpisode';
import { useToast } from '@/hooks/useToast';
import type { PodcastEpisode, EpisodeFormData } from '@/types/podcast';

// Schema for episode editing (similar to publish but allows empty audio URLs for existing episodes)
const episodeEditSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  content: z.string().optional(),
  audioUrl: z.string().url().optional().or(z.literal('')),
  imageUrl: z.string().url().optional().or(z.literal('')),
  duration: z.number().positive().optional(),
  episodeNumber: z.number().positive().optional(),
  seasonNumber: z.number().positive().optional(),
  explicit: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

type EpisodeEditFormValues = z.infer<typeof episodeEditSchema>;

interface EpisodeEditDialogProps {
  episode: PodcastEpisode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EpisodeEditDialog({
  episode,
  open,
  onOpenChange,
  onSuccess
}: EpisodeEditDialogProps) {
  const { toast } = useToast();
  const { mutateAsync: updateEpisode, isPending } = useUpdateEpisode();

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentTag, setCurrentTag] = useState('');

  const form = useForm<EpisodeEditFormValues>({
    resolver: zodResolver(episodeEditSchema),
    defaultValues: {
      title: episode.title,
      description: episode.description || '',
      content: episode.content || '',
      audioUrl: episode.audioUrl || '',
      imageUrl: episode.imageUrl || '',
      duration: episode.duration,
      episodeNumber: episode.episodeNumber,
      seasonNumber: episode.seasonNumber,
      explicit: episode.explicit || false,
      tags: episode.tags || [],
    },
  });

  const { watch, setValue, reset } = form;
  const tags = watch('tags');

  // Reset form when episode changes
  useEffect(() => {
    reset({
      title: episode.title,
      description: episode.description || '',
      content: episode.content || '',
      audioUrl: episode.audioUrl || '',
      imageUrl: episode.imageUrl || '',
      duration: episode.duration,
      episodeNumber: episode.episodeNumber,
      seasonNumber: episode.seasonNumber,
      explicit: episode.explicit || false,
      tags: episode.tags || [],
    });
    setAudioFile(null);
    setImageFile(null);
    setCurrentTag('');
  }, [episode, reset]);

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      toast({
        title: 'Audio file selected',
        description: `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
      });
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

  const onSubmit = async (data: EpisodeEditFormValues) => {
    try {
      const episodeData: EpisodeFormData = {
        ...data,
        description: data.description || '',
        audioFile: audioFile || undefined,
        imageFile: imageFile || undefined,
        // Clean up empty URL strings
        audioUrl: data.audioUrl || undefined,
        imageUrl: data.imageUrl || undefined,
        // Keep existing external references
        externalRefs: episode.externalRefs,
      };

      await updateEpisode({
        episodeId: episode.eventId,
        episodeData
      });

      toast({
        title: 'Episode updated!',
        description: 'Your episode has been updated successfully.',
      });

      onSuccess();
      onOpenChange(false);

    } catch (error) {
      toast({
        title: 'Failed to update episode',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Episode</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)] pr-6">
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
                <Label>Audio File</Label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Replace Audio File</Label>
                    <div className="mt-1">
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleAudioFileChange}
                        className="hidden"
                        id="audio-upload-edit"
                      />
                      <label htmlFor="audio-upload-edit">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400">
                          <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-500">
                            {audioFile ? (
                              <span className="text-green-600 font-medium">
                                ✓ {audioFile.name}
                              </span>
                            ) : (
                              'Click to replace audio file'
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
                            Or Update Audio URL
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

                {/* Current audio info */}
                {!audioFile && episode.audioUrl && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    <strong>Current:</strong> {episode.audioUrl}
                  </div>
                )}
              </div>

              {/* Image Upload/URL */}
              <div className="space-y-4">
                <Label>Episode Artwork</Label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Replace Image</Label>
                    <div className="mt-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                        id="image-upload-edit"
                      />
                      <label htmlFor="image-upload-edit">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400">
                          <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-500">
                            {imageFile ? (
                              <span className="text-green-600 font-medium">
                                ✓ {imageFile.name}
                              </span>
                            ) : (
                              'Click to replace image'
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
                            Or Update Image URL
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

                {/* Current image preview */}
                {!imageFile && episode.imageUrl && (
                  <div className="flex items-center space-x-2">
                    <img
                      src={episode.imageUrl}
                      alt="Current artwork"
                      className="w-16 h-16 rounded object-cover"
                    />
                    <div className="text-xs text-muted-foreground">
                      <strong>Current artwork</strong>
                    </div>
                  </div>
                )}
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
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
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
                    Add
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
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Update Episode
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}