import { useMutation } from "@tanstack/react-query";
import { BlossomUploader } from '@nostrify/nostrify/uploaders';

import { useCurrentUser } from "./useCurrentUser";
import { useBlossomServers } from "./useBlossomServers";

export function useUploadFile() {
  const { user } = useCurrentUser();
  const { allServers } = useBlossomServers();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) {
        throw new Error('Must be logged in to upload files');
      }

      console.log('Starting file upload:', file.name, file.size, file.type);

      console.log('Using Blossom servers:', allServers);

      const uploader = new BlossomUploader({
        servers: allServers,
        signer: user.signer,
      });

      try {
        const tags = await uploader.upload(file);
        console.log('Upload successful, tags:', tags);
        return tags;
      } catch (error) {
        console.error('Upload failed:', error);
        throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  });
}