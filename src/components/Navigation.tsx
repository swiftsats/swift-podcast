import { Link, useLocation } from 'react-router-dom';
import { Headphones, List, Users, MessageSquare, User, Rss, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoginArea } from '@/components/auth/LoginArea';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePodcastConfig } from '@/hooks/usePodcastConfig';
import { isPodcastCreator } from '@/lib/podcastConfig';
import { cn } from '@/lib/utils';

interface NavigationProps {
  className?: string;
}

export function Navigation({ className }: NavigationProps) {
  const location = useLocation();
  const { user } = useCurrentUser();
  const podcastConfig = usePodcastConfig();
  const isCreator = user && isPodcastCreator(user.pubkey);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const navItems = [
    {
      path: '/',
      icon: Headphones,
      label: 'Home',
      description: 'Overview & latest episode'
    },
    {
      path: '/episodes',
      icon: List,
      label: 'Episodes',
      description: 'Browse all episodes'
    },
    {
      path: '/community',
      icon: Users,
      label: 'Community',
      description: 'Engage with listeners'
    },
    {
      path: '/social',
      icon: MessageSquare,
      label: 'Social Feed',
      description: 'Creator updates'
    }
  ];

  const secondaryItems = [
    {
      path: '/about',
      icon: User,
      label: 'About',
      description: 'Podcast info'
    },
    {
      path: '/rss.xml',
      icon: Rss,
      label: 'RSS Feed',
      description: 'Subscribe',
      external: true
    }
  ];

  return (
    <header className={cn(
      "border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm",
      className
    )}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity group">
            <div className="relative">
              <Headphones className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-200" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-secondary rounded-full animate-pulse-slow"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">{podcastConfig.podcast.title}</h1>
              <p className="text-xs text-muted-foreground">
                Powered by Nostr
              </p>
            </div>
          </Link>

          {/* Main Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Button
                  key={item.path}
                  variant={active ? "secondary" : "ghost"}
                  size="sm"
                  asChild
                  className={cn(
                    "relative focus-ring transition-all duration-200",
                    active && "bg-secondary text-secondary-foreground shadow-sm"
                  )}
                >
                  <Link to={item.path} className="flex items-center space-x-2">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                </Button>
              );
            })}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-2">
            {/* Theme toggle */}
            <ThemeToggle />

            {/* Secondary nav items */}
            <div className="hidden sm:flex items-center space-x-1">
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                const active = !item.external && isActive(item.path);

                return (
                  <Button
                    key={item.path}
                    variant={active ? "secondary" : "ghost"}
                    size="sm"
                    asChild
                    className="focus-ring"
                  >
                    {item.external ? (
                      <a
                        href={item.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2"
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden lg:inline">{item.label}</span>
                      </a>
                    ) : (
                      <Link to={item.path} className="flex items-center space-x-2">
                        <Icon className="w-4 h-4" />
                        <span className="hidden lg:inline">{item.label}</span>
                      </Link>
                    )}
                  </Button>
                );
              })}
            </div>

            {/* Creator studio button */}
            {isCreator && (
              <Button size="sm" asChild className="btn-secondary focus-ring">
                <Link to="/studio">
                  <Settings className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Studio</span>
                </Link>
              </Button>
            )}

            {/* Login area */}
            <LoginArea className="max-w-60" />
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden mt-4 flex flex-wrap gap-2">
          {[...navItems, ...secondaryItems.filter(item => !item.external)].map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Button
                key={item.path}
                variant={active ? "secondary" : "outline"}
                size="sm"
                asChild
                className={cn(
                  "flex-1 min-w-0 focus-ring transition-all duration-200",
                  active && "shadow-sm"
                )}
              >
                <Link to={item.path} className="flex items-center justify-center space-x-1">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs truncate">{item.label}</span>
                </Link>
              </Button>
            );
          })}

          {/* RSS link for mobile */}
          <Button variant="outline" size="sm" asChild className="flex-1 min-w-0 focus-ring">
            <a href="/rss.xml" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center space-x-1">
              <Rss className="w-4 h-4" />
              <span className="text-xs">RSS</span>
            </a>
          </Button>
        </nav>
      </div>
    </header>
  );
}