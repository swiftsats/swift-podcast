import { useState, useMemo, useEffect, useCallback } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';
import { useNWC } from '@/hooks/useNWCContext';
import type { NWCConnection } from '@/hooks/useNWC';
import { nip57 } from 'nostr-tools';
import type { Event } from 'nostr-tools';
import type { WebLNProvider } from 'webln';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';
import { extractZapAmount, validateZapEvent } from '@/lib/zapUtils';

export function useZaps(
  target: Event | Event[],
  webln: WebLNProvider | null,
  _nwcConnection: NWCConnection | null,
  onZapSuccess?: (amount?: number) => void
) {
  const { nostr } = useNostr();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const queryClient = useQueryClient();

  // Handle the case where an empty array is passed (from ZapButton when external data is provided)
  const actualTarget = Array.isArray(target) ? (target.length > 0 ? target[0] : null) : target;

  const author = useAuthor(actualTarget?.pubkey);
  const { sendPayment, getActiveConnection } = useNWC();
  const [isZapping, setIsZapping] = useState(false);
  const [invoice, setInvoice] = useState<string | null>(null);

  // Cleanup state when component unmounts
  useEffect(() => {
    return () => {
      setIsZapping(false);
      setInvoice(null);
    };
  }, []);

  const { data: zapEvents, ...query } = useQuery<NostrEvent[], Error>({
    queryKey: ['zaps', actualTarget?.id],
    staleTime: 30000, // 30 seconds
    refetchInterval: (query) => {
      // Only refetch if the query is currently being observed (component is mounted)
      return query.getObserversCount() > 0 ? 60000 : false;
    },
    queryFn: async (c) => {
      if (!actualTarget) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      // Query for zap receipts for this specific event
      if (actualTarget.kind >= 30000 && actualTarget.kind < 40000) {
        // Addressable event
        const identifier = actualTarget.tags.find((t) => t[0] === 'd')?.[1] || '';
        const events = await nostr.query([{
          kinds: [9735],
          '#a': [`${actualTarget.kind}:${actualTarget.pubkey}:${identifier}`],
        }], { signal });
        return events;
      } else {
        // Regular event
        const events = await nostr.query([{
          kinds: [9735],
          '#e': [actualTarget.id],
        }], { signal });
        return events;
      }
    },
    enabled: !!actualTarget?.id,
  });

  // Process zap events into simple counts and totals
  const { zapCount, totalSats, zaps } = useMemo(() => {
    if (!zapEvents || !Array.isArray(zapEvents) || !actualTarget) {
      return { zapCount: 0, totalSats: 0, zaps: [] };
    }

    // Filter valid zap events and extract amounts
    const validZaps = zapEvents.filter(validateZapEvent);
    
    let count = 0;
    let sats = 0;

    validZaps.forEach(zap => {
      count++;
      
      // Use our consistent zap amount extraction utility
      const amount = extractZapAmount(zap);
      sats += amount;
    });

    return { zapCount: count, totalSats: sats, zaps: validZaps };
  }, [zapEvents, actualTarget]);

  const zap = async (amount: number, _comment: string) => {
    if (amount <= 0) {
      return;
    }

    setIsZapping(true);
    setInvoice(null); // Clear any previous invoice at the start

    if (!user) {
      toast({
        title: 'Login required',
        description: 'You must be logged in to send a zap.',
        variant: 'destructive',
      });
      setIsZapping(false);
      return;
    }

    if (!actualTarget) {
      toast({
        title: 'Event not found',
        description: 'Could not find the event to zap.',
        variant: 'destructive',
      });
      setIsZapping(false);
      return;
    }

    console.log('Zap attempt:', {
      targetId: actualTarget.id,
      targetPubkey: actualTarget.pubkey,
      targetKind: actualTarget.kind,
      amount,
      authorData: author.data ? 'available' : 'not available',
      actualTarget: actualTarget
    });

    try {
      if (!author.data || !author.data?.metadata) {
        toast({
          title: 'Author not found',
          description: 'Could not find the author of this item.',
          variant: 'destructive',
        });
        setIsZapping(false);
        return;
      }

      const { lud06, lud16 } = author.data.metadata;
      if (!lud06 && !lud16) {
        toast({
          title: 'Lightning address not found',
          description: 'The author does not have a lightning address configured.',
          variant: 'destructive',
        });
        setIsZapping(false);
        return;
      }

      // Get zap endpoint - handle case where event might not be available yet
      let zapEndpoint;
      try {
        if (author.data.event) {
          zapEndpoint = await nip57.getZapEndpoint(author.data.event);
        } else {
          // Fallback: try to get zap endpoint from lightning address directly
          const lnAddress = lud16 || lud06;
          if (!lnAddress) {
            throw new Error('No lightning address available');
          }

          // Extract domain from lightning address
          const [username, domain] = lnAddress.split('@');
          if (!username || !domain) {
            throw new Error('Invalid lightning address format');
          }

          zapEndpoint = `https://${domain}/.well-known/lnurlp/${username}`;
        }
      } catch (error) {
        console.warn('Failed to get zap endpoint:', error);
        toast({
          title: 'Zap endpoint not found',
          description: 'Could not find a zap endpoint for the author.',
          variant: 'destructive',
        });
        setIsZapping(false);
        return;
      }

      if (!zapEndpoint) {
        toast({
          title: 'Zap endpoint not found',
          description: 'Could not find a zap endpoint for the author.',
          variant: 'destructive',
        });
        setIsZapping(false);
        return;
      }

      const zapAmount = amount * 1000; // convert to millisats

      // Create zap request manually according to NIP-57
      let zapRequest;
      try {
        const zapRequestParams = {
          pubkey: actualTarget.pubkey,
          amount: zapAmount,
          relays: [config.relayUrl],
          event: actualTarget.id,
          content: _comment || 'Zapped!🎙️'
        };

        console.log('Creating zap request with params:', zapRequestParams);

        // Try to create with nip57 first
        try {
          zapRequest = nip57.makeZapRequest(zapRequestParams);
          console.log('Zap request created successfully with nip57:', zapRequest);
        } catch (nip57Error) {
          console.warn('nip57.makeZapRequest failed, trying manual creation:', nip57Error);

          // Manual creation according to NIP-57
          const tags = [
            ['p', actualTarget.pubkey],
            ['amount', zapAmount.toString()],
            ['relays', config.relayUrl],
            ['e', actualTarget.id]
          ];

          // Add comment if provided
          if (_comment && _comment.trim()) {
            tags.push(['comment', _comment.trim()]);
          }

          zapRequest = {
            kind: 9734,
            created_at: Math.floor(Date.now() / 1000),
            content: _comment || 'Zapped!🎙️',
            tags: tags
          };

          console.log('Manually created zap request:', zapRequest);
        }
      } catch (error) {
        console.error('Failed to create zap request:', error);
        console.error('Error details:', {
          targetPubkey: actualTarget.pubkey,
          targetId: actualTarget.id,
          amount: zapAmount,
          relays: [config.relayUrl]
        });
        throw new Error(`Failed to create zap request: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Sign the zap request (but don't publish to relays - only send to LNURL endpoint)
      if (!user.signer) {
        throw new Error('No signer available');
      }

      let signedZapRequest;
      try {
        signedZapRequest = await user.signer.signEvent(zapRequest);
      } catch (error) {
        console.error('Failed to sign zap request:', error);
        throw new Error('Failed to sign zap request');
      }

      try {
        const res = await fetch(`${zapEndpoint}?amount=${zapAmount}&nostr=${encodeURI(JSON.stringify(signedZapRequest))}`);
            const responseData = await res.json();

            if (!res.ok) {
              throw new Error(`HTTP ${res.status}: ${responseData.reason || 'Unknown error'}`);
            }

            const newInvoice = responseData.pr;
            if (!newInvoice || typeof newInvoice !== 'string') {
              throw new Error('Lightning service did not return a valid invoice');
            }

            // Get the current active NWC connection dynamically
            const currentNWCConnection = getActiveConnection();

            // Try NWC first if available and properly connected
            if (currentNWCConnection && currentNWCConnection.connectionString && currentNWCConnection.isConnected) {
              try {
                await sendPayment(currentNWCConnection, newInvoice);

                // Clear states immediately on success
                setIsZapping(false);
                setInvoice(null);

                toast({
                  title: 'Zap successful!',
                  description: `You sent ${amount} sats via NWC to the author.`,
                });

                // Invalidate zap queries to refresh counts
                queryClient.invalidateQueries({ queryKey: ['zaps'] });

                // Close dialog last to ensure clean state
                onZapSuccess?.(amount);
                return;
              } catch (nwcError) {
                console.error('NWC payment failed, falling back:', nwcError);

                // Show specific NWC error to user for debugging
                const errorMessage = nwcError instanceof Error ? nwcError.message : 'Unknown NWC error';
                toast({
                  title: 'NWC payment failed',
                  description: `${errorMessage}. Falling back to other payment methods...`,
                  variant: 'destructive',
                });
              }
            }

            if (webln) {  // Try WebLN next
              try {
                await webln.sendPayment(newInvoice);

                // Clear states immediately on success
                setIsZapping(false);
                setInvoice(null);

                toast({
                  title: 'Zap successful!',
                  description: `You sent ${amount} sats to the author.`,
                });

                // Invalidate zap queries to refresh counts
                queryClient.invalidateQueries({ queryKey: ['zaps'] });

                // Close dialog last to ensure clean state
                onZapSuccess?.(amount);
              } catch (weblnError) {
                console.error('webln payment failed, falling back:', weblnError);

                // Show specific WebLN error to user for debugging
                const errorMessage = weblnError instanceof Error ? weblnError.message : 'Unknown WebLN error';
                toast({
                  title: 'WebLN payment failed',
                  description: `${errorMessage}. Falling back to other payment methods...`,
                  variant: 'destructive',
                });

                setInvoice(newInvoice);
                setIsZapping(false);
              }
            } else { // Default - show QR code and manual Lightning URI
              setInvoice(newInvoice);
              setIsZapping(false);
            }
          } catch (err) {
            console.error('Zap error:', err);
            toast({
              title: 'Zap failed',
              description: (err as Error).message,
              variant: 'destructive',
            });
            setIsZapping(false);
          }
    } catch (err) {
      console.error('Zap error:', err);
      toast({
        title: 'Zap failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
      setIsZapping(false);
    }
  };

  const resetInvoice = useCallback(() => {
    setInvoice(null);
  }, []);

  return {
    zaps,
    zapCount,
    totalSats,
    ...query,
    zap,
    isZapping,
    invoice,
    setInvoice,
    resetInvoice,
  };
}
